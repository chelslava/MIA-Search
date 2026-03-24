use std::path::Path;
use std::process::Command;

pub fn reveal_in_file_manager(path: &str) -> Result<(), String> {
  let path = Path::new(path);
  let status = if cfg!(target_os = "windows") {
    Command::new("explorer").arg(format!("/select,{}", path.display())).status()
  } else if cfg!(target_os = "macos") {
    Command::new("open").args(["-R", &path.to_string_lossy()]).status()
  } else {
    let target = path.parent().unwrap_or(path);
    Command::new("xdg-open").arg(target).status()
  }
  .map_err(|error| error.to_string())?;

  if status.success() {
    Ok(())
  } else {
    Err(format!("failed to reveal path: {}", path.display()))
  }
}
