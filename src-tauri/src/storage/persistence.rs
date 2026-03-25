use serde::{de::DeserializeOwned, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;
#[cfg(test)]
use std::sync::{Mutex, OnceLock};

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

#[cfg(test)]
static ENV_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

#[cfg(test)]
pub(crate) fn with_test_data_dir(test: impl FnOnce()) {
  let lock = ENV_LOCK.get_or_init(|| Mutex::new(()));
  let _guard = lock.lock().expect("env lock poisoned");
  let previous = env::var("MIA_SEARCH_DATA_DIR").ok();
  let dir = tempfile::tempdir().expect("temp dir");
  unsafe {
    env::set_var("MIA_SEARCH_DATA_DIR", dir.path());
  }
  test();
  match previous {
    Some(value) => unsafe { env::set_var("MIA_SEARCH_DATA_DIR", value) },
    None => unsafe { env::remove_var("MIA_SEARCH_DATA_DIR") },
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn data_dir_uses_explicit_env_override() {
    with_test_data_dir(|| {
      let path = data_dir();
      assert!(!path.as_os_str().is_empty());
      assert!(path.exists() || !path.exists());
    });
  }

  #[test]
  fn load_json_returns_default_for_missing_or_invalid_file() {
    with_test_data_dir(|| {
      #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default, PartialEq, Eq)]
      struct Snapshot {
        value: String,
      }

      let loaded_missing: Snapshot = load_json("missing.json");
      assert_eq!(loaded_missing, Snapshot::default());

      let path = data_dir().join("invalid.json");
      fs::create_dir_all(data_dir()).expect("create dir");
      fs::write(path, "{ invalid json").expect("write invalid");
      let loaded_invalid: Snapshot = load_json("invalid.json");
      assert_eq!(loaded_invalid, Snapshot::default());
    });
  }

  #[test]
  fn save_and_load_roundtrip_json() {
    with_test_data_dir(|| {
      #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default, PartialEq, Eq)]
      struct Snapshot {
        value: String,
      }

      let value = Snapshot {
        value: "ok".to_string(),
      };
      save_json("roundtrip.json", &value).expect("save should work");
      let loaded: Snapshot = load_json("roundtrip.json");
      assert_eq!(loaded, value);
    });
  }
}
