use std::path::{Component, Path, PathBuf};

pub fn is_safe_path(path: &str) -> bool {
    let dangerous_chars = [
        '&', '|', ';', '$', '`', '\n', '\r', '\0', '(', ')', '<', '>', '!', '#', '%', '^',
    ];
    !path.chars().any(|c| dangerous_chars.contains(&c))
}

pub fn is_local_path(path: &str) -> bool {
    let lower = path.to_lowercase();
    !(lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("ftp://")
        || lower.starts_with("file://"))
}

pub fn has_path_traversal(path: &str) -> bool {
    Path::new(path)
        .components()
        .any(|c| matches!(c, Component::ParentDir))
}

pub fn is_symlink(path: &Path) -> bool {
    path.symlink_metadata()
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false)
}

pub fn validate_path_for_read(path: &str) -> Result<PathBuf, String> {
    if !is_local_path(path) {
        return Err(format!("Refusing to read non-local path: {}", path));
    }
    if !is_safe_path(path) {
        return Err(format!("Path contains unsafe characters: {}", path));
    }
    if has_path_traversal(path) {
        return Err(format!("Path contains traversal sequences: {}", path));
    }

    let path_ref = Path::new(path);
    if is_symlink(path_ref) {
        return Err(format!("Refusing to follow symlink: {}", path));
    }

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

    Ok(canonical)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_safe_path_accepts_valid_paths() {
        assert!(is_safe_path("C:/safe/path.txt"));
        assert!(is_safe_path("/home/user/document.pdf"));
        assert!(is_safe_path("./relative/path"));
    }

    #[test]
    fn is_safe_path_rejects_shell_metacharacters() {
        assert!(!is_safe_path("C:/path&whoami"));
        assert!(!is_safe_path("C:/path|cmd"));
        assert!(!is_safe_path("C:/path;rm"));
        assert!(!is_safe_path("C:/path$(id)"));
        assert!(!is_safe_path("C:/path`id`"));
        assert!(!is_safe_path("C:/path(subshell)"));
        assert!(!is_safe_path("C:/path<redirect"));
        assert!(!is_safe_path("C:/path>redirect"));
        assert!(!is_safe_path("C:/path!history"));
        assert!(!is_safe_path("C:/path#comment"));
        assert!(!is_safe_path("C:/path%VAR%"));
        assert!(!is_safe_path("C:/path^escape"));
    }

    #[test]
    fn is_safe_path_accepts_windows_short_paths() {
        assert!(is_safe_path("C:\\Users\\RUNNER~1\\AppData"));
        assert!(is_safe_path("C:/path~home"));
    }

    #[test]
    fn is_safe_path_rejects_newlines_and_null() {
        assert!(!is_safe_path("C:/path\ninjection"));
        assert!(!is_safe_path("C:/path\rinjection"));
        assert!(!is_safe_path("C:/path\0null"));
    }

    #[test]
    fn is_local_path_accepts_local_paths() {
        assert!(is_local_path("C:/local/file.txt"));
        assert!(is_local_path("/home/user/doc.pdf"));
        assert!(is_local_path("./relative/path"));
    }

    #[test]
    fn is_local_path_rejects_urls() {
        assert!(!is_local_path("https://evil.com/malware.exe"));
        assert!(!is_local_path("http://example.com/file"));
        assert!(!is_local_path("ftp://server/file"));
        assert!(!is_local_path("file:///etc/passwd"));
    }

    #[test]
    fn has_path_traversal_detects_parent_dir() {
        assert!(has_path_traversal("../etc/passwd"));
        assert!(has_path_traversal("C:/safe/../windows/system32"));
        assert!(has_path_traversal("/home/user/../../root"));
    }

    #[test]
    fn has_path_traversal_accepts_normal_paths() {
        assert!(!has_path_traversal("C:/safe/path.txt"));
        assert!(!has_path_traversal("/home/user/documents"));
        assert!(!has_path_traversal("./relative/path"));
    }

    #[test]
    fn validate_path_rejects_non_local_paths() {
        let result = validate_path_for_read("https://evil.com/malware.exe");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("non-local path"));
    }

    #[test]
    fn validate_path_rejects_unsafe_characters() {
        let result = validate_path_for_read("C:/path&whoami");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("unsafe characters"));
    }

    #[test]
    fn validate_path_rejects_traversal() {
        let result = validate_path_for_read("../etc/passwd");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("traversal"));
    }

    #[test]
    fn validate_path_rejects_nonexistent_path() {
        let result = validate_path_for_read("/nonexistent/path/that/does/not/exist");
        assert!(result.is_err());
    }
}
