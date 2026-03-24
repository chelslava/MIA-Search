use crate::{commands::history::record_opened_path_if_enabled, platform, AppState};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResponse {
  pub action: String,
  pub target: String,
  pub success: bool,
  pub message: Option<String>,
}

#[tauri::command]
pub fn actions_open_path(state: State<'_, AppState>, path: String) -> Result<ActionResponse, String> {
  match platform::open_path::open_path(&path) {
    Ok(()) => {
      record_opened_path_if_enabled(&state, path.clone())?;
      Ok(ActionResponse {
        action: "open_path".to_string(),
        target: path,
        success: true,
        message: None,
      })
    }
    Err(error) => Ok(ActionResponse {
      action: "open_path".to_string(),
      target: path,
      success: false,
      message: Some(error),
    }),
  }
}

#[tauri::command]
pub fn actions_reveal_path(_state: State<'_, AppState>, path: String) -> Result<ActionResponse, String> {
  match platform::reveal_in_explorer::reveal_in_file_manager(&path) {
    Ok(()) => Ok(ActionResponse {
      action: "reveal_path".to_string(),
      target: path,
      success: true,
      message: None,
    }),
    Err(error) => Ok(ActionResponse {
      action: "reveal_path".to_string(),
      target: path,
      success: false,
      message: Some(error),
    }),
  }
}

#[tauri::command]
pub fn actions_copy_to_clipboard(_state: State<'_, AppState>, text: String) -> Result<ActionResponse, String> {
  match platform::clipboard::copy_text(&text) {
    Ok(()) => Ok(ActionResponse {
      action: "copy_to_clipboard".to_string(),
      target: text,
      success: true,
      message: None,
    }),
    Err(error) => Ok(ActionResponse {
      action: "copy_to_clipboard".to_string(),
      target: text,
      success: false,
      message: Some(error),
    }),
  }
}
