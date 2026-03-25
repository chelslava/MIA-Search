use crate::core::metadata_service::MetadataService;
use crate::core::models::{
  CommandStatus, DateComparison, EntryKind, MatchMode, SearchRequest, SearchResultItem, SearchSessionSnapshot,
  SortMode, SizeComparison,
};
use crate::core::ranking::sort_results;
use chrono::{DateTime, Utc};
use regex::Regex;
use rust_search::{similarity_sort, FileSize, FilterExt, SearchBuilder};
use std::collections::HashSet;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::SystemTime;

impl PartialEq for crate::core::models::SearchOptions {
  fn eq(&self, other: &Self) -> bool {
    self.max_depth == other.max_depth
      && self.limit == other.limit
      && self.strict == other.strict
      && self.ignore_case == other.ignore_case
      && self.include_hidden == other.include_hidden
      && self.entry_kind == other.entry_kind
      && self.match_mode == other.match_mode
      && self.sort_mode == other.sort_mode
      && option_size_filter_eq(&self.size_filter, &other.size_filter)
      && option_date_filter_eq(&self.created_filter, &other.created_filter)
      && option_date_filter_eq(&self.modified_filter, &other.modified_filter)
  }
}

fn option_size_filter_eq(
  left: &Option<crate::core::models::SizeFilter>,
  right: &Option<crate::core::models::SizeFilter>,
) -> bool {
  match (left, right) {
    (None, None) => true,
    (Some(left), Some(right)) => left.bytes == right.bytes && left.comparison == right.comparison,
    _ => false,
  }
}

fn option_date_filter_eq(
  left: &Option<crate::core::models::DateFilter>,
  right: &Option<crate::core::models::DateFilter>,
) -> bool {
  match (left, right) {
    (None, None) => true,
    (Some(left), Some(right)) => {
      left.field == right.field && left.comparison == right.comparison && left.value == right.value
    }
    _ => false,
  }
}

const BATCH_SIZE: usize = 100;

#[derive(Debug, Clone, Default)]
pub struct SearchExecution {
  pub items: Vec<SearchResultItem>,
  pub limit_reached: bool,
}

#[derive(Debug, Clone)]
pub struct SearchStart {
  pub search_id: u64,
  pub cancel_flag: Arc<AtomicBool>,
}

#[derive(Debug, Clone, Default)]
pub struct SearchStreamSummary {
  pub total_results: usize,
  pub limit_reached: bool,
  pub cancelled: bool,
}

#[derive(Debug, Default)]
pub struct SearchSession {
  next_search_id: u64,
  active_search_id: Option<u64>,
  active_cancel_flag: Option<Arc<AtomicBool>>,
  last_request: Option<SearchRequest>,
}

impl SearchSession {
  pub fn start(&mut self, request: SearchRequest) -> SearchStart {
    self.next_search_id = self.next_search_id.saturating_add(1);
    self.active_search_id = Some(self.next_search_id);
    self.last_request = Some(request);

    if let Some(flag) = &self.active_cancel_flag {
      flag.store(true, Ordering::Relaxed);
    }
    let cancel_flag = Arc::new(AtomicBool::new(false));
    self.active_cancel_flag = Some(cancel_flag.clone());

    SearchStart {
      search_id: self.next_search_id,
      cancel_flag,
    }
  }

  pub fn cancel(&mut self) -> Option<u64> {
    if let Some(flag) = &self.active_cancel_flag {
      flag.store(true, Ordering::Relaxed);
    }
    self.active_cancel_flag = None;
    self.active_search_id.take()
  }

  pub fn complete_if_active(&mut self, search_id: u64) {
    if self.active_search_id == Some(search_id) {
      self.active_search_id = None;
      self.active_cancel_flag = None;
    }
  }

  pub fn snapshot(&self) -> SearchSessionSnapshot {
    SearchSessionSnapshot {
      active_search_id: self.active_search_id,
      last_request: self.last_request.clone(),
      status: if self.active_search_id.is_some() {
        CommandStatus::Accepted
      } else {
        CommandStatus::Idle
      },
    }
  }
}

