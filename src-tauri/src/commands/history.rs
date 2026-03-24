use crate::{core::models::SearchRequest, storage::history_store::HistorySnapshot, AppState};
use tauri::State;

#[tauri::command]
pub fn history_list(state: State<'_, AppState>) -> Result<HistorySnapshot, String> {
  let store = state
    .history
    .lock()
    .map_err(|_| "history lock poisoned".to_string())?;
  Ok(store.snapshot())
}

#[tauri::command]
pub fn history_clear(state: State<'_, AppState>) -> Result<HistorySnapshot, String> {
  let mut store = state
    .history
    .lock()
    .map_err(|_| "history lock poisoned".to_string())?;
  store.queries.clear();
  store.opened_paths.clear();
  store.persist()?;
  Ok(store.snapshot())
}

pub fn record_query_if_enabled(state: &State<'_, AppState>, request: SearchRequest) -> Result<(), String> {
  let settings = state
    .settings
    .lock()
    .map_err(|_| "settings lock poisoned".to_string())?
    .snapshot();
  if !settings.keep_history {
    return Ok(());
  }

  let mut history = state
    .history
    .lock()
    .map_err(|_| "history lock poisoned".to_string())?;
  history.record_query(request);
  history.persist()
}

pub fn record_opened_path_if_enabled(state: &State<'_, AppState>, path: impl Into<String>) -> Result<(), String> {
  let settings = state
    .settings
    .lock()
    .map_err(|_| "settings lock poisoned".to_string())?
    .snapshot();
  if !settings.keep_history {
    return Ok(());
  }

  let mut history = state
    .history
    .lock()
    .map_err(|_| "history lock poisoned".to_string())?;
  history.record_opened_path(path);
  history.persist()
}
