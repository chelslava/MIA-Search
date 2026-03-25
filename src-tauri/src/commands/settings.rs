use crate::{storage::settings_store::SettingsSnapshot, AppState};
use crate::storage::settings_store::SettingsStore;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn settings_get(state: State<'_, AppState>) -> Result<SettingsSnapshot, String> {
  settings_get_inner(&state.settings)
}

#[tauri::command]
pub fn settings_set(state: State<'_, AppState>, value: SettingsSnapshot) -> Result<SettingsSnapshot, String> {
  settings_set_inner(&state.settings, value)
}

fn settings_get_inner(settings: &Mutex<SettingsStore>) -> Result<SettingsSnapshot, String> {
  let settings = settings
    .lock()
    .map_err(|_| "settings lock poisoned".to_string())?;
  Ok(settings.snapshot())
}

fn settings_set_inner(
  settings: &Mutex<SettingsStore>,
  value: SettingsSnapshot,
) -> Result<SettingsSnapshot, String> {
  let mut settings = settings
    .lock()
    .map_err(|_| "settings lock poisoned".to_string())?;
  settings.replace(value);
  settings.persist()?;
  Ok(settings.snapshot())
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::storage::persistence::with_test_data_dir;
  use std::sync::Mutex;

  #[test]
  fn settings_inner_commands_flow() {
    with_test_data_dir(|| {
      let settings = Mutex::new(SettingsStore::default());
      let snapshot = settings_get_inner(&settings).expect("get");
      assert_eq!(snapshot.language, "ru");

      let mut next = snapshot.clone();
      next.language = "en".to_string();
      let saved = settings_set_inner(&settings, next).expect("set");
      assert_eq!(saved.language, "en");
    });
  }
}
