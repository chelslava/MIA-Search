use lru::LruCache;
use regex::Regex;
use std::cell::RefCell;
use std::path::Path;

use crate::core::constants::{MAX_REGEX_PATTERN_LENGTH, MAX_WILDCARD_COUNT, REGEX_CACHE_SIZE};
use crate::core::models::MatchMode;

thread_local! {
  static REGEX_CACHE: RefCell<LruCache<String, Regex>> = RefCell::new(LruCache::new(
    std::num::NonZeroUsize::new(REGEX_CACHE_SIZE).unwrap()
  ));
}

#[derive(Debug)]
pub enum QueryMatcher {
    MatchAll,
    Plain {
        query: String,
        query_lower: Option<String>,
        ignore_case: bool,
    },
    Regex {
        regex: Regex,
    },
}

impl QueryMatcher {
    /// Matches against arbitrary text (used by index_service).
    pub fn matches(&self, text: &str) -> bool {
        match self {
            Self::MatchAll => true,
            Self::Plain {
                query,
                query_lower,
                ignore_case,
            } => {
                if *ignore_case {
                    let query_lower = query_lower.as_deref().unwrap_or(query);
                    text.to_lowercase().contains(query_lower)
                } else {
                    text.contains(query)
                }
            }
            Self::Regex { regex } => regex.is_match(text),
        }
    }

    /// Matches against a file path, checking both the file name and full path (used by search_service).
    /// For plain mode, matches if the query is found in either the file name or the full path.
    /// For regex mode, matches against the full path.
    pub fn matches_path(&self, path: &str) -> bool {
        match self {
            Self::MatchAll => true,
            Self::Plain {
                query,
                query_lower,
                ignore_case,
            } => {
                let name = Path::new(path)
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or(path);
                if *ignore_case {
                    let query_lower = query_lower.as_deref().unwrap_or(query);
                    name.to_ascii_lowercase().contains(query_lower)
                        || path.to_ascii_lowercase().contains(query_lower)
                } else {
                    name.contains(query) || path.contains(query)
                }
            }
            Self::Regex { regex } => regex.is_match(path),
        }
    }
}

pub fn build_query_matcher(
    mode: &MatchMode,
    query: &str,
    ignore_case: bool,
) -> Result<QueryMatcher, String> {
    if query.is_empty() {
        return Ok(QueryMatcher::MatchAll);
    }

    match mode {
        MatchMode::Plain => Ok(QueryMatcher::Plain {
            query: query.to_string(),
            query_lower: ignore_case.then(|| query.to_lowercase()),
            ignore_case,
        }),
        MatchMode::Regex => {
            if query.len() > MAX_REGEX_PATTERN_LENGTH {
                return Err(format!(
                    "Regex pattern too long: {} chars (max {})",
                    query.len(),
                    MAX_REGEX_PATTERN_LENGTH
                ));
            }
            let pattern = if ignore_case {
                format!("(?i){query}")
            } else {
                query.to_string()
            };
            let regex = get_or_compile_regex(&pattern)?;
            Ok(QueryMatcher::Regex { regex })
        }
        MatchMode::Wildcard => {
            let wildcard_count = query.chars().filter(|&c| c == '*' || c == '?').count();
            if wildcard_count > MAX_WILDCARD_COUNT {
                return Err(format!(
                    "Too many wildcard characters: {} (max {})",
                    wildcard_count, MAX_WILDCARD_COUNT
                ));
            }
            let escaped_len: usize = query
                .chars()
                .map(|c| {
                    if c == '*' || c == '?' {
                        0
                    } else {
                        regex::escape(&c.to_string()).len()
                    }
                })
                .sum();
            let mut pattern = String::with_capacity(1 + wildcard_count + escaped_len + 1);
            pattern.push('^');
            for ch in query.chars() {
                match ch {
                    '*' => pattern.push_str(".*"),
                    '?' => pattern.push('.'),
                    _ => pattern.push_str(&regex::escape(&ch.to_string())),
                }
            }
            pattern.push('$');
            let pattern = if ignore_case {
                format!("(?i){pattern}")
            } else {
                pattern
            };
            let regex = get_or_compile_regex(&pattern)?;
            Ok(QueryMatcher::Regex { regex })
        }
    }
}

