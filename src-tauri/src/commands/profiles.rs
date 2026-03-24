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
  let saved = store.save(profile);
  store.persist()?;
  Ok(saved)
}

#[tauri::command]
pub fn profiles_delete(state: State<'_, AppState>, profile_id: String) -> Result<bool, String> {
  let mut store = state
    .profiles
    .lock()
    .map_err(|_| "profiles lock poisoned".to_string())?;
  let deleted = store.delete(&profile_id);
  if deleted {
    store.persist()?;
  }
  Ok(deleted)
}
