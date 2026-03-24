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
        let _ = app_handle.emit(
          "search:batch",
          SearchBatchEvent {
            search_id,
            results,
          },
        );
      },
      |_| {},
    );

    match outcome {
      Ok(summary) if summary.cancelled => {
        let _ = app_handle.emit("search:cancelled", SearchCancelledEvent { search_id });
      }
      Ok(summary) => {
        let _ = app_handle.emit(
          "search:done",
          SearchDoneEvent {
            search_id,
            total_results: summary.total_results,
            limit_reached: summary.limit_reached,
          },
        );
      }
      Err(message) => {
        let _ = app_handle.emit("search:error", SearchErrorEvent { search_id, message });
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

#[tauri::command]
pub fn search_cancel(state: State<'_, AppState>) -> Result<SearchCancelResponse, String> {
  let mut session = state
    .search_session
    .lock()
    .map_err(|_| "search session lock poisoned".to_string())?;
  let search_id = session.cancel();
  Ok(SearchCancelResponse {
    search_id,
    status: if search_id.is_some() {
      "cancelled".to_string()
    } else {
      "idle".to_string()
    },
  })
}
