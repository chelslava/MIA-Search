use crate::{storage::settings_store::SettingsSnapshot, AppState};
use tauri::State;

#[tauri::command]
pub fn settings_get(state: State<'_, AppState>) -> Result<SettingsSnapshot, String> {
  let settings = state
    .settings
    .lock()
    .map_err(|_| "settings lock poisoned".to_string())?;
  Ok(settings.snapshot())
}

#[tauri::command]
pub fn settings_set(state: State<'_, AppState>, value: SettingsSnapshot) -> Result<SettingsSnapshot, String> {
  let mut settings = state
    .settings
    .lock()
    .map_err(|_| "settings lock poisoned".to_string())?;
  settings.replace(value);
  settings.persist()?;
  Ok(settings.snapshot())
}
