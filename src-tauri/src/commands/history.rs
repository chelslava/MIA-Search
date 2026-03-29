use crate::{core::models::SearchRequest, storage::history_store::HistorySnapshot, AppState};
use crate::storage::{history_store::HistoryStore, settings_store::SettingsSnapshot};
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn history_list(state: State<'_, AppState>) -> Result<HistorySnapshot, String> {
  history_list_inner(&state.history)
}

#[tauri::command]
pub fn history_clear(state: State<'_, AppState>) -> Result<HistorySnapshot, String> {
  history_clear_inner(&state.history)
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
  let history_limit = settings.max_history_entries;

  let mut history = state
    .history
    .lock()
    .map_err(|_| "history lock poisoned".to_string())?;
  history.record_query_with_limit(request, history_limit);
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
  let history_limit = settings.max_history_entries;

  let mut history = state
    .history
    .lock()
    .map_err(|_| "history lock poisoned".to_string())?;
  history.record_opened_path_with_limit(path, history_limit);
  history.persist()
}

fn history_list_inner(history: &Mutex<HistoryStore>) -> Result<HistorySnapshot, String> {
  let store = history
    .lock()
    .map_err(|_| "history lock poisoned".to_string())?;
  Ok(store.snapshot())
}

fn history_clear_inner(history: &Mutex<HistoryStore>) -> Result<HistorySnapshot, String> {
  let mut store = history
    .lock()
    .map_err(|_| "history lock poisoned".to_string())?;
  store.query_entries.clear();
  store.opened_paths.clear();
  store.persist()?;
  Ok(store.snapshot())
}

fn record_query_with_settings(
  history: &Mutex<HistoryStore>,
  settings: &SettingsSnapshot,
  request: SearchRequest,
) -> Result<(), String> {
  if !settings.keep_history {
    return Ok(());
  }
  let mut history = history
    .lock()
    .map_err(|_| "history lock poisoned".to_string())?;
  history.record_query_with_limit(request, settings.max_history_entries);
  history.persist()
}

fn record_opened_with_settings(
  history: &Mutex<HistoryStore>,
  settings: &SettingsSnapshot,
  path: impl Into<String>,
) -> Result<(), String> {
  if !settings.keep_history {
    return Ok(());
  }
  let mut history = history
    .lock()
    .map_err(|_| "history lock poisoned".to_string())?;
  history.record_opened_path_with_limit(path, settings.max_history_entries);
  history.persist()
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::storage::persistence::with_test_data_dir;
  use std::sync::Mutex;

  fn settings(keep_history: bool, max_history_entries: usize) -> SettingsSnapshot {
    SettingsSnapshot {
      keep_history,
      max_history_entries,
      ..SettingsSnapshot::default()
    }
  }

  #[test]
  fn history_inner_list_and_clear_flow() {
    with_test_data_dir(|| {
      let history = Mutex::new(HistoryStore::default());
      {
        let mut locked = history.lock().expect("lock");
        locked.record_query(SearchRequest {
          query: "q".to_string(),
          ..SearchRequest::default()
        });
        locked.record_opened_path("C:/tmp");
      }

      assert_eq!(history_list_inner(&history).expect("list").query_entries.len(), 1);
      let cleared = history_clear_inner(&history).expect("clear");
      assert!(cleared.query_entries.is_empty());
      assert!(cleared.opened_paths.is_empty());
    });
  }

  #[test]
  fn record_helpers_honor_settings_flags() {
    with_test_data_dir(|| {
      let history = Mutex::new(HistoryStore::default());
      record_query_with_settings(
        &history,
        &settings(false, 10),
        SearchRequest {
          query: "skip".to_string(),
          ..SearchRequest::default()
        },
      )
      .expect("record with disabled history");
      assert!(history.lock().expect("lock").query_entries.is_empty());

      record_query_with_settings(
        &history,
        &settings(true, 1),
        SearchRequest {
          query: "keep".to_string(),
          ..SearchRequest::default()
        },
      )
      .expect("record enabled");
      record_opened_with_settings(&history, &settings(true, 1), "C:/ok").expect("opened");
      let snapshot = history.lock().expect("lock").snapshot();
      assert_eq!(snapshot.query_entries.len(), 1);
      assert_eq!(snapshot.opened_paths.len(), 1);
    });
  }
}