#[derive(Debug, Clone, Default)]
pub struct SearchService;

enum QueryMatcher {
  MatchAll,
  Plain {
    query: String,
    ignore_case: bool,
  },
  Regex {
    regex: Regex,
  },
}

impl QueryMatcher {
  fn matches(&self, path: &str) -> bool {
    match self {
      Self::MatchAll => true,
      Self::Plain { query, ignore_case } => {
        let name = Path::new(path)
          .file_name()
          .and_then(|value| value.to_str())
          .unwrap_or(path);
        if *ignore_case {
          let lower_query = query.to_lowercase();
          name.to_lowercase().contains(&lower_query) || path.to_lowercase().contains(&lower_query)
        } else {
          name.contains(query) || path.contains(query)
        }
      }
      Self::Regex { regex } => regex.is_match(path),
    }
  }
}

impl SearchService {
  pub fn execute(request: &SearchRequest) -> SearchExecution {
    let mut all_items = Vec::new();
    let mut limit_reached = false;
    let _ = Self::stream(
      request,
      Arc::new(AtomicBool::new(false)),
      |batch| {
        all_items.extend(batch);
      },
      |reached| {
        limit_reached = reached;
      },
    );

    SearchExecution {
      items: all_items,
      limit_reached,
    }
  }

  pub fn stream<F, G>(
    request: &SearchRequest,
    cancel_flag: Arc<AtomicBool>,
    mut on_batch: F,
    mut on_limit: G,
  ) -> Result<SearchStreamSummary, String>
  where
    F: FnMut(Vec<SearchResultItem>),
    G: FnMut(bool),
  {
    let root = request
      .roots
      .first()
      .cloned()
      .unwrap_or_else(|| ".".to_string());
    let query = request.query.trim().to_string();
    let matcher = build_query_matcher(&request.options.match_mode, &query, request.options.ignore_case)?;
    let mut limit_reached = false;
    let mut total_results = 0usize;
    let mut seen_paths = HashSet::new();
    let mut all_items = Vec::new();

    let extensions: Vec<String> = request
      .extensions
      .iter()
      .map(|ext| ext.trim().trim_start_matches('.').to_string())
      .filter(|ext| !ext.is_empty())
      .collect();

    let search_batches: Vec<Vec<String>> = if extensions.is_empty() {
      vec![collect_paths(build_builder(request, &root, None), &query)]
    } else {
      extensions
        .iter()
        .map(|ext| collect_paths(build_builder(request, &root, Some(ext.as_str())), &query))
        .collect()
    };

    for paths in search_batches {
      for path in paths {
        if cancel_flag.load(Ordering::Relaxed) {
          on_limit(limit_reached);
          return Ok(SearchStreamSummary {
            total_results,
            limit_reached,
            cancelled: true,
          });
        }

        if !matcher.matches(&path) {
          continue;
        }

        if !seen_paths.insert(path.clone()) {
          continue;
        }

        let source_root = resolve_source_root(&request.roots, &path).unwrap_or_else(|| root.clone());
        all_items.push(MetadataService::enrich_path(&path, source_root));
        total_results = total_results.saturating_add(1);

        if let Some(limit) = request.options.limit {
          if total_results >= limit {
            limit_reached = true;
            break;
          }
        }
      }
      if limit_reached {
        break;
      }
    }

    apply_sorting(&mut all_items, &request.options.sort_mode, &query);

    let mut batch = Vec::with_capacity(BATCH_SIZE);
    for item in all_items {
      if cancel_flag.load(Ordering::Relaxed) {
        on_limit(limit_reached);
        return Ok(SearchStreamSummary {
          total_results,
          limit_reached,
          cancelled: true,
        });
      }
      batch.push(item);
      if batch.len() >= BATCH_SIZE {
        on_batch(std::mem::take(&mut batch));
      }
    }

    if !batch.is_empty() {
      on_batch(batch);
    }

    on_limit(limit_reached);

    Ok(SearchStreamSummary {
      total_results,
      limit_reached,
      cancelled: false,
    })
  }
}

