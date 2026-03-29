use std::path::Path;
use std::process::Command;

fn is_safe_path(path: &str) -> bool {
  let dangerous_chars = ['&', '|', ';', '$', '`', '\n', '\r', '\0'];
  !path.chars().any(|c| dangerous_chars.contains(&c))
}

pub fn reveal_in_file_manager(path: &str) -> Result<(), String> {
  if !is_safe_path(path) {
    return Err(format!("Path contains unsafe characters: {}", path));
  }

  let canonical = Path::new(path)
    .canonicalize()
    .map_err(|error| format!("Invalid path {}: {}", path, error))?;

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
}
