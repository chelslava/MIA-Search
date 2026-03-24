use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn favorites_list(state: State<'_, AppState>) -> Result<Vec<String>, String> {
  let store = state
    .favorites
    .lock()
    .map_err(|_| "favorites lock poisoned".to_string())?;
  Ok(store.list())
}

#[tauri::command]
pub fn favorites_add(state: State<'_, AppState>, path: String) -> Result<Vec<String>, String> {
  let mut store = state
    .favorites
    .lock()
    .map_err(|_| "favorites lock poisoned".to_string())?;
  store.add(path);
  store.persist()?;
  Ok(store.list())
}

#[tauri::command]
pub fn favorites_remove(state: State<'_, AppState>, path: String) -> Result<bool, String> {
  let mut store = state
    .favorites
    .lock()
    .map_err(|_| "favorites lock poisoned".to_string())?;
  let removed = store.remove(&path);
  if removed {
    store.persist()?;
  }
  Ok(removed)
}
