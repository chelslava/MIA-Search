use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum EntryKind {
  Any,
  File,
  Directory,
}

impl Default for EntryKind {
  fn default() -> Self {
    Self::Any
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SortMode {
  Relevance,
  Name,
  Size,
  Modified,
  Type,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum MatchMode {
  Plain,
  Wildcard,
  Regex,
}

impl Default for MatchMode {
  fn default() -> Self {
    Self::Plain
  }
}

impl Default for SortMode {
  fn default() -> Self {
    Self::Relevance
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SearchBackend {
  Scan,
  Index,
}

impl Default for SearchBackend {
  fn default() -> Self {
    Self::Scan
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SizeComparison {
  Smaller,
  Equal,
  Greater,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DateField {
  Created,
  Modified,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DateComparison {
  Before,
  After,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum CommandStatus {
  Idle,
  Accepted,
  Cancelled,
  NotFound,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SizeFilter {
  pub comparison: SizeComparison,
  pub bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateFilter {
  pub field: DateField,
  pub comparison: DateComparison,
  pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOptions {
  pub max_depth: Option<usize>,
  pub limit: Option<usize>,
  pub strict: bool,
  pub ignore_case: bool,
  pub include_hidden: bool,
  pub entry_kind: EntryKind,
  #[serde(default)]
  pub match_mode: MatchMode,
  pub size_filter: Option<SizeFilter>,
  pub created_filter: Option<DateFilter>,
  pub modified_filter: Option<DateFilter>,
  pub sort_mode: SortMode,
  #[serde(default)]
  pub search_backend: SearchBackend,
}

impl Default for SearchOptions {
  fn default() -> Self {
    Self {
      max_depth: None,
      limit: Some(100),
      strict: false,
      ignore_case: false,
      include_hidden: false,
      entry_kind: EntryKind::Any,
      match_mode: MatchMode::Plain,
      size_filter: None,
      created_filter: None,
      modified_filter: None,
      sort_mode: SortMode::Relevance,
      search_backend: SearchBackend::Scan,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchFilter {
  pub extension: Option<String>,
  pub size_filter: Option<SizeFilter>,
  pub created_filter: Option<DateFilter>,
  pub modified_filter: Option<DateFilter>,
}

impl Default for SearchFilter {
  fn default() -> Self {
    Self {
      extension: None,
      size_filter: None,
      created_filter: None,
      modified_filter: None,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchRequest {
  pub query: String,
  pub roots: Vec<String>,
  pub extensions: Vec<String>,
  #[serde(default)]
  pub exclude_paths: Vec<String>,
  pub options: SearchOptions,
}

impl Default for SearchRequest {
  fn default() -> Self {
    Self {
      query: String::new(),
      roots: Vec::new(),
      extensions: Vec::new(),
      exclude_paths: Vec::new(),
      options: SearchOptions::default(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResultItem {
  pub name: String,
  pub full_path: String,
  pub parent_path: String,
  pub is_file: bool,
  pub is_dir: bool,
  pub extension: Option<String>,
  pub size: Option<u64>,
  pub created_at: Option<String>,
  pub modified_at: Option<String>,
  pub hidden: bool,
  pub score: Option<f64>,
  pub source_root: String,
}

impl Default for SearchResultItem {
  fn default() -> Self {
    Self {
      name: String::new(),
      full_path: String::new(),
      parent_path: String::new(),
      is_file: false,
      is_dir: false,
      extension: None,
      size: None,
      created_at: None,
      modified_at: None,
      hidden: false,
      score: None,
      source_root: String::new(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchSessionSnapshot {
  pub active_search_id: Option<u64>,
  pub last_request: Option<SearchRequest>,
  pub status: CommandStatus,
}

impl Default for SearchSessionSnapshot {
  fn default() -> Self {
    Self {
      active_search_id: None,
      last_request: None,
      status: CommandStatus::Idle,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchProfile {
  pub id: String,
  pub name: String,
  pub request: SearchRequest,
  pub pinned: bool,
}

impl Default for SearchProfile {
  fn default() -> Self {
    Self {
      id: String::new(),
      name: String::new(),
      request: SearchRequest::default(),
      pinned: false,
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn enum_defaults_match_expected_values() {
    assert_eq!(EntryKind::default(), EntryKind::Any);
    assert_eq!(MatchMode::default(), MatchMode::Plain);
    assert_eq!(SortMode::default(), SortMode::Relevance);
  }

  #[test]
  fn search_options_default_populates_expected_fields() {
    let options = SearchOptions::default();

    assert_eq!(options.max_depth, None);
    assert_eq!(options.limit, Some(100));
    assert!(!options.strict);
    assert!(!options.ignore_case);
    assert!(!options.include_hidden);
    assert_eq!(options.entry_kind, EntryKind::Any);
    assert_eq!(options.match_mode, MatchMode::Plain);
    assert!(options.size_filter.is_none());
    assert!(options.created_filter.is_none());
    assert!(options.modified_filter.is_none());
    assert_eq!(options.sort_mode, SortMode::Relevance);
    assert_eq!(options.search_backend, SearchBackend::Scan);
  }

  #[test]
  fn search_filter_request_session_and_profile_defaults_are_empty() {
    let filter = SearchFilter::default();
    let request = SearchRequest::default();
    let session = SearchSessionSnapshot::default();
    let profile = SearchProfile::default();
    let item = SearchResultItem::default();

    assert!(filter.extension.is_none());
    assert!(filter.size_filter.is_none());
    assert!(filter.created_filter.is_none());
    assert!(filter.modified_filter.is_none());

    assert_eq!(request.query, "");
    assert!(request.roots.is_empty());
    assert!(request.extensions.is_empty());
    assert!(request.exclude_paths.is_empty());
    assert_eq!(request.options.max_depth, SearchOptions::default().max_depth);
    assert_eq!(request.options.limit, SearchOptions::default().limit);
    assert_eq!(request.options.strict, SearchOptions::default().strict);
    assert_eq!(request.options.ignore_case, SearchOptions::default().ignore_case);
    assert_eq!(request.options.include_hidden, SearchOptions::default().include_hidden);
    assert_eq!(request.options.entry_kind, SearchOptions::default().entry_kind);
    assert_eq!(request.options.match_mode, SearchOptions::default().match_mode);
    assert!(request.options.size_filter.is_none());
    assert!(request.options.created_filter.is_none());
    assert!(request.options.modified_filter.is_none());
    assert_eq!(request.options.sort_mode, SearchOptions::default().sort_mode);
    assert_eq!(request.options.search_backend, SearchOptions::default().search_backend);

    assert_eq!(session.active_search_id, None);
    assert!(session.last_request.is_none());
    assert_eq!(session.status, CommandStatus::Idle);

    assert_eq!(profile.id, "");
    assert_eq!(profile.name, "");
    assert_eq!(profile.request.query, SearchRequest::default().query);
    assert_eq!(profile.request.roots, SearchRequest::default().roots);
    assert_eq!(profile.request.extensions, SearchRequest::default().extensions);
    assert_eq!(profile.request.options.limit, SearchRequest::default().options.limit);
    assert!(!profile.pinned);

    assert_eq!(item.name, "");
    assert_eq!(item.full_path, "");
    assert_eq!(item.parent_path, "");
    assert!(!item.is_file);
    assert!(!item.is_dir);
    assert!(item.extension.is_none());
    assert!(item.size.is_none());
    assert!(item.created_at.is_none());
    assert!(item.modified_at.is_none());
    assert!(!item.hidden);
    assert!(item.score.is_none());
    assert_eq!(item.source_root, "");
  }

  #[test]
  fn search_request_deserializes_without_exclude_paths_for_backward_compatibility() {
    let raw = r#"{
      "query": "report",
      "roots": ["C:/data"],
      "extensions": ["txt"],
      "options": {
        "max_depth": null,
        "limit": 100,
        "strict": false,
        "ignore_case": false,
        "include_hidden": false,
        "entry_kind": "Any",
        "match_mode": "Plain",
        "size_filter": null,
        "created_filter": null,
        "modified_filter": null,
        "sort_mode": "Relevance",
        "search_backend": "Scan"
      }
    }"#;

    let parsed: SearchRequest = serde_json::from_str(raw).expect("legacy request should parse");
    assert!(parsed.exclude_paths.is_empty());
    assert_eq!(parsed.query, "report");
  }
}
