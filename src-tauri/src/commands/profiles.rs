use crate::{
  core::models::SearchProfile,
  AppState,
};
use tauri::State;

#[tauri::command]
pub fn profiles_list(state: State<'_, AppState>) -> Result<Vec<SearchProfile>, String> {
  let store = state
    .profiles
    .lock()
    .map_err(|_| "profiles lock poisoned".to_string())?;
  Ok(store.list())
}

#[tauri::command]
pub fn profiles_save(state: State<'_, AppState>, profile: SearchProfile) -> Result<SearchProfile, String> {
  let mut store = state
    .profiles
    .lock()
    .map_err(|_| "profiles lock poisoned".to_string())?;
  Ok(store.save(profile))
}

#[tauri::command]
pub fn profiles_delete(state: State<'_, AppState>, profile_id: String) -> Result<bool, String> {
  let mut store = state
    .profiles
    .lock()
    .map_err(|_| "profiles lock poisoned".to_string())?;
  Ok(store.delete(&profile_id))
}
