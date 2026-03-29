use crate::core::filters::{matches_date, matches_entry_kind, matches_size};
use crate::core::metadata_service::MetadataService;
use crate::core::models::{MatchMode, SearchRequest, SearchResultItem, SortMode};
use crate::core::ranking::sort_results;
use crate::storage::index_store::IndexSnapshot;
use regex::Regex;
use rust_search::SearchBuilder;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

const INDEX_BATCH_SIZE: usize = 100;

#[derive(Debug, Clone, Default)]
pub struct IndexBuildSummary {
  pub roots: usize,
  pub entries: usize,
}

#[derive(Debug, Clone, Default)]
pub struct IndexSearchSummary {
  pub total_results: usize,
  pub limit_reached: bool,
  pub cancelled: bool,
}

pub struct IndexService;

enum QueryMatcher {
  MatchAll,
  Plain {
    query: String,
    query_lower: Option<String>,
    ignore_case: bool,
  },
  Regex(Regex),
}

impl QueryMatcher {
  fn matches(&self, text: &str) -> bool {
    match self {
      Self::MatchAll => true,
      Self::Plain {
        query,
        query_lower,
        ignore_case,
      } => {
        if *ignore_case {
          let query_lower = query_lower.as_deref().unwrap_or(query);
          text.to_lowercase().contains(query_lower)
        } else {
          text.contains(query)
        }
      }
      Self::Regex(regex) => regex.is_match(text),
    }
  }
}

impl IndexService {
  pub fn rebuild(roots: &[String], cancel_flag: Arc<AtomicBool>) -> Result<(IndexSnapshot, IndexBuildSummary), String> {
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

    let mut entries = Vec::new();
    for root in &roots {
      if cancel_flag.load(Ordering::Acquire) {
        let summary = IndexBuildSummary {
          roots: roots.len(),
          entries: entries.len(),
        };
        return Ok((IndexSnapshot::fresh(roots, entries), summary));
      }

      let builder = SearchBuilder::default().location(root).hidden();
      for path in builder.build() {
        if cancel_flag.load(Ordering::Acquire) {
          let summary = IndexBuildSummary {
            roots: roots.len(),
            entries: entries.len(),
          };
          return Ok((IndexSnapshot::fresh(roots, entries), summary));
        }
        entries.push(MetadataService::enrich_path(&path, root.clone()));
      }
    }

    let summary = IndexBuildSummary {
      roots: roots.len(),
      entries: entries.len(),
    };

    Ok((IndexSnapshot::fresh(roots, entries), summary))
  }

  pub fn stream<F, G>(
    snapshot: &IndexSnapshot,
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
      });
    }

    let matcher = build_matcher(&request.options.match_mode, request.query.trim(), request.options.ignore_case)?;
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
    })
  }
}

fn build_matcher(mode: &MatchMode, query: &str, ignore_case: bool) -> Result<QueryMatcher, String> {
  if query.is_empty() {
    return Ok(QueryMatcher::MatchAll);
  }
  match mode {
    MatchMode::Plain => Ok(QueryMatcher::Plain {
      query: query.to_string(),
      query_lower: ignore_case.then(|| query.to_lowercase()),
      ignore_case,
    }),
    MatchMode::Regex => {
      let pattern = if ignore_case {
        format!("(?i){query}")
      } else {
        query.to_string()
      };
      Regex::new(&pattern)
        .map(QueryMatcher::Regex)
        .map_err(|error| format!("regex parse error: {error}"))
    }
    MatchMode::Wildcard => {
      let mut pattern = String::from("^");
      for ch in query.chars() {
        match ch {
          '*' => pattern.push_str(".*"),
          '?' => pattern.push('.'),
          _ => pattern.push_str(&regex::escape(&ch.to_string())),
        }
      }
      pattern.push('$');
      let pattern = if ignore_case {
        format!("(?i){pattern}")
      } else {
        pattern
      };
      Regex::new(&pattern)
        .map(QueryMatcher::Regex)
        .map_err(|error| format!("wildcard parse error: {error}"))
    }
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
