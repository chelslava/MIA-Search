#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod core;
mod platform;
mod storage;

use commands::{actions, favorites, history, index, profiles, search, settings};
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, AtomicUsize};
use std::sync::Arc;
use std::thread::JoinHandle;

use storage::{
  favorites_store::FavoritesStore,
  history_store::HistoryStore,
  index_store::IndexStore,
  profiles_store::ProfilesStore,
  settings_store::SettingsStore,
};

#[macro_export]
macro_rules! lock_mutex {
  ($mutex:expr, $name:expr) => {
    $mutex.lock().map_err(|e| {
      log::error!("{} mutex poisoned: {:?}", $name, e);
      format!("{} lock poisoned", $name)
    })?
  };
}

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
  pub index_rebuild_entries: Arc<AtomicUsize>,
  pub shutting_down: Arc<AtomicBool>,
  pub search_thread_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
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
      index_rebuild_entries: Arc::new(AtomicUsize::new(0)),
      shutting_down: Arc::new(AtomicBool::new(false)),
      search_thread_handle: Arc::new(Mutex::new(None)),
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
  let search_thread_handle = app_state.search_thread_handle.clone();
  tauri::Builder::default()
    .manage(app_state)
    .on_window_event(move |_window, event| {
      if let tauri::WindowEvent::CloseRequested { .. } = event {
        log::info!("Shutdown requested, signalling cancellation...");
        shutdown_flag.store(true, std::sync::atomic::Ordering::Release);
        if let Ok(mut session) = search_session.lock() {
          session.cancel();
        }
        if let Ok(mut rebuild_cancel) = rebuild_cancel.lock() {
          if let Some(flag) = rebuild_cancel.take() {
            flag.store(true, std::sync::atomic::Ordering::Release);
          }
        }
        if let Ok(mut handle_guard) = search_thread_handle.lock() {
          if let Some(handle) = handle_guard.take() {
            let _ = handle.join();
            log::info!("Search thread joined");
          }
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
        log::info!("Grace period elapsed, proceeding with shutdown");
      }
    })
    .invoke_handler(tauri::generate_handler![
      search::search_start,
      search::search_cancel,
      search::search_enrich_metadata,
      search::content_search,
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
      actions::preview_file,
      actions::batch_copy,
      actions::batch_move,
      actions::batch_delete,
      actions::export_search_results,
      actions::export_to_clipboard,
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
