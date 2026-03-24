use crate::core::metadata_service::MetadataService;
use crate::core::models::{
  CommandStatus, DateComparison, EntryKind, SearchRequest, SearchResultItem, SearchSessionSnapshot, SortMode,
  SizeComparison,
};
use crate::core::ranking::sort_results;
use chrono::{DateTime, Utc};
use rust_search::{similarity_sort, FileSize, FilterExt, SearchBuilder};
use std::path::Path;
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::SystemTime;

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
  if !query.is_empty() {
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
  if let Some(limit) = request.options.limit {
    builder = builder.limit(limit);
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
