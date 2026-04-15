use super::path_security::{has_path_traversal, is_local_path, is_safe_path, is_symlink};
use std::path::Path;
use std::process::Command;

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
        return Err(format!(
            "Resolved path contains unsafe characters: {}",
            canonical_str
        ));
    }
    if has_path_traversal(&canonical_str) {
        return Err(format!(
            "Resolved path contains traversal sequences: {}",
            canonical_str
        ));
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

fn open_path_with(
    path: &str,
    runner: impl FnOnce(&str) -> Result<bool, String>,
) -> Result<(), String> {
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
