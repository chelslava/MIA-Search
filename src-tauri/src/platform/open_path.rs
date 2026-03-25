use std::process::Command;

pub fn open_path(path: &str) -> Result<(), String> {
  open_path_with(path, |path| {
    let status = if cfg!(target_os = "windows") {
      Command::new("cmd")
        .args(["/C", "start", "", path])
        .status()
    } else if cfg!(target_os = "macos") {
      Command::new("open").arg(path).status()
    } else {
      Command::new("xdg-open").arg(path).status()
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
}
