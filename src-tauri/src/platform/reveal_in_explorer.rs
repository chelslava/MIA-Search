use std::path::Path;
use std::process::Command;

pub fn reveal_in_file_manager(path: &str) -> Result<(), String> {
  let path = Path::new(path);
  reveal_with(path, |path| {
    let status = if cfg!(target_os = "windows") {
      Command::new("explorer").arg(format!("/select,{}", path.display())).status()
    } else if cfg!(target_os = "macos") {
      Command::new("open").args(["-R", &path.to_string_lossy()]).status()
    } else {
      let target = path.parent().unwrap_or(path);
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
}
