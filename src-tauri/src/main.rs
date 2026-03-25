#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod core;
mod platform;
mod storage;

use commands::{actions, favorites, history, index, profiles, search, settings};
use std::sync::Mutex;
use storage::{
  favorites_store::FavoritesStore,
  history_store::HistoryStore,
  index_store::IndexStore,
  presets_store::ProfilesStore,
  settings_store::SettingsStore,
};

pub struct AppState {
  pub search_session: Mutex<core::search_service::SearchSession>,
  pub settings: Mutex<SettingsStore>,
  pub profiles: Mutex<ProfilesStore>,
  pub history: Mutex<HistoryStore>,
  pub favorites: Mutex<FavoritesStore>,
  pub index: Mutex<IndexStore>,
}

impl AppState {
  pub fn new() -> Self {
    Self {
      search_session: Mutex::new(core::search_service::SearchSession::default()),
      settings: Mutex::new(SettingsStore::load()),
      profiles: Mutex::new(ProfilesStore::load()),
      history: Mutex::new(HistoryStore::load()),
      favorites: Mutex::new(FavoritesStore::load()),
      index: Mutex::new(IndexStore::load()),
    }
  }

  pub fn bootstrap() -> Self {
    Self::new()
  }
}

fn main() {
  let app_state = AppState::bootstrap();
  tauri::Builder::default()
    .manage(app_state)
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
