use std::path::{Component, Path, PathBuf};

pub fn is_safe_path(path: &str) -> bool {
    let dangerous_chars = [
        '&', '|', ';', '$', '`', '\n', '\r', '\0', '(', ')', '<', '>', '!', '#', '%', '^',
    ];
    !path.chars().any(|c| dangerous_chars.contains(&c))
}

fn normalize_for_scheme_check(input: &str) -> String {
    input
        .chars()
        .map(|c| {
            // Convert fullwidth forms (0xFF01..=0xFF5E) to ASCII (0x21..=0x7E)
            let c = if ('\u{FF01}'..='\u{FF5E}').contains(&c) {
                char::from_u32((c as u32) - 0xFEE0).unwrap_or(c)
            } else {
                c
            };
            // Map confusable characters (Cyrillic, Greek, Turkish, special symbols) to ASCII
            match c {
                // Cyrillic homoglyphs
                'а' | 'А' => 'a',
                'в' | 'В' => 'b',
                'с' | 'С' => 'c',
                'е' | 'Е' => 'e',
                'і' | 'І' | 'ї' | 'Ї' => 'i',
                'ј' | 'Ј' => 'j',
                'к' | 'К' => 'k',
                'м' | 'М' => 'm',
                'н' | 'Н' | 'һ' | 'Һ' => 'h',
                'о' | 'О' => 'o',
                'р' | 'Р' => 'p',
                'ѕ' | 'Ѕ' => 's',
                'т' | 'Т' => 't',
                'у' | 'У' => 'y',
                'х' | 'Х' => 'x',
                'ғ' | 'Ғ' => 'f',
                // Greek homoglyphs
                'α' | 'Α' => 'a',
                'β' | 'Β' => 'b',
                'ε' | 'Ε' => 'e',
                'η' | 'Η' => 'h',
                'ι' | 'Ι' => 'i',
                'κ' | 'Κ' => 'k',
                'μ' | 'Μ' => 'm',
                'ν' | 'Ν' => 'v',
                'ο' | 'Ο' => 'o',
                'ρ' | 'Ρ' => 'p',
                'τ' | 'Τ' => 't',
                'υ' | 'Υ' => 'u',
                'χ' | 'Χ' => 'x',
                'σ' | 'ς' | 'Σ' => 's',
                // Turkish dotted / dotless I
                'İ' | 'ı' => 'i',
                // Slash / colon confusables
                '／' | '⁄' | '∕' | '⧸' => '/',
                '：' | 'ː' | '꞉' => ':',
                // Default
                other => other,
            }
        })
        .flat_map(|c| c.to_lowercase())
        .collect()
}

pub fn is_local_path(path: &str) -> bool {
    let lower = normalize_for_scheme_check(path);
    !(lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("ftp://")
        || lower.starts_with("ftps://")
        || lower.starts_with("file://")
        || lower.starts_with("ws://")
        || lower.starts_with("wss://")
        || lower.starts_with("sftp://")
        || lower.starts_with("smb://")
        || lower.starts_with("//"))
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

/// Checks if a path mixes ASCII with confusable non-ASCII characters
/// that could be used for Unicode spoofing attacks.
///
/// Checks each path component (directory/file name) individually to avoid
/// flagging legitimate paths like `C:/пользователь/документы` where structural
/// ASCII elements (drive letter, separators) coexist with pure non-ASCII names.
pub fn has_unicode_spoof(path: &str) -> bool {
    Path::new(path).components().any(|component| {
        if let Component::Normal(name) = component {
            let name = name.to_string_lossy();
            let has_ascii_letter = name.chars().any(|c| c.is_ascii_alphabetic());
            let has_confusable_non_ascii = name.chars().any(|c| {
                matches!(
                    c,
                    // Cyrillic letters that look like Latin
                    'а' | 'А' | 'е' | 'Е' | 'о' | 'О' | 'р' | 'Р' | 'с' | 'С'
                    | 'у' | 'У' | 'х' | 'Х' | 'і' | 'І' | 'ј' | 'Ј' | 'ѕ' | 'Ѕ'
                    | 'т' | 'Т' | 'һ' | 'Һ' | 'ғ' | 'Ғ'
                    // Greek letters that look like Latin
                    | 'α' | 'Α' | 'ε' | 'Ε' | 'η' | 'Η' | 'ι' | 'Ι' | 'ο' | 'Ο'
                    | 'ρ' | 'Ρ' | 'τ' | 'Τ' | 'υ' | 'Υ' | 'σ' | 'ς' | 'Σ'
                    // Fullwidth Latin characters
                    | '\u{FF21}'..='\u{FF3A}' | '\u{FF41}'..='\u{FF5A}'
                )
            });
            has_ascii_letter && has_confusable_non_ascii
        } else {
            false
        }
    })
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
    if has_unicode_spoof(path) {
        return Err(format!(
            "Path contains Unicode spoofing characters: {}",
            path
        ));
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
    if has_unicode_spoof(&canonical_str) {
        return Err(format!(
            "Resolved path contains Unicode spoofing characters: {}",
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
        // Unicode spoofed URLs
        assert!(!is_local_path("ｈｔｔｐ://evil.com/malware.exe"));
        assert!(!is_local_path("ＨＴＴＰＳ://evil.com"));
        assert!(!is_local_path("httр://evil.com")); // Cyrillic 'р'
        assert!(!is_local_path("h\u{0442}\u{0442}p://evil.com")); // Cyrillic 'т'
        assert!(!is_local_path(
            "\u{041D}\u{0422}\u{0422}\u{0420}://evil.com"
        )); // Cyrillic 'НТТР'
        assert!(!is_local_path(
            "\u{0397}\u{03A4}\u{03A4}\u{03A1}://evil.com"
        )); // Greek 'ΗΤΤΡ'
        assert!(!is_local_path("f\u{0130}le:///etc/passwd")); // Turkish dotted 'İ' in file
        assert!(!is_local_path("filе:///etc/passwd")); // Cyrillic 'е'
        assert!(!is_local_path("//evil.com/payload"));
        assert!(!is_local_path("ws://evil.com/socket"));
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

    #[test]
    fn has_unicode_spoof_accepts_ascii_only_paths() {
        assert!(!has_unicode_spoof("C:/safe/path.txt"));
        assert!(!has_unicode_spoof("/home/user/docs/report.pdf"));
    }

    #[test]
    fn has_unicode_spoof_rejects_mixed_script_paths() {
        assert!(has_unicode_spoof("C:/g\u{03BF}\u{03BF}gle.exe"));
        assert!(has_unicode_spoof("/home/user/d\u{0430}ta.csv"));
    }

    #[test]
    fn has_unicode_spoof_accepts_single_script_non_ascii() {
        assert!(!has_unicode_spoof("C:/пользователь/документы"));
        assert!(!has_unicode_spoof("/home/Οδυσσέας/docs"));
    }

    #[test]
    fn has_unicode_spoof_accepts_emoji_in_ascii_paths() {
        assert!(!has_unicode_spoof("/home/user/\u{1F602}.txt"));
        assert!(!has_unicode_spoof("C:/project/\u{2728}.md"));
    }

    #[test]
    fn has_unicode_spoof_rejects_mixed_in_single_component() {
        assert!(has_unicode_spoof("C:/Users/payp\u{0430}l.exe"));
    }
}
