use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentMatch {
    pub path: String,
    pub line_number: usize,
    pub line_content: String,
    pub match_start: usize,
    pub match_end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentSearchResult {
    pub path: String,
    pub matches: Vec<ContentMatch>,
    pub total_matches: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentSearchResponse {
    pub results: Vec<ContentSearchResult>,
    pub total_files: usize,
    pub total_matches: usize,
    pub searched_paths: usize,
    pub errors: Vec<String>,
}

pub struct ContentSearchService;

impl ContentSearchService {
    const MAX_LINE_LENGTH: usize = 10000;
    const MAX_CONTENT_BYTES: usize = 10 * 1024 * 1024;
    const MAX_MATCHES_PER_FILE: usize = 1000;

    pub fn search_in_content(
        paths: &[String],
        query: &str,
        case_sensitive: bool,
        whole_word: bool,
        regex: bool,
    ) -> ContentSearchResponse {
        if query.is_empty() {
            return ContentSearchResponse {
                results: vec![],
                total_files: 0,
                total_matches: 0,
                searched_paths: paths.len(),
                errors: vec![],
            };
        }
        let mut results = Vec::new();
        let mut total_matches = 0;
        let mut errors = Vec::new();
        let query = if case_sensitive {
            query.to_string()
        } else {
            query.to_lowercase()
        };

        for path in paths {
            match Self::search_file(path, &query, case_sensitive, whole_word, regex) {
                Ok(result) => {
                    if result.total_matches > 0 {
                        total_matches += result.total_matches;
                        results.push(result);
                    }
                }
                Err(e) => {
                    if !e.contains("not a file") && !e.contains("permission denied") {
                        errors.push(format!("{}: {}", path, e));
                    }
                }
            }
        }

        let total_files = results.len();
        ContentSearchResponse {
            total_files,
            total_matches,
            searched_paths: paths.len(),
            results,
            errors,
        }
    }

    fn search_file(
        path: &str,
        query: &str,
        case_sensitive: bool,
        whole_word: bool,
        _regex: bool,
    ) -> Result<ContentSearchResult, String> {
        let path_ref = Path::new(path);
        
        if !path_ref.exists() {
            return Err("File not found".to_string());
        }
        
        if !path_ref.is_file() {
            return Err("Not a file".to_string());
        }

        let metadata = std::fs::metadata(path_ref)
            .map_err(|e| format!("Cannot read metadata: {}", e))?;
        
        if metadata.len() > Self::MAX_CONTENT_BYTES as u64 {
            return Err("File too large".to_string());
        }

        let content = std::fs::read_to_string(path_ref)
            .map_err(|e| format!("Cannot read file: {}", e))?;

        let search_query = if case_sensitive {
            query.to_string()
        } else {
            query.to_lowercase()
        };

        let mut matches = Vec::new();
        let mut match_count = 0;

        for (line_idx, line) in content.lines().enumerate() {
            let search_line = if case_sensitive {
                line.to_string()
            } else {
                line.to_lowercase()
            };

            let mut start = 0;
            while let Some(pos) = search_line[start..].find(&search_query) {
                let abs_pos = start + pos;
                
                if whole_word {
                    let before_ok = abs_pos == 0 || !search_line.chars().nth(abs_pos - 1).map_or(false, |c| c.is_alphanumeric());
                    let after_pos = abs_pos + search_query.len();
                    let after_ok = after_pos >= search_line.len() || !search_line.chars().nth(after_pos).map_or(false, |c| c.is_alphanumeric());
                    
                    if !before_ok || !after_ok {
                        start = abs_pos + 1;
                        continue;
                    }
                }

                matches.push(ContentMatch {
                    path: path.to_string(),
                    line_number: line_idx + 1,
                    line_content: line.chars().take(Self::MAX_LINE_LENGTH).collect(),
                    match_start: abs_pos,
                    match_end: abs_pos + search_query.len(),
                });

                match_count += 1;
                if match_count >= Self::MAX_MATCHES_PER_FILE {
                    break;
                }

                start = abs_pos + 1;
            }

            if match_count >= Self::MAX_MATCHES_PER_FILE {
                break;
            }
        }

        let total_matches = matches.len();
        Ok(ContentSearchResult {
            path: path.to_string(),
            matches,
            total_matches,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn search_finds_matches_in_file() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("test.txt");
        std::fs::write(&file, "Hello World\nRust is great\nHello again").unwrap();

        let result = ContentSearchService::search_in_content(
            &[file.to_string_lossy().to_string()],
            "Hello",
            false,
            false,
            false,
        );

        assert_eq!(result.total_files, 1);
        assert_eq!(result.total_matches, 2);
        assert_eq!(result.results[0].matches.len(), 2);
    }

    #[test]
    fn search_respects_case_sensitive() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("test.txt");
        std::fs::write(&file, "Hello hello HELLO").unwrap();

        let case_insensitive = ContentSearchService::search_in_content(
            &[file.to_string_lossy().to_string()],
            "hello",
            false,
            false,
            false,
        );
        assert_eq!(case_insensitive.total_matches, 3);

        let case_sensitive = ContentSearchService::search_in_content(
            &[file.to_string_lossy().to_string()],
            "hello",
            true,
            false,
            false,
        );
        assert_eq!(case_sensitive.total_matches, 1);
    }

    #[test]
    fn search_whole_word() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("test.txt");
        std::fs::write(&file, "cat catalog category").unwrap();

        let result = ContentSearchService::search_in_content(
            &[file.to_string_lossy().to_string()],
            "cat",
            true,
            true,
            false,
        );
        assert_eq!(result.total_matches, 1);
    }

    #[test]
    fn search_returns_line_numbers() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("test.txt");
        std::fs::write(&file, "Line 1\nLine 2\nLine 3").unwrap();

        let result = ContentSearchService::search_in_content(
            &[file.to_string_lossy().to_string()],
            "Line 2",
            true,
            false,
            false,
        );

        assert_eq!(result.results[0].matches[0].line_number, 2);
    }

    #[test]
    fn search_handles_empty_query() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("test.txt");
        std::fs::write(&file, "Hello World").unwrap();

        let result = ContentSearchService::search_in_content(
            &[file.to_string_lossy().to_string()],
            "",
            false,
            false,
            false,
        );
        assert_eq!(result.total_matches, 0);
        assert_eq!(result.total_files, 0);
    }

    #[test]
    fn search_handles_missing_file() {
        let result = ContentSearchService::search_in_content(
            &["/nonexistent/file.txt".to_string()],
            "test",
            false,
            false,
            false,
        );
        assert_eq!(result.total_files, 0);
        assert!(result.errors.contains(&"/nonexistent/file.txt: File not found".to_string()));
    }

    #[test]
    fn search_handles_directory() {
        let dir = tempdir().unwrap();
        
        let result = ContentSearchService::search_in_content(
            &[dir.path().to_string_lossy().to_string()],
            "test",
            false,
            false,
            false,
        );
        assert_eq!(result.total_files, 0);
    }

    #[test]
    fn search_multiple_files() {
        let dir = tempdir().unwrap();
        let file1 = dir.path().join("file1.txt");
        let file2 = dir.path().join("file2.txt");
        std::fs::write(&file1, "Hello World").unwrap();
        std::fs::write(&file2, "Hello Rust").unwrap();

        let result = ContentSearchService::search_in_content(
            &[
                file1.to_string_lossy().to_string(),
                file2.to_string_lossy().to_string(),
            ],
            "Hello",
            false,
            false,
            false,
        );

        assert_eq!(result.total_files, 2);
        assert_eq!(result.total_matches, 2);
        assert_eq!(result.searched_paths, 2);
    }
}