fn get_or_compile_regex(pattern: &str) -> Result<Regex, String> {
    REGEX_CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        if let Some(regex) = cache.get(pattern).cloned() {
            return Ok(regex);
        }
        let regex = Regex::new(pattern).map_err(|error| format!("regex parse error: {error}"))?;
        cache.put(pattern.to_string(), regex.clone());
        Ok(regex)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn match_all_matches_everything() {
        let matcher = QueryMatcher::MatchAll;
        assert!(matcher.matches("anything"));
        assert!(matcher.matches(""));
    }

    #[test]
    fn plain_matcher_case_sensitive() {
        let matcher = QueryMatcher::Plain {
            query: "Test".to_string(),
            query_lower: None,
            ignore_case: false,
        };
        assert!(matcher.matches("Test file"));
        assert!(!matcher.matches("test file"));
    }

    #[test]
    fn plain_matcher_ignore_case() {
        let matcher = QueryMatcher::Plain {
            query: "test".to_string(),
            query_lower: Some("test".to_string()),
            ignore_case: true,
        };
        assert!(matcher.matches("Test file"));
        assert!(matcher.matches("test file"));
        assert!(matcher.matches("TEST FILE"));
    }

    #[test]
    fn build_query_matcher_empty_query_matches_all() {
        let matcher = build_query_matcher(&MatchMode::Plain, "", true).unwrap();
        assert!(matches!(matcher, QueryMatcher::MatchAll));
    }

    #[test]
    fn build_query_matcher_plain() {
        let matcher = build_query_matcher(&MatchMode::Plain, "test", false).unwrap();
        assert!(matcher.matches("test file"));
        assert!(!matcher.matches("Test File"));
    }

    #[test]
    fn build_query_matcher_plain_ignore_case() {
        let matcher = build_query_matcher(&MatchMode::Plain, "Test", true).unwrap();
        assert!(matcher.matches("test file"));
        assert!(matcher.matches("TEST FILE"));
    }

    #[test]
    fn build_query_matcher_wildcard() {
        let matcher = build_query_matcher(&MatchMode::Wildcard, "*.txt", true).unwrap();
        assert!(matcher.matches("file.txt"));
        assert!(matcher.matches("document.TXT"));
        assert!(!matcher.matches("file.pdf"));
    }

    #[test]
    fn build_query_matcher_regex() {
        let matcher = build_query_matcher(&MatchMode::Regex, "test.*file", true).unwrap();
        assert!(matcher.matches("test this file"));
        assert!(matcher.matches("TEST FILE"));
        assert!(!matcher.matches("no match"));
    }

    #[test]
    fn build_query_matcher_rejects_long_regex_pattern() {
        let long_pattern = "a".repeat(600);
        let result = build_query_matcher(&MatchMode::Regex, &long_pattern, true);
        assert!(result.is_err());
    }

    #[test]
    fn build_query_matcher_rejects_too_many_wildcards() {
        let many_wildcards = "*?*?*?*?*?*?*?*?*?*?*?*?*?*?*?*?*?*";
        let result = build_query_matcher(&MatchMode::Wildcard, many_wildcards, true);
        assert!(result.is_err());
    }

    #[test]
    fn build_query_matcher_accepts_valid_regex() {
        let result = build_query_matcher(&MatchMode::Regex, "test.*pattern", true);
        assert!(result.is_ok());
    }

    #[test]
    fn build_query_matcher_accepts_valid_wildcard() {
        let result = build_query_matcher(&MatchMode::Wildcard, "*.txt", true);
        assert!(result.is_ok());
    }

    #[test]
    fn matches_path_match_all() {
        let matcher = QueryMatcher::MatchAll;
        assert!(matcher.matches_path("/any/path"));
    }

    #[test]
    fn matches_path_plain_finds_in_filename() {
        let matcher = QueryMatcher::Plain {
            query: "test".to_string(),
            query_lower: Some("test".to_string()),
            ignore_case: true,
        };
        assert!(matcher.matches_path("/home/user/test.txt"));
        assert!(matcher.matches_path("/home/user/TEST.txt"));
    }

    #[test]
    fn matches_path_plain_finds_in_full_path() {
        let matcher = QueryMatcher::Plain {
            query: "user".to_string(),
            query_lower: Some("user".to_string()),
            ignore_case: true,
        };
        assert!(matcher.matches_path("/home/user/test.txt"));
    }

    #[test]
    fn matches_path_plain_case_sensitive() {
        let matcher = QueryMatcher::Plain {
            query: "Test".to_string(),
            query_lower: None,
            ignore_case: false,
        };
        assert!(matcher.matches_path("/home/Test/file.txt"));
        assert!(!matcher.matches_path("/home/test/file.txt"));
    }

    #[test]
    fn matches_path_regex() {
        let matcher = QueryMatcher::Regex {
            regex: Regex::new(r"test\d+").unwrap(),
        };
        assert!(matcher.matches_path("/test123/file.txt"));
        assert!(!matcher.matches_path("/testabc/file.txt"));
    }

    #[test]
    fn build_query_matcher_regex_case_sensitive() {
        let matcher = build_query_matcher(&MatchMode::Regex, "test", false).unwrap();
        assert!(matcher.matches("test"));
        assert!(!matcher.matches("TEST"));
    }

    #[test]
    fn build_query_matcher_wildcard_single_char() {
        let matcher = build_query_matcher(&MatchMode::Wildcard, "?.txt", true).unwrap();
        assert!(matcher.matches("a.txt"));
        assert!(matcher.matches("x.txt"));
        assert!(!matcher.matches("ab.txt"));
    }

    #[test]
    fn build_query_matcher_wildcard_case_insensitive() {
        let matcher = build_query_matcher(&MatchMode::Wildcard, "*.TXT", true).unwrap();
        assert!(matcher.matches("file.txt"));
        assert!(matcher.matches("file.TXT"));
    }
}
