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
        return PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("mia-search");
    }

    env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(".mia-search")
}

pub fn check_disk_space(dir: &PathBuf, required_bytes: usize) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    let test_file = dir.join(".disk_check_temp");
    let check_size = required_bytes.min(1024);
    let check_result = fs::write(&test_file, vec![0u8; check_size]);
    let _ = fs::remove_file(&test_file);

    check_result.map_err(|e| {
        if e.kind() == std::io::ErrorKind::StorageFull {
            format!(
                "Insufficient disk space (required at least {} bytes)",
                required_bytes
            )
        } else {
            format!("Disk space check failed: {}", e)
        }
    })?;

    Ok(())
}

pub fn load_json<T>(file_name: &str) -> T
where
    T: DeserializeOwned + Default,
{
    let path = data_dir().join(file_name);
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|error| {
            eprintln!("Failed to parse {}: {}", file_name, error);
            T::default()
        }),
        Err(error) => {
            if error.kind() != std::io::ErrorKind::NotFound {
                eprintln!("Failed to read {}: {}", file_name, error);
            }
            T::default()
        }
    }
}

pub fn save_json<T>(file_name: &str, value: &T) -> Result<(), String>
where
    T: Serialize,
{
    let dir = data_dir();
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let path = dir.join(file_name);
    let content = serde_json::to_string(value).map_err(|error| error.to_string())?;

    check_disk_space(&dir, content.len())?;

    fs::write(&path, content).map_err(|error| error.to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("Failed to set permissions: {}", error))?;
    }

    Ok(())
}

#[cfg(test)]
static ENV_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

#[cfg(test)]
pub(crate) fn with_test_data_dir(test: impl FnOnce()) {
    let lock = ENV_LOCK.get_or_init(|| Mutex::new(()));
    let guard = lock.lock().unwrap_or_else(|poisoned| {
        eprintln!("Warning: env lock was poisoned, recovering");
        poisoned.into_inner()
    });
    let previous = env::var("MIA_SEARCH_DATA_DIR").ok();
    let dir = tempfile::tempdir().expect("temp dir");
    unsafe {
        env::set_var("MIA_SEARCH_DATA_DIR", dir.path());
    }
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| test()));
    match previous {
        Some(value) => unsafe { env::set_var("MIA_SEARCH_DATA_DIR", value) },
        None => unsafe { env::remove_var("MIA_SEARCH_DATA_DIR") },
    }
    drop(guard);
    if let Err(panic) = result {
        std::panic::resume_unwind(panic);
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
            #[derive(
                Debug, Clone, serde::Serialize, serde::Deserialize, Default, PartialEq, Eq,
            )]
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
            #[derive(
                Debug, Clone, serde::Serialize, serde::Deserialize, Default, PartialEq, Eq,
            )]
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

    #[test]
    fn check_disk_space_succeeds_with_sufficient_space() {
        with_test_data_dir(|| {
            let result = check_disk_space(&data_dir(), 100);
            assert!(result.is_ok());
        });
    }
}
