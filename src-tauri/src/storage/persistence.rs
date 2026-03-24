use serde::{de::DeserializeOwned, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;

pub fn data_dir() -> PathBuf {
  if let Ok(value) = env::var("MIA_SEARCH_DATA_DIR") {
    let path = PathBuf::from(value);
    if !path.as_os_str().is_empty() {
      return path;
    }
  }

  if cfg!(target_os = "windows") {
    if let Ok(base) = env::var("LOCALAPPDATA") {
      return PathBuf::from(base).join("MIA-Search");
    }
    if let Ok(base) = env::var("APPDATA") {
      return PathBuf::from(base).join("MIA-Search");
    }
  } else if cfg!(target_os = "macos") {
    if let Ok(home) = env::var("HOME") {
      return PathBuf::from(home)
        .join("Library")
        .join("Application Support")
        .join("MIA-Search");
    }
  } else if let Ok(base) = env::var("XDG_DATA_HOME") {
    return PathBuf::from(base).join("mia-search");
  } else if let Ok(home) = env::var("HOME") {
    return PathBuf::from(home).join(".local").join("share").join("mia-search");
  }

  env::current_dir()
    .unwrap_or_else(|_| PathBuf::from("."))
    .join(".mia-search")
}

pub fn load_json<T>(file_name: &str) -> T
where
  T: DeserializeOwned + Default,
{
  let path = data_dir().join(file_name);
  match fs::read_to_string(path) {
    Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
    Err(_) => T::default(),
  }
}

pub fn save_json<T>(file_name: &str, value: &T) -> Result<(), String>
where
  T: Serialize,
{
  let dir = data_dir();
  fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
  let path = dir.join(file_name);
  let content = serde_json::to_string_pretty(value).map_err(|error| error.to_string())?;
  fs::write(path, content).map_err(|error| error.to_string())
}
