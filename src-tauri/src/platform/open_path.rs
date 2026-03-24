use std::process::Command;

pub fn open_path(path: &str) -> Result<(), String> {
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

  if status.success() {
    Ok(())
  } else {
    Err(format!("failed to open path: {path}"))
  }
}
