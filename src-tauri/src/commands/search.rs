use crate::{
  core::{
    models::{SearchRequest, SearchResultItem},
    search_service::SearchService,
  },
  commands::history::record_query_if_enabled,
  AppState,
};
use serde::{Deserialize, Serialize};
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

#[tauri::command]
pub fn search_start(
  app: AppHandle,
  state: State<'_, AppState>,
  request: SearchRequest,
) -> Result<SearchCommandResponse, String> {
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
    let outcome = SearchService::stream(
      &request,
      cancel_flag,
      |results| {
        if is_active_search(&app_handle, search_id) {
          let _ = app_handle.emit(
            "search:batch",
            SearchBatchEvent {
              search_id,
              results,
            },
          );
        }
      },
      |_| {},
    );

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
    Err(message) => SearchTerminalEvent::Error(SearchErrorEvent { search_id, message }),
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::core::search_service::SearchStreamSummary;

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
        assert_eq!(payload.message, "boom");
      }
      _ => panic!("expected error event"),
    }
  }
}
