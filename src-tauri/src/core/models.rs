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
  pub options: SearchOptions,
}

impl Default for SearchRequest {
  fn default() -> Self {
    Self {
      query: String::new(),
      roots: Vec::new(),
      extensions: Vec::new(),
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
