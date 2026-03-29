use crate::core::metadata_service::MetadataService;
use crate::core::models::{
  CommandStatus, DateComparison, EntryKind, MatchMode, SearchRequest, SearchResultItem, SearchSessionSnapshot,
  SortMode, SizeComparison,
};
use crate::core::ranking::sort_results;
use chrono::{DateTime, Utc};
use regex::Regex;
use rust_search::{FileSize, FilterExt, SearchBuilder};
use std::collections::{HashSet, VecDeque};
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
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
      && self.search_backend == other.search_backend
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
const FIRST_BATCH_SIZE: usize = 20;
const MAX_SCAN_WORKERS: usize = 12;

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
      flag.store(true, Ordering::Release);
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
      flag.store(true, Ordering::Release);
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

  pub fn is_active_search(&self, search_id: u64) -> bool {
    self.active_search_id == Some(search_id)
  }
}

#[derive(Debug, Clone, Default)]
pub struct SearchService;

enum QueryMatcher {
  MatchAll,
  Plain {
    query: String,
    query_lower: Option<String>,
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
      Self::Plain {
        query,
        query_lower,
        ignore_case,
      } => {
        let name = Path::new(path)
          .file_name()
          .and_then(|value| value.to_str())
          .unwrap_or(path);
        if *ignore_case {
          let query_lower = query_lower.as_deref().unwrap_or(query);
          name.to_ascii_lowercase().contains(query_lower) || path.to_ascii_lowercase().contains(query_lower)
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
    let roots = normalized_roots(request);
    let exclude_tokens = normalized_exclude_tokens(request);
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let roots_for_source = prepare_source_roots(&roots, &cwd);
    let default_root = roots.first().cloned().unwrap_or_else(|| ".".to_string());
    let query = request.query.trim().to_string();
    let matcher = build_query_matcher(&request.options.match_mode, &query, request.options.ignore_case)?;
    if request.options.limit == Some(0) {
      on_limit(true);
      return Ok(SearchStreamSummary {
        total_results: 0,
        limit_reached: true,
        cancelled: false,
      });
    }
    let mut limit_reached = false;
    let mut total_results = 0usize;
    let estimated_capacity = request.options.limit.unwrap_or(10000).min(100000);
    let mut seen_paths = HashSet::with_capacity(estimated_capacity);
    let mut batch = Vec::with_capacity(BATCH_SIZE);
    let mut current_batch_limit = FIRST_BATCH_SIZE;
    let tasks = build_scan_tasks(request, &roots);
    let worker_count = compute_worker_count(tasks.len());
    let request_ref = Arc::new(request.clone());
    let task_queue = Arc::new(Mutex::new(VecDeque::from(tasks)));
    let (tx, rx) = mpsc::channel::<String>();
    let mut workers = Vec::with_capacity(worker_count);

    for _ in 0..worker_count {
      let worker_tx = tx.clone();
      let worker_request = request_ref.clone();
      let worker_queue = task_queue.clone();
      let worker_cancel = cancel_flag.clone();
      workers.push(thread::spawn(move || {
        loop {
          if worker_cancel.load(Ordering::Acquire) {
            break;
          }

          let next_task = worker_queue
            .lock()
            .ok()
            .and_then(|mut queue| queue.pop_front());

          let Some((task_root, task_ext)) = next_task else {
            break;
          };

          let builder = build_builder(&worker_request, &task_root, task_ext.as_deref());
          for path in builder.build() {
            if worker_cancel.load(Ordering::Acquire) {
              break;
            }
            if worker_tx.send(path).is_err() {
              break;
            }
          }
        }
      }));
    }
    drop(tx);

    for path in rx {
      if cancel_flag.load(Ordering::Acquire) && !limit_reached {
        break;
      }

      if !matcher.matches(&path) {
        continue;
      }
      if path_matches_exclude_tokens(&path, &exclude_tokens) {
        continue;
      }

      let dedup_key = dedup_path_key(&path);
      if !seen_paths.insert(dedup_key) {
        continue;
      }

      if let Some(limit) = request.options.limit {
        if seen_paths.len() > limit.saturating_mul(10) {
          seen_paths.clear();
          seen_paths.reserve(limit.saturating_mul(2));
        }
      }

      let source_root = resolve_source_root(&roots_for_source, &path, &cwd).unwrap_or_else(|| default_root.clone());
      let mut item = MetadataService::lightweight_path(&path, source_root);
      if matches!(request.options.sort_mode, SortMode::Relevance) && !query.is_empty() {
        item.score = score_relevance(&item.name, &query);
      }

      batch.push(item);
      total_results = total_results.saturating_add(1);

      if let Some(limit) = request.options.limit {
        if total_results >= limit {
          limit_reached = true;
          cancel_flag.store(true, Ordering::Release);
          break;
        }
      }

      if batch.len() >= current_batch_limit {
        if cancel_flag.load(Ordering::Acquire) && !limit_reached {
          break;
        }
        sort_stream_batch(&mut batch, &request.options.sort_mode, &query);
        on_batch(std::mem::take(&mut batch));
        current_batch_limit = BATCH_SIZE;
      }
    }

    let mut worker_panicked = false;
    for handle in workers {
      if let Err(panic) = handle.join() {
        eprintln!("Worker thread panicked: {:?}", panic);
        worker_panicked = true;
      }
    }

    if worker_panicked {
      cancel_flag.store(true, Ordering::Release);
    }

    if cancel_flag.load(Ordering::Acquire) && !limit_reached {
      on_limit(limit_reached);
      return Ok(SearchStreamSummary {
        total_results,
        limit_reached,
        cancelled: true,
      });
    }

    if !batch.is_empty() {
      if cancel_flag.load(Ordering::Acquire) && !limit_reached {
        on_limit(limit_reached);
        return Ok(SearchStreamSummary {
          total_results,
          limit_reached,
          cancelled: true,
        });
      }
      sort_stream_batch(&mut batch, &request.options.sort_mode, &query);
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

fn build_query_matcher(mode: &MatchMode, query: &str, ignore_case: bool) -> Result<QueryMatcher, String> {
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

fn sort_stream_batch(items: &mut [SearchResultItem], mode: &SortMode, query: &str) {
  match mode {
    SortMode::Relevance if query.is_empty() => items.sort_by(|left, right| left.name.cmp(&right.name)),
    SortMode::Relevance => sort_results(items, mode),
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

fn normalized_roots(request: &SearchRequest) -> Vec<String> {
  let roots: Vec<String> = request
    .roots
    .iter()
    .map(|root| root.trim().to_string())
    .filter(|root| !root.is_empty())
    .collect();
  if roots.is_empty() {
    vec![".".to_string()]
  } else {
    roots
  }
}

fn normalized_extensions(request: &SearchRequest) -> Vec<String> {
  request
    .extensions
    .iter()
    .map(|ext| ext.trim().trim_start_matches('.').to_string())
    .filter(|ext| !ext.is_empty())
    .collect()
}

fn normalized_exclude_tokens(request: &SearchRequest) -> Vec<String> {
  let mut seen = HashSet::new();
  request
    .exclude_paths
    .iter()
    .map(|value| value.trim())
    .filter(|value| !value.is_empty())
    .map(normalize_path_for_match)
    .filter(|value| seen.insert(value.clone()))
    .collect()
}

fn normalize_path_for_match(value: &str) -> String {
  value.replace('\\', "/").to_lowercase()
}

fn path_matches_exclude_tokens(path: &str, exclude_tokens: &[String]) -> bool {
  if exclude_tokens.is_empty() {
    return false;
  }
  let normalized_path = normalize_path_for_match(path);
  exclude_tokens
    .iter()
    .any(|token| !token.is_empty() && normalized_path.contains(token))
}

fn build_scan_tasks(request: &SearchRequest, roots: &[String]) -> Vec<(String, Option<String>)> {
  let extensions = normalized_extensions(request);
  if extensions.is_empty() {
    roots.iter().cloned().map(|root| (root, None)).collect()
  } else {
    roots
      .iter()
      .flat_map(|root| {
        extensions
          .iter()
          .cloned()
          .map(|ext| (root.clone(), Some(ext)))
          .collect::<Vec<(String, Option<String>)>>()
      })
      .collect()
  }
}

fn compute_worker_count(task_count: usize) -> usize {
  if task_count == 0 {
    return 1;
  }
  let system_parallelism = thread::available_parallelism()
    .map(|value| value.get())
    .unwrap_or(4);
  let bounded_parallelism = system_parallelism.min(MAX_SCAN_WORKERS);
  bounded_parallelism.max(1).min(task_count)
}

fn build_builder(request: &SearchRequest, default_root: &str, ext_override: Option<&str>) -> SearchBuilder {
  let mut builder = SearchBuilder::default().location(default_root);

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

fn prepare_source_roots(roots: &[String], cwd: &Path) -> Vec<(String, PathBuf, usize)> {
  roots
    .iter()
    .cloned()
    .map(|root| {
      let absolute = absolutize_path(Path::new(&root), cwd);
      let specificity = absolute.components().count();
      (root, absolute, specificity)
    })
    .collect()
}

fn absolutize_path(path: &Path, cwd: &Path) -> PathBuf {
  if path.is_absolute() {
    path.to_path_buf()
  } else {
    cwd.join(path)
  }
}

fn dedup_path_key(path: &str) -> String {
  #[cfg(windows)]
  {
    path.replace('\\', "/").to_lowercase()
  }
  #[cfg(not(windows))]
  {
    path.to_string()
  }
}

fn resolve_source_root(roots: &[(String, PathBuf, usize)], path: &str, cwd: &Path) -> Option<String> {
  let absolute_path = absolutize_path(Path::new(path), cwd);
  roots
    .iter()
    .filter(|(_, root_path, _)| absolute_path.starts_with(root_path))
    .max_by_key(|(_, _, specificity)| *specificity)
    .map(|(root, _, _)| root.clone())
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::collections::HashSet;
  use std::fs;
  use std::path::Path;
  use std::sync::atomic::AtomicBool;
  use std::sync::Arc;
  use std::time::Instant;
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
  fn exclude_paths_filters_out_matching_subdirectories() {
    let root = tempdir().expect("root");
    write_file(&root.path().join("node_modules/leftpad/index.js"), "x");
    write_file(&root.path().join(".git/config"), "x");
    write_file(&root.path().join("target/debug/app.bin"), "x");
    write_file(&root.path().join("src/main.rs"), "x");

    let mut request = request_for_roots(vec![root.path().to_string_lossy().to_string()]);
    request.exclude_paths = vec!["node_modules".to_string(), ".git".to_string(), "target".to_string()];
    request.options.max_depth = None;
    request.options.sort_mode = SortMode::Name;

    let execution = SearchService::execute(&request);
    let paths: Vec<String> = execution.items.iter().map(|item| item.full_path.clone()).collect();

    assert!(execution.items.iter().any(|item| item.name == "main.rs"));
    assert!(!paths.iter().any(|path| path.contains("node_modules")));
    assert!(!paths.iter().any(|path| path.contains(".git")));
    assert!(!paths.iter().any(|path| path.contains("target")));
  }

  #[test]
  fn exclude_paths_ignores_blank_values() {
    let root = tempdir().expect("root");
    write_file(&root.path().join("src/main.rs"), "x");

    let mut request = request_for_roots(vec![root.path().to_string_lossy().to_string()]);
    request.exclude_paths = vec!["  ".to_string(), "\t".to_string(), "".to_string()];
    request.options.max_depth = None;
    request.options.sort_mode = SortMode::Name;

    let execution = SearchService::execute(&request);

    assert!(execution.items.iter().any(|item| item.name == "main.rs"));
  }

  #[test]
  fn exclude_paths_deduplicates_tokens() {
    let request = SearchRequest {
      exclude_paths: vec![" target ".to_string(), "target".to_string(), "TARGET".to_string()],
      ..SearchRequest::default()
    };

    let tokens = normalized_exclude_tokens(&request);
    assert_eq!(tokens, vec!["target".to_string()]);
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
    let cwd = PathBuf::from("/");
    let roots = vec!["C:/data".to_string(), "D:/logs".to_string()];
    let prepared = prepare_source_roots(&roots, &cwd);
    let resolved = resolve_source_root(&prepared, "D:/logs/archive/app.log", &cwd);
    assert_eq!(resolved.as_deref(), Some("D:/logs"));
  }

  #[test]
  fn resolve_source_root_prefers_most_specific_root() {
    let cwd = PathBuf::from("/");
    let roots = vec!["C:/data".to_string(), "C:/data/project".to_string()];
    let prepared = prepare_source_roots(&roots, &cwd);
    let resolved = resolve_source_root(&prepared, "C:/data/project/src/main.rs", &cwd);
    assert_eq!(resolved.as_deref(), Some("C:/data/project"));
  }

  #[test]
  fn limit_zero_returns_no_items_and_marks_limit_reached() {
    let root = tempdir().expect("root");
    write_file(&root.path().join("one.txt"), "1");
    write_file(&root.path().join("two.txt"), "2");

    let mut request = request_for_roots(vec![root.path().to_string_lossy().to_string()]);
    request.options.limit = Some(0);
    request.options.sort_mode = SortMode::Name;

    let execution = SearchService::execute(&request);
    assert!(execution.items.is_empty());
    assert!(execution.limit_reached);
  }

  #[test]
  fn missing_root_returns_empty_results_without_failure() {
    let mut request = request_for_roots(vec!["Z:/this/path/should/not/exist".to_string()]);
    request.options.max_depth = None;

    let summary = SearchService::stream(
      &request,
      Arc::new(AtomicBool::new(false)),
      |_batch| {},
      |_limit| {},
    )
    .expect("stream should not fail for missing root");

    assert_eq!(summary.total_results, 0);
    assert!(!summary.cancelled);
    assert!(!summary.limit_reached);
  }

  #[cfg(unix)]
  #[test]
  fn permission_denied_root_does_not_fail_stream() {
    use std::os::unix::fs::PermissionsExt;

    let root = tempdir().expect("root");
    let locked = root.path().join("locked");
    fs::create_dir_all(&locked).expect("create locked dir");
    write_file(&locked.join("secret.txt"), "secret");

    let original = fs::metadata(&locked).expect("metadata").permissions();
    let mut no_access = original.clone();
    no_access.set_mode(0o000);
    fs::set_permissions(&locked, no_access).expect("set restricted perms");

    let mut request = request_for_roots(vec![locked.to_string_lossy().to_string()]);
    request.options.max_depth = None;

    let result = SearchService::stream(
      &request,
      Arc::new(AtomicBool::new(false)),
      |_batch| {},
      |_limit| {},
    );

    fs::set_permissions(&locked, original).expect("restore perms");
    assert!(result.is_ok(), "stream should degrade gracefully on permission denied");
  }

  fn build_perf_dataset(root: &Path, dirs: usize, files_per_dir: usize) {
    for dir_idx in 0..dirs {
      let dir = root.join(format!("dir_{dir_idx:02}"));
      fs::create_dir_all(&dir).expect("failed to create perf directory");
      for file_idx in 0..files_per_dir {
        let name = if file_idx % 5 == 0 {
          format!("report_{dir_idx:02}_{file_idx:04}.xlsx")
        } else {
          format!("file_{dir_idx:02}_{file_idx:04}.txt")
        };
        write_file(&dir.join(name), "x");
      }
    }
  }

  #[test]
  #[ignore = "performance smoke test"]
  fn perf_smoke_plain_mode_release_like() {
    let root = tempdir().expect("root");
    build_perf_dataset(root.path(), 20, 500);

    let mut request = request_for_roots(vec![root.path().to_string_lossy().to_string()]);
    request.options.max_depth = None;
    request.query = "report".to_string();
    request.options.match_mode = MatchMode::Plain;
    request.options.sort_mode = SortMode::Relevance;
    request.options.limit = Some(1000);

    let started = Instant::now();
    let execution = SearchService::execute(&request);
    let elapsed = started.elapsed();

    println!(
      "PERF plain: items={} limit_reached={} elapsed_ms={}",
      execution.items.len(),
      execution.limit_reached,
      elapsed.as_millis()
    );

    assert!(elapsed.as_millis() > 0);
  }

  #[test]
  #[ignore = "performance smoke test"]
  fn perf_smoke_wildcard_mode_release_like() {
    let root = tempdir().expect("root");
    build_perf_dataset(root.path(), 20, 500);

    let mut request = request_for_roots(vec![root.path().to_string_lossy().to_string()]);
    request.options.max_depth = None;
    request.query = "*.xls*".to_string();
    request.options.match_mode = MatchMode::Wildcard;
    request.options.sort_mode = SortMode::Relevance;
    request.options.limit = Some(1000);

    let started = Instant::now();
    let execution = SearchService::execute(&request);
    let elapsed = started.elapsed();

    println!(
      "PERF wildcard: items={} limit_reached={} elapsed_ms={}",
      execution.items.len(),
      execution.limit_reached,
      elapsed.as_millis()
    );

    assert!(elapsed.as_millis() > 0);
  }
}