fn collect_paths(builder: SearchBuilder, query: &str) -> Vec<String> {
  let mut paths: Vec<String> = builder.build().collect();
  if query.is_empty() {
    paths.sort();
  } else {
    similarity_sort(&mut paths, query);
  }
  paths
}

fn build_query_matcher(mode: &MatchMode, query: &str, ignore_case: bool) -> Result<QueryMatcher, String> {
  if query.is_empty() {
    return Ok(QueryMatcher::MatchAll);
  }

  match mode {
    MatchMode::Plain => Ok(QueryMatcher::Plain {
      query: query.to_string(),
      ignore_case,
    }),
    MatchMode::Regex => {
      let pattern = if ignore_case {
        format!("(?i){query}")
      } else {
        query.to_string()
      };
      let regex = Regex::new(&pattern).map_err(|error| format!("regex parse error: {error}"))?;
      Ok(QueryMatcher::Regex { regex })
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
      let regex = Regex::new(&pattern).map_err(|error| format!("wildcard parse error: {error}"))?;
      Ok(QueryMatcher::Regex { regex })
    }
  }
}

fn apply_sorting(items: &mut [SearchResultItem], mode: &SortMode, query: &str) {
  match mode {
    SortMode::Relevance => {
      if query.is_empty() {
        items.sort_by(|left, right| left.name.cmp(&right.name));
      } else {
        for item in items.iter_mut() {
          item.score = score_relevance(&item.name, query);
        }
        sort_results(items, mode);
      }
    }
    _ => sort_results(items, mode),
  }
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

fn build_builder(request: &SearchRequest, default_root: &str, ext_override: Option<&str>) -> SearchBuilder {
  let mut builder = SearchBuilder::default().location(default_root);

  if request.roots.len() > 1 {
    let more_locations: Vec<String> = request.roots.iter().skip(1).cloned().collect();
    if !more_locations.is_empty() {
      builder = builder.more_locations(more_locations);
    }
  }

  let query = request.query.trim();
  if !query.is_empty() && request.options.match_mode == MatchMode::Plain {
    builder = builder.search_input(query);
  }

  if let Some(ext) = ext_override.filter(|value| !value.trim().is_empty()) {
    builder = builder.ext(ext.trim());
  } else if let Some(ext) = request.extensions.first().filter(|value| !value.trim().is_empty()) {
    builder = builder.ext(ext.trim());
  }

  if let Some(depth) = request.options.max_depth {
    builder = builder.depth(depth);
  }
  if request.options.match_mode == MatchMode::Plain {
    if let Some(limit) = request.options.limit {
      builder = builder.limit(limit);
    }
  }
  if request.options.strict {
    builder = builder.strict();
  }
  if request.options.ignore_case {
    builder = builder.ignore_case();
  }
  if request.options.include_hidden {
    builder = builder.hidden();
  }

  if let Some(size_filter) = &request.options.size_filter {
    builder = match size_filter.comparison {
      SizeComparison::Smaller => builder.file_size_smaller(FileSize::Byte(size_filter.bytes)),
      SizeComparison::Equal => builder.file_size_equal(FileSize::Byte(size_filter.bytes)),
      SizeComparison::Greater => builder.file_size_greater(FileSize::Byte(size_filter.bytes)),
    };
  }

  if let Some(created_filter) = &request.options.created_filter {
    if let Some(stamp) = parse_rfc3339_system_time(&created_filter.value) {
      builder = match created_filter.comparison {
        DateComparison::Before => builder.created_before(stamp),
        DateComparison::After => builder.created_after(stamp),
      };
    }
  }

  if let Some(modified_filter) = &request.options.modified_filter {
    if let Some(stamp) = parse_rfc3339_system_time(&modified_filter.value) {
      builder = match modified_filter.comparison {
        DateComparison::Before => builder.modified_before(stamp),
        DateComparison::After => builder.modified_after(stamp),
      };
    }
  }

  match request.options.entry_kind {
    EntryKind::Any => builder,
    EntryKind::File => builder.custom_filter(filter_files),
    EntryKind::Directory => builder.custom_filter(filter_dirs),
  }
}

fn filter_files(entry: &rust_search::DirEntry) -> bool {
  entry.metadata().map(|metadata| metadata.is_file()).unwrap_or(false)
}

fn filter_dirs(entry: &rust_search::DirEntry) -> bool {
  entry.metadata().map(|metadata| metadata.is_dir()).unwrap_or(false)
}

fn parse_rfc3339_system_time(value: &str) -> Option<SystemTime> {
  let dt = DateTime::parse_from_rfc3339(value).ok()?;
  let dt_utc: DateTime<Utc> = dt.with_timezone(&Utc);
  Some(dt_utc.into())
}

fn resolve_source_root(roots: &[String], path: &str) -> Option<String> {
  let path = Path::new(path);
  roots
    .iter()
    .find(|root| path.starts_with(root.as_str()))
    .cloned()
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::collections::HashSet;
  use std::fs;
  use std::path::Path;
  use std::sync::atomic::AtomicBool;
  use std::sync::Arc;
  use tempfile::tempdir;

  fn write_file(path: &Path, contents: &str) {
    if let Some(parent) = path.parent() {
      fs::create_dir_all(parent).expect("failed to create parent directories");
    }
    fs::write(path, contents).expect("failed to write test file");
  }

  fn request_for_roots(roots: Vec<String>) -> SearchRequest {
    let mut request = SearchRequest::default();
    request.roots = roots;
    request.options.max_depth = Some(1);
    request.options.limit = Some(100);
    request
  }

  #[test]
  fn multi_root_search_returns_items_from_both_roots() {
    let root_a = tempdir().expect("root_a");
    let root_b = tempdir().expect("root_b");

    write_file(&root_a.path().join("alpha.txt"), "alpha");
    write_file(&root_b.path().join("beta.txt"), "beta");

    let root_a_path = root_a.path().to_string_lossy().to_string();
    let root_b_path = root_b.path().to_string_lossy().to_string();
    let mut request = request_for_roots(vec![root_a_path.clone(), root_b_path.clone()]);
    request.options.sort_mode = SortMode::Name;

    let execution = SearchService::execute(&request);
    let file_roots: HashSet<String> = execution
      .items
      .iter()
      .filter(|item| item.is_file)
      .map(|item| item.source_root.clone())
      .collect();

    assert!(file_roots.contains(&root_a_path));
    assert!(file_roots.contains(&root_b_path));
    assert!(execution.items.iter().any(|item| item.name == "alpha.txt"));
    assert!(execution.items.iter().any(|item| item.name == "beta.txt"));
  }

  #[test]
  fn multi_extension_dedupe_behavior_basic_sanity() {
    let root = tempdir().expect("root");
    write_file(&root.path().join("duplicate.rs"), "fn main() {}");

    let mut request = request_for_roots(vec![root.path().to_string_lossy().to_string()]);
    request.extensions = vec!["rs".to_string(), "rs".to_string()];
    request.options.sort_mode = SortMode::Name;

    let execution = SearchService::execute(&request);
    let paths: HashSet<String> = execution.items.iter().map(|item| item.full_path.clone()).collect();

    assert_eq!(execution.items.len(), 1);
    assert_eq!(paths.len(), 1);
    assert_eq!(execution.items[0].name, "duplicate.rs");
  }

  #[test]
  fn limit_respected_and_limit_reached_true() {
    let root = tempdir().expect("root");
    write_file(&root.path().join("a.txt"), "a");
    write_file(&root.path().join("b.txt"), "b");
    write_file(&root.path().join("c.txt"), "c");

    let mut request = request_for_roots(vec![root.path().to_string_lossy().to_string()]);
    request.options.limit = Some(2);
    request.options.sort_mode = SortMode::Name;

    let execution = SearchService::execute(&request);

    assert_eq!(execution.items.len(), 2);
    assert!(execution.limit_reached);
  }

  #[test]
  fn depth_restriction_basic_case() {
    let root = tempdir().expect("root");
    write_file(&root.path().join("top.txt"), "top");
    write_file(&root.path().join("nested/deep.txt"), "deep");

    let mut request = request_for_roots(vec![root.path().to_string_lossy().to_string()]);
    request.options.max_depth = Some(1);
    request.options.sort_mode = SortMode::Name;

    let execution = SearchService::execute(&request);
    let names: HashSet<String> = execution.items.iter().map(|item| item.name.clone()).collect();

    assert!(names.contains("top.txt"));
    assert!(!execution.items.iter().any(|item| item.full_path.ends_with("nested/deep.txt")));
  }

  #[test]
  fn query_matcher_plain_respects_case_flag() {
    let case_sensitive =
      build_query_matcher(&MatchMode::Plain, "Report", false).expect("plain matcher should compile");
    let ignore_case =
      build_query_matcher(&MatchMode::Plain, "report", true).expect("plain matcher should compile");

    assert!(case_sensitive.matches("C:/Work/Report.txt"));
    assert!(!case_sensitive.matches("C:/Work/report.txt"));
    assert!(ignore_case.matches("C:/Work/REPORT.txt"));
  }

  #[test]
  fn query_matcher_wildcard_handles_xls_pattern() {
    let matcher =
      build_query_matcher(&MatchMode::Wildcard, "*.xls*", true).expect("wildcard matcher should compile");
    assert!(matcher.matches("D:/Docs/annual.XLSX"));
    assert!(!matcher.matches("D:/Docs/annual.txt"));
  }

  #[test]
  fn query_matcher_regex_invalid_pattern_returns_error() {
    let result = build_query_matcher(&MatchMode::Regex, "[", false);
    assert!(result.is_err());
  }

  #[test]
  fn stream_returns_error_for_invalid_regex_query() {
    let mut request = SearchRequest::default();
    request.query = "[".to_string();
    request.roots = vec![".".to_string()];
    request.options.match_mode = MatchMode::Regex;

    let result = SearchService::stream(
      &request,
      Arc::new(AtomicBool::new(false)),
      |_batch| {},
      |_limit| {},
    );
    assert!(result.is_err());
  }

  #[test]
  fn stream_wildcard_finds_xls_when_regex_mode_not_used() {
    let root = tempdir().expect("root");
    write_file(&root.path().join("report.xlsm"), "xls");
    write_file(&root.path().join("notes.txt"), "txt");

    let mut request = request_for_roots(vec![root.path().to_string_lossy().to_string()]);
    request.query = "*.xls*".to_string();
    request.options.match_mode = MatchMode::Wildcard;
    request.options.sort_mode = SortMode::Name;
    request.options.limit = Some(100);

    let execution = SearchService::execute(&request);
    let names: Vec<String> = execution.items.iter().map(|item| item.name.clone()).collect();

    assert!(names.iter().any(|name| name == "report.xlsm"));
    assert!(!names.iter().any(|name| name == "notes.txt"));
  }

  #[test]
  fn search_session_lifecycle_updates_snapshot() {
    let mut session = SearchSession::default();
    let request = SearchRequest::default();

    let started = session.start(request.clone());
    let snapshot_active = session.snapshot();
    assert_eq!(snapshot_active.active_search_id, Some(started.search_id));
    assert!(matches!(snapshot_active.status, CommandStatus::Accepted));
    assert!(snapshot_active.last_request.is_some());

    let cancelled = session.cancel();
    assert_eq!(cancelled, Some(started.search_id));
    let snapshot_idle = session.snapshot();
    assert!(snapshot_idle.active_search_id.is_none());
    assert!(matches!(snapshot_idle.status, CommandStatus::Idle));
  }

  #[test]
  fn parse_rfc3339_system_time_handles_valid_and_invalid_values() {
    assert!(parse_rfc3339_system_time("2026-03-25T12:00:00Z").is_some());
    assert!(parse_rfc3339_system_time("not-a-date").is_none());
  }

  #[test]
  fn resolve_source_root_returns_matching_root() {
    let roots = vec!["C:/data".to_string(), "D:/logs".to_string()];
    let resolved = resolve_source_root(&roots, "D:/logs/archive/app.log");
    assert_eq!(resolved.as_deref(), Some("D:/logs"));
  }
}
