use crate::core::filters::{matches_date, matches_entry_kind, matches_size};
use crate::core::metadata_service::MetadataService;
use crate::core::models::{MatchMode, SearchRequest, SearchResultItem, SortMode};
use crate::core::query_matcher::{build_query_matcher, QueryMatcher};
use crate::core::ranking::sort_results;
use crate::storage::index_store::IndexSnapshot;
use rust_search::SearchBuilder;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;

const INDEX_BATCH_SIZE: usize = 100;
const MAX_INDEX_ENTRIES: usize = 1_000_000;
const MAX_INDEX_SIZE_MB: usize = 500;
const ENTRY_OVERHEAD_BYTES: usize = 512;

fn estimate_entry_size(entry: &SearchResultItem) -> usize {
    entry.full_path.len()
        + entry.name.len()
        + entry.extension.as_ref().map_or(0, |e| e.len())
        + entry.created_at.as_ref().map_or(0, |c| c.len())
        + entry.modified_at.as_ref().map_or(0, |m| m.len())
        + ENTRY_OVERHEAD_BYTES
}

#[derive(Debug, Clone, Default)]
pub struct IndexBuildSummary {
    pub roots: usize,
    pub entries: usize,
    pub memory_bytes: usize,
    pub truncated: bool,
}

#[derive(Debug, Clone, Default)]
pub struct IndexSearchSummary {
    pub total_results: usize,
    pub limit_reached: bool,
    pub cancelled: bool,
    pub worker_panicked: bool,
}

pub struct IndexService;

impl IndexService {
    pub fn rebuild(
        roots: &[String],
        cancel_flag: Arc<AtomicBool>,
        progress_counter: Option<Arc<AtomicUsize>>,
    ) -> Result<(IndexSnapshot, IndexBuildSummary), String> {
        let normalized_roots: Vec<String> = roots
            .iter()
            .map(|root| root.trim().to_string())
            .filter(|root| !root.is_empty())
            .collect();

        let roots = if normalized_roots.is_empty() {
            vec![".".to_string()]
        } else {
            normalized_roots
        };

        let max_bytes = MAX_INDEX_SIZE_MB * 1024 * 1024;
        let mut entries = Vec::new();
        let mut total_size = 0usize;
        let mut truncated = false;

        if let Some(ref counter) = progress_counter {
            counter.store(0, Ordering::Release);
        }

        for root in &roots {
            if truncated || cancel_flag.load(Ordering::Acquire) {
                break;
            }

            let builder = SearchBuilder::default().location(root).hidden();
            for path in builder.build() {
                if cancel_flag.load(Ordering::Acquire) {
                    break;
                }

                if entries.len() >= MAX_INDEX_ENTRIES {
                    truncated = true;
                    eprintln!(
                        "Index rebuild truncated at {} entries (max {})",
                        entries.len(),
                        MAX_INDEX_ENTRIES
                    );
                    break;
                }

                let entry = MetadataService::enrich_path(&path, root.clone());
                let entry_size = estimate_entry_size(&entry);

                if total_size.saturating_add(entry_size) > max_bytes {
                    truncated = true;
                    eprintln!(
                        "Index rebuild truncated at {} MB (max {} MB)",
                        total_size / (1024 * 1024),
                        MAX_INDEX_SIZE_MB
                    );
                    break;
                }

                total_size = total_size.saturating_add(entry_size);
                entries.push(entry);

                if let Some(ref counter) = progress_counter {
                    counter.store(entries.len(), Ordering::Release);
                }
            }
        }

        let summary = IndexBuildSummary {
            roots: roots.len(),
            entries: entries.len(),
            memory_bytes: total_size,
            truncated,
        };

        Ok((IndexSnapshot::fresh(roots, entries), summary))
    }

    pub fn stream<F, G>(
        snapshot: &Arc<IndexSnapshot>,
        request: &SearchRequest,
        cancel_flag: Arc<AtomicBool>,
        mut on_batch: F,
        mut on_limit: G,
    ) -> Result<IndexSearchSummary, String>
    where
        F: FnMut(Vec<SearchResultItem>),
        G: FnMut(bool),
    {
        if request.options.limit == Some(0) {
            on_limit(true);
            return Ok(IndexSearchSummary {
                total_results: 0,
                limit_reached: true,
                cancelled: false,
                worker_panicked: false,
            });
        }

        let matcher = build_query_matcher(
            &request.options.match_mode,
            request.query.trim(),
            request.options.ignore_case,
        )?;
        let extensions = parse_extensions(&request.extensions);
        let mut limit_reached = false;
        let mut total_results = 0usize;
        let mut batch = Vec::with_capacity(INDEX_BATCH_SIZE);

        for item in &snapshot.entries {
            if cancel_flag.load(Ordering::Acquire) {
                on_limit(limit_reached);
                return Ok(IndexSearchSummary {
                    total_results,
                    limit_reached,
                    cancelled: true,
                    worker_panicked: false,
                });
            }

            if !matches_roots(item, &request.roots) {
                continue;
            }
            if !request.options.include_hidden && item.hidden {
                continue;
            }
            if !extensions.is_empty() && !matches_extensions(item, &extensions) {
                continue;
            }
            if !matches_entry_kind(item, &request.options.entry_kind) {
                continue;
            }
            if !matches_size(item, &request.options.size_filter) {
                continue;
            }
            if !matches_date(&item.created_at, &request.options.created_filter) {
                continue;
            }
            if !matches_date(&item.modified_at, &request.options.modified_filter) {
                continue;
            }

            let name_matches = matcher.matches(&item.name);
            let path_matches = name_matches || matcher.matches(&item.full_path);
            if !path_matches {
                continue;
            }

            let mut next = item.clone();
            if matches!(request.options.sort_mode, SortMode::Relevance) {
                next.score = score_relevance(&next.name, request.query.trim());
            }

            batch.push(next);
            total_results = total_results.saturating_add(1);

            if batch.len() >= INDEX_BATCH_SIZE {
                sort_results(&mut batch, &request.options.sort_mode);
                on_batch(std::mem::take(&mut batch));
            }

            if let Some(limit) = request.options.limit {
                if total_results >= limit {
                    limit_reached = true;
                    break;
                }
            }
        }

        if !batch.is_empty() {
            sort_results(&mut batch, &request.options.sort_mode);
            on_batch(batch);
        }

        on_limit(limit_reached);
        Ok(IndexSearchSummary {
            total_results,
            limit_reached,
            cancelled: false,
            worker_panicked: false,
        })
    }
}

