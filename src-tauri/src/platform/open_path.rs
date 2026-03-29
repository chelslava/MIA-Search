use std::path::Path;
use std::process::Command;

fn is_safe_path(path: &str) -> bool {
  let dangerous_chars = ['&', '|', ';', '$', '`', '\n', '\r', '\0'];
  !path.chars().any(|c| dangerous_chars.contains(&c))
}

fn is_local_path(path: &str) -> bool {
  let lower = path.to_lowercase();
  !(lower.starts_with("http://")
    || lower.starts_with("https://")
    || lower.starts_with("ftp://")
    || lower.starts_with("file://"))
}

pub fn open_path(path: &str) -> Result<(), String> {
  if !is_local_path(path) {
    return Err(format!("Refusing to open non-local path: {}", path));
  }
  if !is_safe_path(path) {
    return Err(format!("Path contains unsafe characters: {}", path));
  }

  let canonical = Path::new(path)
    .canonicalize()
    .map_err(|error| format!("Invalid path {}: {}", path, error))?;

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
}
