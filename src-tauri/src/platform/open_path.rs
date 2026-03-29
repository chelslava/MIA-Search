use super::path_security::{is_local_path, is_symlink};
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

pub fn open_path(path: &str) -> Result<(), String> {
  if !is_local_path(path) {
    return Err(format!("Refusing to open non-local path: {}", path));
  }
  if !is_safe_path(path) {
    return Err(format!("Path contains unsafe characters: {}", path));
  }
  if has_path_traversal(path) {
    return Err(format!("Path contains traversal sequences: {}", path));
  }

  let path_ref = Path::new(path);
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

  open_path_with(&canonical.to_string_lossy(), |safe_path| {
    let status = if cfg!(target_os = "windows") {
      Command::new("cmd")
        .args(["/C", "start", "", "", safe_path])
        .status()
    } else if cfg!(target_os = "macos") {
      Command::new("open").arg(safe_path).status()
    } else {
      Command::new("xdg-open").arg(safe_path).status()
    }
    .map_err(|error| error.to_string())?;
    Ok(status.success())
  })
}

fn open_path_with(path: &str, runner: impl FnOnce(&str) -> Result<bool, String>) -> Result<(), String> {
  if runner(path)? {
    Ok(())
  } else {
    Err(format!("failed to open path: {path}"))
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn open_path_with_reports_success_and_failure() {
    assert!(open_path_with("C:/ok", |_p| Ok(true)).is_ok());
    assert!(open_path_with("C:/bad", |_p| Ok(false)).is_err());
  }

  #[test]
  fn open_path_with_propagates_runner_error() {
    let result = open_path_with("C:/x", |_p| Err("runner failed".to_string()));
    assert_eq!(result.unwrap_err(), "runner failed");
  }

  #[test]
  fn is_safe_path_rejects_shell_metacharacters() {
    assert!(is_safe_path("C:/safe/path.txt"));
    assert!(is_safe_path("/home/user/document.pdf"));
    assert!(!is_safe_path("C:/path&whoami"));
    assert!(!is_safe_path("C:/path|cmd"));
    assert!(!is_safe_path("C:/path;rm -rf"));
    assert!(!is_safe_path("C:/path$(whoami)"));
    assert!(!is_safe_path("C:/path`whoami`"));
  }

  #[test]
  fn is_local_path_rejects_urls() {
    assert!(is_local_path("C:/local/file.txt"));
    assert!(is_local_path("/home/user/doc.pdf"));
    assert!(!is_local_path("https://evil.com/malware.exe"));
    assert!(!is_local_path("http://example.com/file"));
    assert!(!is_local_path("ftp://server/file"));
    assert!(!is_local_path("file:///etc/passwd"));
  }

  #[test]
  fn has_path_traversal_detects_parent_dir() {
    assert!(has_path_traversal("../etc/passwd"));
    assert!(has_path_traversal("C:/safe/../windows/system32"));
    assert!(has_path_traversal("/home/user/../../root"));
    assert!(!has_path_traversal("C:/safe/path.txt"));
    assert!(!has_path_traversal("/home/user/documents"));
  }

  #[test]
  fn is_safe_path_rejects_newlines_and_null() {
    assert!(!is_safe_path("C:/path\ninjection"));
    assert!(!is_safe_path("C:/path\rinjection"));
    assert!(!is_safe_path("C:/path\0null"));
  }

  #[test]
  fn open_path_rejects_non_local_paths() {
    let result = open_path("https://evil.com/malware.exe");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("non-local path"));
  }

  #[test]
  fn open_path_rejects_unsafe_characters() {
    let result = open_path("C:/path&whoami");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("unsafe characters"));
  }

  #[test]
  fn open_path_rejects_path_traversal() {
    let result = open_path("../etc/passwd");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("traversal"));
  }

  #[test]
  fn open_path_rejects_nonexistent_path() {
    let result = open_path("/nonexistent/path/that/does/not/exist");
    assert!(result.is_err());
  }
}