fn parse_extensions(raw: &[String]) -> Vec<String> {
    raw.iter()
        .map(|ext| ext.trim().trim_start_matches('.').to_lowercase())
        .filter(|ext| !ext.is_empty())
        .collect()
}

fn matches_roots(item: &SearchResultItem, roots: &[String]) -> bool {
    if roots.is_empty() {
        return true;
    }
    let full = Path::new(&item.full_path);
    roots.iter().any(|root| full.starts_with(root))
}

fn matches_extensions(item: &SearchResultItem, extensions: &[String]) -> bool {
    let ext = item
        .extension
        .as_ref()
        .map(|value| {
            let trimmed = value.trim().trim_start_matches('.');
            trimmed.to_ascii_lowercase()
        })
        .unwrap_or_default();
    extensions.iter().any(|value| value == &ext)
}

fn score_relevance(name: &str, query: &str) -> Option<f64> {
    if query.is_empty() {
        return None;
    }
    let lower_name = name.to_lowercase();
    let lower_query = query.to_lowercase();
    if lower_name == lower_query {
        Some(1.0)
    } else if lower_name.starts_with(&lower_query) {
        Some(0.85)
    } else if lower_name.contains(&lower_query) {
        Some(0.6)
    } else {
        Some(0.2)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn estimate_entry_size_includes_all_components() {
        let item = SearchResultItem {
            full_path: "/path/to/file.txt".to_string(),
            name: "file.txt".to_string(),
            parent_path: "/path/to".to_string(),
            is_file: true,
            is_dir: false,
            extension: Some("txt".to_string()),
            size: Some(100),
            created_at: Some("2026-01-01T00:00:00Z".to_string()),
            modified_at: Some("2026-01-01T00:00:00Z".to_string()),
            hidden: false,
            score: None,
            source_root: "/".to_string(),
        };

        let size = estimate_entry_size(&item);
        assert!(size > 0);
        assert!(size >= item.full_path.len() + item.name.len());
    }

    #[test]
    fn build_query_matcher_plain_mode_creates_plain_matcher() {
        let matcher = build_query_matcher(&MatchMode::Plain, "test", true).unwrap();
        assert!(matcher.matches("this is a test string"));
        assert!(matcher.matches("TEST"));
    }

    #[test]
    fn build_query_matcher_empty_query_matches_all() {
        let matcher = build_query_matcher(&MatchMode::Plain, "", true).unwrap();
        assert!(matcher.matches("anything"));
        assert!(matcher.matches(""));
    }

    #[test]
    fn parse_extensions_normalizes_extensions() {
        let exts = parse_extensions(&[".TXT".to_string(), "pdf".to_string(), "..doc".to_string()]);
        assert_eq!(exts, vec!["txt", "pdf", "doc"]);
    }

    #[test]
    fn matches_roots_returns_true_for_matching_root() {
        let item = SearchResultItem {
            full_path: "/home/user/file.txt".to_string(),
            name: "file.txt".to_string(),
            parent_path: "/home/user".to_string(),
            is_file: true,
            is_dir: false,
            extension: Some("txt".to_string()),
            size: None,
            created_at: None,
            modified_at: None,
            hidden: false,
            score: None,
            source_root: "/".to_string(),
        };

        assert!(matches_roots(&item, &["/home/user".to_string()]));
        assert!(matches_roots(&item, &["/home".to_string()]));
        assert!(!matches_roots(&item, &["/etc".to_string()]));
        assert!(matches_roots(&item, &[]));
    }

    #[test]
    fn matches_extensions_checks_extension_case_insensitively() {
        let item = SearchResultItem {
            full_path: "/file.TXT".to_string(),
            name: "file.TXT".to_string(),
            parent_path: "/".to_string(),
            is_file: true,
            is_dir: false,
            extension: Some("TXT".to_string()),
            size: None,
            created_at: None,
            modified_at: None,
            hidden: false,
            score: None,
            source_root: "/".to_string(),
        };

        assert!(matches_extensions(&item, &["txt".to_string()]));
        assert!(matches_extensions(
            &item,
            &["pdf".to_string(), "txt".to_string()]
        ));
        assert!(!matches_extensions(&item, &["pdf".to_string()]));
    }

    #[test]
    fn score_relevance_returns_correct_scores() {
        assert_eq!(score_relevance("file.txt", "file.txt"), Some(1.0));
        assert_eq!(score_relevance("FILE.TXT", "file"), Some(0.85));
        assert_eq!(score_relevance("myfile.txt", "file"), Some(0.6));
        assert_eq!(score_relevance("other.txt", "file"), Some(0.2));
        assert_eq!(score_relevance("anything", ""), None);
    }
}
