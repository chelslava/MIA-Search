use crate::AppState;
use crate::platform::path_security::validate_path_for_read;
use crate::storage::favorites_store::FavoritesStore;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn favorites_list(state: State<'_, AppState>) -> Result<Vec<String>, String> {
  favorites_list_inner(&state.favorites)
}

#[tauri::command]
pub fn favorites_add(state: State<'_, AppState>, path: String) -> Result<Vec<String>, String> {
  favorites_add_inner(&state.favorites, path)
}

#[tauri::command]
pub fn favorites_remove(state: State<'_, AppState>, path: String) -> Result<bool, String> {
  favorites_remove_inner(&state.favorites, path)
}

fn favorites_list_inner(favorites: &Mutex<FavoritesStore>) -> Result<Vec<String>, String> {
  let store = favorites
    .lock()
    .map_err(|_| "favorites lock poisoned".to_string())?;
  Ok(store.list())
}

fn favorites_add_inner(favorites: &Mutex<FavoritesStore>, path: String) -> Result<Vec<String>, String> {
  validate_path_for_read(&path)?;
  let mut store = favorites
    .lock()
    .map_err(|_| "favorites lock poisoned".to_string())?;
  store.add(path);
  store.persist()?;
  Ok(store.list())
}

fn favorites_remove_inner(favorites: &Mutex<FavoritesStore>, path: String) -> Result<bool, String> {
  let mut store = favorites
    .lock()
    .map_err(|_| "favorites lock poisoned".to_string())?;
  let removed = store.remove(&path);
  if removed {
    store.persist()?;
  }
  Ok(removed)
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::storage::persistence::with_test_data_dir;
  use std::sync::Mutex;

  #[test]
  fn favorites_inner_commands_flow() {
    with_test_data_dir(|| {
      let temp_dir = tempfile::tempdir().expect("temp dir");
      let path_one = temp_dir.path().join("one");
      let path_missing = temp_dir.path().join("missing");
      std::fs::create_dir_all(&path_one).expect("create one");

      let favorites = Mutex::new(FavoritesStore::default());
      assert_eq!(favorites_list_inner(&favorites).expect("list"), Vec::<String>::new());

      let added = favorites_add_inner(&favorites, path_one.to_string_lossy().to_string()).expect("add");
      assert_eq!(added, vec![path_one.to_string_lossy().to_string()]);
      assert!(!favorites_remove_inner(&favorites, path_missing.to_string_lossy().to_string()).expect("remove missing"));
      assert!(favorites_remove_inner(&favorites, path_one.to_string_lossy().to_string()).expect("remove existing"));
    });
  }
}
