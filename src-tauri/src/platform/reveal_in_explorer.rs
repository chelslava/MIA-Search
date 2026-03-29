use super::path_security::is_symlink;
use std::path::{Component, Path};
use std::process::Command;

fn is_safe_path(path: &str) -> bool {
  let dangerous_chars = ['&', '|', ';', '$', '`', '\n', '\r', '\0'];
  !path.chars().any(|c| dangerous_chars.contains(&c))
}

fn has_path_traversal(path: &str) -> bool {
  Path::new(path)
    .components()
    .any(|c| matches!(c, Component::ParentDir))
}

pub fn reveal_in_file_manager(path: &str) -> Result<(), String> {
  if !is_safe_path(path) {
    return Err(format!("Path contains unsafe characters: {}", path));
  }
  if has_path_traversal(path) {
    return Err(format!("Path contains traversal sequences: {}", path));
  }

  let path_ref = Path::new(path);
  if is_symlink(path_ref) {
    return Err(format!("Refusing to follow symlink: {}", path));
  }

  let canonical = path_ref
    .canonicalize()
    .map_err(|error| format!("Invalid path {}: {}", path, error))?;

  let canonical_str = canonical.to_string_lossy();
  if !is_safe_path(&canonical_str) {
    return Err(format!("Resolved path contains unsafe characters: {}", canonical_str));
  }
  if has_path_traversal(&canonical_str) {
    return Err(format!("Resolved path contains traversal sequences: {}", canonical_str));
  }
  if is_symlink(&canonical) {
    return Err(format!("Resolved path is a symlink: {}", canonical_str));
  }

  reveal_with(&canonical, |safe_path| {
    let status = if cfg!(target_os = "windows") {
      Command::new("explorer")
        .args(["/select,", &safe_path.to_string_lossy()])
        .status()
    } else if cfg!(target_os = "macos") {
      Command::new("open")
        .args(["-R", &safe_path.to_string_lossy()])
        .status()
    } else {
      let target = safe_path.parent().unwrap_or(safe_path);
      Command::new("xdg-open").arg(target).status()
    }
    .map_err(|error| error.to_string())?;
    Ok(status.success())
  })
}

fn reveal_with(path: &Path, runner: impl FnOnce(&Path) -> Result<bool, String>) -> Result<(), String> {
  if runner(path)? {
    Ok(())
  } else {
    Err(format!("failed to reveal path: {}", path.display()))
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn reveal_with_reports_success_and_failure() {
    let path = Path::new("C:/tmp/file.txt");
    assert!(reveal_with(path, |_p| Ok(true)).is_ok());
    assert!(reveal_with(path, |_p| Ok(false)).is_err());
  }

  #[test]
  fn reveal_with_propagates_runner_error() {
    let path = Path::new("C:/tmp/file.txt");
    let result = reveal_with(path, |_p| Err("runner failed".to_string()));
    assert_eq!(result.unwrap_err(), "runner failed");
  }

  #[test]
  fn is_safe_path_rejects_shell_metacharacters() {
    assert!(is_safe_path("C:/safe/path.txt"));
    assert!(!is_safe_path("C:/path&whoami"));
    assert!(!is_safe_path("C:/path|cmd"));
    assert!(!is_safe_path("C:/path;rm"));
    assert!(!is_safe_path("C:/path$(id)"));
  }

  #[test]
  fn has_path_traversal_detects_parent_dir() {
    assert!(has_path_traversal("../etc/passwd"));
    assert!(has_path_traversal("C:/safe/../windows"));
    assert!(!has_path_traversal("C:/safe/path.txt"));
  }

  #[test]
  fn is_safe_path_rejects_newlines_and_null() {
    assert!(!is_safe_path("C:/path\ninjection"));
    assert!(!is_safe_path("C:/path\rinjection"));
    assert!(!is_safe_path("C:/path\0null"));
  }

  #[test]
  fn reveal_rejects_unsafe_characters() {
    let result = reveal_in_file_manager("C:/path&whoami");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("unsafe characters"));
  }

  #[test]
  fn reveal_rejects_path_traversal() {
    let result = reveal_in_file_manager("../etc/passwd");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("traversal"));
  }

  #[test]
  fn reveal_rejects_nonexistent_path() {
    let result = reveal_in_file_manager("/nonexistent/path/that/does/not/exist");
    assert!(result.is_err());
  }
}
