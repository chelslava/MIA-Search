use crate::{
  core::{
    index_service::IndexService,
    metadata_service::MetadataService,
    models::{SearchBackend, SearchRequest, SearchResultItem},
    search_service::SearchService,
  },
  commands::history::record_query_if_enabled,
  AppState,
};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchCommandResponse {
  pub search_id: u64,
  pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchCancelResponse {
  pub search_id: Option<u64>,
  pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchBatchEvent {
  pub search_id: u64,
  pub results: Vec<SearchResultItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchDoneEvent {
  pub search_id: u64,
  pub total_results: usize,
  pub limit_reached: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchCancelledEvent {
  pub search_id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchErrorEvent {
  pub search_id: u64,
  pub message: String,
}

enum SearchTerminalEvent {
  Cancelled(SearchCancelledEvent),
  Done(SearchDoneEvent),
  Error(SearchErrorEvent),
}

const MAX_QUERY_LENGTH: usize = 1024;
const MAX_ROOTS: usize = 50;
const MAX_EXTENSIONS: usize = 20;
const MAX_EXCLUDE_PATHS: usize = 50;

fn validate_request(request: &SearchRequest) -> Result<(), String> {
  if request.query.len() > MAX_QUERY_LENGTH {
    return Err(format!(
      "Query too long: {} chars (max {})",
      request.query.len(),
      MAX_QUERY_LENGTH
    ));
  }
  if request.roots.len() > MAX_ROOTS {
    return Err(format!(
      "Too many roots: {} (max {})",
      request.roots.len(),
      MAX_ROOTS
    ));
  }
  if request.extensions.len() > MAX_EXTENSIONS {
    return Err(format!(
      "Too many extensions: {} (max {})",
      request.extensions.len(),
      MAX_EXTENSIONS
    ));
  }
  if request.exclude_paths.len() > MAX_EXCLUDE_PATHS {
    return Err(format!(
      "Too many exclude_paths: {} (max {})",
      request.exclude_paths.len(),
      MAX_EXCLUDE_PATHS
    ));
  }
  Ok(())
}

#[tauri::command]
pub fn search_start(
  app: AppHandle,
  state: State<'_, AppState>,
  request: SearchRequest,
) -> Result<SearchCommandResponse, String> {
  validate_request(&request)?;
  record_query_if_enabled(&state, request.clone())?;

  let mut session = state
    .search_session
    .lock()
    .map_err(|_| "search session lock poisoned".to_string())?;
  let started = session.start(request.clone());
  let search_id = started.search_id;
  let cancel_flag = started.cancel_flag.clone();
  drop(session);

  let app_handle = app.clone();
  std::thread::spawn(move || {
    let state = app_handle.state::<AppState>();
    if state.shutting_down.load(std::sync::atomic::Ordering::Acquire) {
      return;
    }

    let outcome = run_search_stream(&app_handle, &request, cancel_flag, search_id);

    let state = app_handle.state::<AppState>();
    if state.shutting_down.load(std::sync::atomic::Ordering::Acquire) {
      return;
    }

    match terminal_event_from_stream(search_id, outcome) {
      SearchTerminalEvent::Cancelled(payload) => {
        if is_active_search(&app_handle, search_id) {
          let _ = app_handle.emit("search:cancelled", payload);
        }
      }
      SearchTerminalEvent::Done(payload) => {
        if is_active_search(&app_handle, search_id) {
          let _ = app_handle.emit("search:done", payload);
        }
      }
      SearchTerminalEvent::Error(payload) => {
        if is_active_search(&app_handle, search_id) {
          let _ = app_handle.emit("search:error", payload);
        }
      }
    }

    {
      let managed_state = app_handle.state::<AppState>();
      if let Ok(mut session) = managed_state.search_session.lock() {
        session.complete_if_active(search_id);
      };
    }
  });

  Ok(SearchCommandResponse {
    search_id,
    status: "accepted".to_string(),
  })
}

fn is_active_search(app_handle: &AppHandle, search_id: u64) -> bool {
  let managed_state = app_handle.state::<AppState>();
  managed_state
    .search_session
    .lock()
    .map(|session| session.is_active_search(search_id))
    .unwrap_or(false)
}

#[tauri::command]
pub fn search_cancel(state: State<'_, AppState>) -> Result<SearchCancelResponse, String> {
  let mut session = state
    .search_session
    .lock()
    .map_err(|_| "search session lock poisoned".to_string())?;
  let search_id = session.cancel();
  Ok(SearchCancelResponse {
    search_id,
    status: cancel_status_text(search_id),
  })
}

#[tauri::command]
pub async fn search_enrich_metadata(
  state: State<'_, AppState>,
  paths: Vec<String>,
) -> Result<Vec<SearchResultItem>, String> {
  let candidate_roots = state
    .search_session
    .lock()
    .map_err(|_| "search session lock poisoned".to_string())?
    .snapshot()
    .last_request
    .map(|request| request.roots)
    .unwrap_or_default();

  tauri::async_runtime::spawn_blocking(move || enrich_paths_with_metadata(&paths, &candidate_roots))
    .await
    .map_err(|error| format!("metadata task join error: {error}"))?
}

fn cancel_status_text(search_id: Option<u64>) -> String {
  if search_id.is_some() {
    "cancelled".to_string()
  } else {
    "idle".to_string()
  }
}

fn terminal_event_from_stream(
  search_id: u64,
  outcome: Result<crate::core::search_service::SearchStreamSummary, String>,
) -> SearchTerminalEvent {
  match outcome {
    Ok(summary) if summary.cancelled => SearchTerminalEvent::Cancelled(SearchCancelledEvent { search_id }),
    Ok(summary) => SearchTerminalEvent::Done(SearchDoneEvent {
      search_id,
      total_results: summary.total_results,
      limit_reached: summary.limit_reached,
    }),
    Err(message) => SearchTerminalEvent::Error(SearchErrorEvent {
      search_id,
      message: format_search_error(&message),
    }),
  }
}

fn format_search_error(message: &str) -> String {
  let code = if message.contains("regex parse error") || message.contains("wildcard parse error") {
    "SEARCH_INVALID_QUERY"
  } else if message.contains("index store lock poisoned") || message.contains("search session lock poisoned") {
    "SEARCH_STATE_ERROR"
  } else {
    "SEARCH_EXECUTION_ERROR"
  };
  format!("[{code}] {message}")
}

fn run_search_stream(
  app_handle: &AppHandle,
  request: &SearchRequest,
  cancel_flag: std::sync::Arc<std::sync::atomic::AtomicBool>,
  search_id: u64,
) -> Result<crate::core::search_service::SearchStreamSummary, String> {
  let emit_batch = |results: Vec<SearchResultItem>| {
    if is_active_search(app_handle, search_id) {
      let _ = app_handle.emit(
        "search:batch",
        SearchBatchEvent {
          search_id,
          results: results.into_iter().map(to_lightweight_item).collect(),
        },
      );
    }
  };

  match request.options.search_backend {
    SearchBackend::Scan => SearchService::stream(request, cancel_flag, emit_batch, |_| {}),
    SearchBackend::Index => {
      let index_snapshot = app_handle
        .state::<AppState>()
        .index
        .lock()
        .map_err(|_| "index store lock poisoned".to_string())?
        .snapshot();

      if index_snapshot.entries.is_empty() {
        SearchService::stream(request, cancel_flag, emit_batch, |_| {})
      } else {
        let summary = IndexService::stream(&index_snapshot, request, cancel_flag, emit_batch, |_| {})
          .map(|value| crate::core::search_service::SearchStreamSummary {
            total_results: value.total_results,
            limit_reached: value.limit_reached,
            cancelled: value.cancelled,
          })?;
        Ok(summary)
      }
    }
  }
}

fn to_lightweight_item(mut item: SearchResultItem) -> SearchResultItem {
  item.size = None;
  item.created_at = None;
  item.modified_at = None;
  item
}

fn enrich_paths_with_metadata(paths: &[String], candidate_roots: &[String]) -> Result<Vec<SearchResultItem>, String> {
  let items: Vec<SearchResultItem> = paths
    .par_iter()
    .map(|path| {
      let source_root = resolve_source_root_for_path(path, candidate_roots);
      MetadataService::enrich_path(path, source_root)
    })
    .collect();
  Ok(items)
}

fn resolve_source_root_for_path(path: &str, roots: &[String]) -> String {
  if roots.is_empty() {
    return Path::new(path)
      .parent()
      .map(|value| value.to_string_lossy().to_string())
      .unwrap_or_default();
  }

  let absolute = absolutize_path(Path::new(path));
  roots
    .iter()
    .filter_map(|root| {
      let root_path = absolutize_path(Path::new(root));
      absolute
        .starts_with(&root_path)
        .then_some((root.clone(), root_path.components().count()))
    })
    .max_by_key(|(_, specificity)| *specificity)
    .map(|(root, _)| root)
    .unwrap_or_else(|| roots[0].clone())
}

fn absolutize_path(path: &Path) -> std::path::PathBuf {
  if path.is_absolute() {
    path.to_path_buf()
  } else {
    std::env::current_dir().map(|cwd| cwd.join(path)).unwrap_or_else(|_| path.to_path_buf())
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::core::search_service::SearchStreamSummary;
  use std::fs;
  use tempfile::tempdir;

  #[test]
  fn cancel_status_text_matches_expected_values() {
    assert_eq!(cancel_status_text(Some(7)), "cancelled");
    assert_eq!(cancel_status_text(None), "idle");
  }

  #[test]
  fn terminal_event_from_stream_maps_all_outcomes() {
    let cancelled = terminal_event_from_stream(
      1,
      Ok(SearchStreamSummary {
        total_results: 0,
        limit_reached: false,
        cancelled: true,
      }),
    );
    assert!(matches!(cancelled, SearchTerminalEvent::Cancelled(_)));

    let done = terminal_event_from_stream(
      2,
      Ok(SearchStreamSummary {
        total_results: 10,
        limit_reached: true,
        cancelled: false,
      }),
    );
    match done {
      SearchTerminalEvent::Done(payload) => {
        assert_eq!(payload.search_id, 2);
        assert_eq!(payload.total_results, 10);
        assert!(payload.limit_reached);
      }
      _ => panic!("expected done event"),
    }

    let error = terminal_event_from_stream(3, Err("boom".to_string()));
    match error {
      SearchTerminalEvent::Error(payload) => {
        assert_eq!(payload.search_id, 3);
        assert_eq!(payload.message, "[SEARCH_EXECUTION_ERROR] boom");
      }
      _ => panic!("expected error event"),
    }
  }

  #[test]
  fn format_search_error_uses_consistent_codes() {
    assert_eq!(
      format_search_error("regex parse error: ["),
      "[SEARCH_INVALID_QUERY] regex parse error: ["
    );
    assert_eq!(
      format_search_error("search session lock poisoned"),
      "[SEARCH_STATE_ERROR] search session lock poisoned"
    );
    assert_eq!(format_search_error("boom"), "[SEARCH_EXECUTION_ERROR] boom");
  }

  #[test]
  fn to_lightweight_item_removes_heavy_fields() {
    let item = SearchResultItem {
      size: Some(1),
      created_at: Some("2026-03-25T12:00:00Z".to_string()),
      modified_at: Some("2026-03-25T12:00:00Z".to_string()),
      ..SearchResultItem::default()
    };

    let light = to_lightweight_item(item);
    assert!(light.size.is_none());
    assert!(light.created_at.is_none());
    assert!(light.modified_at.is_none());
  }

  #[test]
  fn resolve_source_root_for_path_prefers_specific_match() {
    let roots = vec!["C:/data".to_string(), "C:/data/project".to_string()];
    let resolved = resolve_source_root_for_path("C:/data/project/src/main.rs", &roots);
    assert_eq!(resolved, "C:/data/project");
  }

  #[test]
  fn enrich_paths_with_metadata_populates_entries() {
    let dir = tempdir().expect("tempdir");
    let file = dir.path().join("doc.txt");
    fs::write(&file, "hello").expect("write file");
    let paths = vec![file.to_string_lossy().to_string()];
    let roots = vec![dir.path().to_string_lossy().to_string()];

    let items = enrich_paths_with_metadata(&paths, &roots).expect("metadata");
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].name, "doc.txt");
    assert!(items[0].is_file);
    assert!(items[0].size.is_some());
    assert_eq!(items[0].source_root, roots[0]);
  }

  #[test]
  fn validate_request_accepts_valid_requests() {
    let request = SearchRequest {
      query: "test".to_string(),
      roots: vec!["C:/data".to_string()],
      extensions: vec!["txt".to_string()],
      exclude_paths: vec!["node_modules".to_string()],
      ..SearchRequest::default()
    };
    assert!(validate_request(&request).is_ok());
  }

  #[test]
  fn validate_request_rejects_query_too_long() {
    let request = SearchRequest {
      query: "x".repeat(2000),
      ..SearchRequest::default()
    };
    let err = validate_request(&request).unwrap_err();
    assert!(err.contains("Query too long"));
  }

  #[test]
  fn validate_request_rejects_too_many_roots() {
    let request = SearchRequest {
      roots: (0..100).map(|i| format!("C:/root{}", i)).collect(),
      ..SearchRequest::default()
    };
    let err = validate_request(&request).unwrap_err();
    assert!(err.contains("Too many roots"));
  }

  #[test]
  fn validate_request_rejects_too_many_extensions() {
    let request = SearchRequest {
      extensions: (0..100).map(|i| format!("ext{}", i)).collect(),
      ..SearchRequest::default()
    };
    let err = validate_request(&request).unwrap_err();
    assert!(err.contains("Too many extensions"));
  }

  #[test]
  fn validate_request_rejects_too_many_exclude_paths() {
    let request = SearchRequest {
      exclude_paths: (0..100).map(|i| format!("exclude{}", i)).collect(),
      ..SearchRequest::default()
    };
    let err = validate_request(&request).unwrap_err();
    assert!(err.contains("Too many exclude_paths"));
  }
}
