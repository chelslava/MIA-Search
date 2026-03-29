use crate::{commands::history::record_opened_path_if_enabled, platform, platform::path_security::validate_path_for_read, AppState};
use rfd::FileDialog;
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
    Err(error) => {
      eprintln!("Failed to read directory {}: {}", path.display(), error);
      false
    }
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
  let canonical = validate_path_for_read(&path)?;
  let entries = fs::read_dir(&canonical).map_err(|error| format!("read_dir failed for {}: {}", path, error))?;
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
pub fn fs_pick_folder() -> Result<Option<String>, String> {
  Ok(
    FileDialog::new()
      .pick_folder()
      .map(|path_buf| path_buf.to_string_lossy().to_string()),
  )
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
  let parent = resolve_parent_path(&path)?;

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

fn resolve_parent_path(path: &str) -> Result<String, String> {
  Path::new(path)
    .parent()
    .and_then(|value| value.to_str())
    .ok_or_else(|| format!("failed to resolve parent for path: {path}"))
    .map(|value| value.to_string())
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs::{create_dir_all, File};
  use tempfile::tempdir;

  #[test]
  fn resolve_parent_path_handles_valid_and_invalid_input() {
    let parent = resolve_parent_path("C:/dir/file.txt").expect("parent");
    assert!(!parent.is_empty());

    let error = resolve_parent_path("").unwrap_err();
    assert!(error.contains("failed to resolve parent"));
  }

  #[test]
  fn fs_list_children_returns_only_directories_sorted() {
    let dir = tempdir().expect("tempdir");
    let alpha = dir.path().join("Alpha");
    let zeta = dir.path().join("zeta");
    let file = dir.path().join("note.txt");
    create_dir_all(&zeta).expect("mkdir zeta");
    create_dir_all(&alpha).expect("mkdir alpha");
    File::create(file).expect("create file");

    let children = fs_list_children(dir.path().to_string_lossy().to_string()).expect("children");
    let names: Vec<String> = children.iter().map(|item| item.name.clone()).collect();
    assert_eq!(names, vec!["Alpha".to_string(), "zeta".to_string()]);
    assert!(children.iter().all(|item| !item.path.ends_with("note.txt")));
  }

  #[test]
  fn fs_list_children_returns_error_for_missing_path() {
    let result = fs_list_children("Z:/this/path/should/not/exist".to_string());
    assert!(result.is_err());
  }

  #[test]
  fn fs_list_roots_returns_non_empty_list() {
    let roots = fs_list_roots().expect("roots");
    assert!(!roots.is_empty());
  }
}
