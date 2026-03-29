#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod core;
mod platform;
mod storage;

use commands::{actions, favorites, history, index, profiles, search, settings};
use std::sync::Mutex;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::Manager;
use storage::{
  favorites_store::FavoritesStore,
  history_store::HistoryStore,
  index_store::IndexStore,
  presets_store::ProfilesStore,
  settings_store::SettingsStore,
};

#[derive(Clone)]
pub struct AppState {
  pub search_session: Arc<Mutex<core::search_service::SearchSession>>,
  pub settings: Arc<Mutex<SettingsStore>>,
  pub profiles: Arc<Mutex<ProfilesStore>>,
  pub history: Arc<Mutex<HistoryStore>>,
  pub favorites: Arc<Mutex<FavoritesStore>>,
  pub index: Arc<Mutex<IndexStore>>,
  pub index_rebuild_in_progress: Arc<AtomicBool>,
  pub index_rebuild_cancel: Arc<Mutex<Option<Arc<AtomicBool>>>>,
  pub shutting_down: Arc<AtomicBool>,
}

pub fn lock_or_recover<T>(mutex: &Mutex<T>) -> Result<std::sync::MutexGuard<T>, String> {
  match mutex.lock() {
    Ok(guard) => Ok(guard),
    Err(poisoned) => {
      eprintln!("WARNING: Mutex poisoned, recovering. This may indicate data corruption.");
      Ok(poisoned.into_inner())
    }
  }
}

impl AppState {
  pub fn new() -> Self {
    Self {
      search_session: Arc::new(Mutex::new(core::search_service::SearchSession::default())),
      settings: Arc::new(Mutex::new(SettingsStore::load())),
      profiles: Arc::new(Mutex::new(ProfilesStore::load())),
      history: Arc::new(Mutex::new(HistoryStore::load())),
      favorites: Arc::new(Mutex::new(FavoritesStore::load())),
      index: Arc::new(Mutex::new(IndexStore::load())),
      index_rebuild_in_progress: Arc::new(AtomicBool::new(false)),
      index_rebuild_cancel: Arc::new(Mutex::new(None)),
      shutting_down: Arc::new(AtomicBool::new(false)),
    }
  }

  pub fn bootstrap() -> Self {
    Self::new()
  }
}

fn main() {
  let app_state = AppState::bootstrap();
  let shutdown_flag = app_state.shutting_down.clone();
  let search_session = app_state.search_session.clone();
  let rebuild_cancel = app_state.index_rebuild_cancel.clone();
  tauri::Builder::default()
    .manage(app_state)
    .on_window_event(move |_window, event| {
      if let tauri::WindowEvent::CloseRequested { .. } = event {
        shutdown_flag.store(true, std::sync::atomic::Ordering::Release);
        if let Ok(mut session) = search_session.lock() {
          session.cancel();
        }
        if let Ok(mut rebuild_cancel) = rebuild_cancel.lock() {
          if let Some(flag) = rebuild_cancel.take() {
            flag.store(true, std::sync::atomic::Ordering::Release);
          }
        }
      }
    })
    .invoke_handler(tauri::generate_handler![
      search::search_start,
      search::search_cancel,
      search::search_enrich_metadata,
      settings::settings_get,
      settings::settings_set,
      profiles::profiles_list,
      profiles::profiles_save,
      profiles::profiles_delete,
      favorites::favorites_list,
      favorites::favorites_add,
      favorites::favorites_remove,
      history::history_list,
      history::history_clear,
      actions::actions_open_path,
      actions::actions_open_parent,
      actions::actions_reveal_path,
      actions::actions_copy_to_clipboard,
      actions::fs_list_roots,
      actions::fs_list_children,
      actions::fs_pick_folder,
      index::index_rebuild,
      index::index_rebuild_cancel,
      index::index_status
    ])
    .run(tauri::generate_context!())
    .expect("failed to run tauri application");
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn app_state_bootstrap_initializes_stores_and_session() {
    let state = AppState::bootstrap();
    let snapshot = state
      .search_session
      .lock()
      .expect("search lock")
      .snapshot();
    assert!(snapshot.active_search_id.is_none());
    assert!(snapshot.last_request.is_none());
  }
}
