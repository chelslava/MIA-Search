use crate::{commands::history::record_opened_path_if_enabled, platform, AppState};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResponse {
  pub action: String,
  pub target: String,
  pub success: bool,
  pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsTreeNode {
  pub name: String,
  pub path: String,
  pub is_drive: bool,
  pub has_children: bool,
}

fn has_dir_children(path: &Path) -> bool {
  match fs::read_dir(path) {
    Ok(entries) => entries.flatten().any(|entry| entry.path().is_dir()),
    Err(_) => false,
  }
}

#[tauri::command]
pub fn fs_list_roots() -> Result<Vec<FsTreeNode>, String> {
  let mut items: Vec<FsTreeNode> = Vec::new();

  #[cfg(target_os = "windows")]
  {
    for drive in b'A'..=b'Z' {
      let letter = drive as char;
      let path = format!("{letter}:\\");
      let path_ref = Path::new(&path);
      if path_ref.exists() {
        items.push(FsTreeNode {
          name: path.clone(),
          path: path.clone(),
          is_drive: true,
          has_children: has_dir_children(path_ref),
        });
      }
    }
  }

  #[cfg(not(target_os = "windows"))]
  {
    let root = Path::new("/");
    items.push(FsTreeNode {
      name: "/".to_string(),
      path: "/".to_string(),
      is_drive: true,
      has_children: has_dir_children(root),
    });
  }

  Ok(items)
}

#[tauri::command]
pub fn fs_list_children(path: String) -> Result<Vec<FsTreeNode>, String> {
  let path_ref = Path::new(&path);
  let entries = fs::read_dir(path_ref).map_err(|error| format!("read_dir failed for {path}: {error}"))?;
  let mut children: Vec<FsTreeNode> = entries
    .flatten()
    .filter_map(|entry| {
      let entry_path = entry.path();
      if !entry_path.is_dir() {
        return None;
      }
      let full_path = entry_path.to_string_lossy().to_string();
      let name = entry.file_name().to_string_lossy().to_string();
      Some(FsTreeNode {
        name: if name.is_empty() { full_path.clone() } else { name },
        path: full_path,
        is_drive: false,
        has_children: has_dir_children(&entry_path),
      })
    })
    .collect();

  children.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
  Ok(children)
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
pub fn actions_open_parent(state: State<'_, AppState>, path: String) -> Result<ActionResponse, String> {
  let parent = Path::new(&path)
    .parent()
    .and_then(|value| value.to_str())
    .ok_or_else(|| format!("failed to resolve parent for path: {path}"))?
    .to_string();

  match platform::open_path::open_path(&parent) {
    Ok(()) => {
      record_opened_path_if_enabled(&state, parent.clone())?;
      Ok(ActionResponse {
        action: "open_parent".to_string(),
        target: parent,
        success: true,
        message: None,
      })
    }
    Err(error) => Ok(ActionResponse {
      action: "open_parent".to_string(),
      target: parent,
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
