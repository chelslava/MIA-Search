#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod core;
mod platform;
mod storage;

use commands::{actions, profiles, search, settings};
use std::sync::Mutex;
use storage::{
  favorites_store::FavoritesStore,
  history_store::HistoryStore,
  presets_store::ProfilesStore,
  settings_store::SettingsStore,
};

#[derive(Default)]
pub struct AppState {
  pub search_session: Mutex<core::search_service::SearchSession>,
  pub settings: Mutex<SettingsStore>,
  pub profiles: Mutex<ProfilesStore>,
  pub history: Mutex<HistoryStore>,
  pub favorites: Mutex<FavoritesStore>,
}

fn main() {
  tauri::Builder::default()
    .manage(AppState::default())
    .invoke_handler(tauri::generate_handler![
      search::search_start,
      search::search_cancel,
      settings::settings_get,
      settings::settings_set,
      profiles::profiles_list,
      profiles::profiles_save,
      profiles::profiles_delete,
      actions::actions_open_path,
      actions::actions_reveal_path,
      actions::actions_copy_to_clipboard
    ])
    .run(tauri::generate_context!())
    .expect("failed to run tauri application");
}
