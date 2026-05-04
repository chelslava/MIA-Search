use crate::core::models::SearchRequest;
use crate::storage::persistence;
use chrono::Utc;
use serde::{Deserialize, Serialize};

const HISTORY_FILE: &str = "history.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryQueryEntry {
  pub query: String,
  pub timestamp: String,
}

impl Default for HistoryQueryEntry {
  fn default() -> Self {
    Self {
      query: String::new(),
      timestamp: Utc::now().to_rfc3339(),
    }
  }
}

impl From<SearchRequest> for HistoryQueryEntry {
  fn from(request: SearchRequest) -> Self {
    Self {
      query: request.query,
      timestamp: Utc::now().to_rfc3339(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HistorySnapshot {
  #[serde(default)]
  pub query_entries: Vec<HistoryQueryEntry>,
  #[serde(default)]
  pub opened_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HistoryStore {
  pub query_entries: Vec<HistoryQueryEntry>,
  pub opened_paths: Vec<String>,
}

impl HistoryStore {
  pub fn load() -> Self {
    let snapshot: HistorySnapshot = persistence::load_json(HISTORY_FILE);
    Self {
      query_entries: snapshot.query_entries,
      opened_paths: snapshot.opened_paths,
    }
  }

  pub fn record_query(&mut self, request: SearchRequest) {
    self.query_entries.push(request.into());
  }

  pub fn record_query_with_limit(&mut self, request: SearchRequest, limit: usize) {
    self.query_entries.push(request.into());
    trim_oldest(&mut self.query_entries, limit);
  }

  pub fn record_opened_path(&mut self, path: impl Into<String>) {
    self.opened_paths.push(path.into());
  }

  pub fn record_opened_path_with_limit(&mut self, path: impl Into<String>, limit: usize) {
    self.opened_paths.push(path.into());
    trim_oldest(&mut self.opened_paths, limit);
  }

  pub fn snapshot(&self) -> HistorySnapshot {
    HistorySnapshot {
      query_entries: self.query_entries.clone(),
      opened_paths: self.opened_paths.clone(),
    }
  }

  pub fn persist(&self) -> Result<(), String> {
    persistence::save_json(HISTORY_FILE, &self.snapshot())
  }
}

fn trim_oldest<T>(items: &mut Vec<T>, limit: usize) {
  if limit == 0 {
    items.clear();
    return;
  }
  if items.len() > limit {
    let drain_count = items.len() - limit;
    items.drain(0..drain_count);
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::storage::persistence::with_test_data_dir;

  fn request(query: &str) -> SearchRequest {
    SearchRequest {
      query: query.to_string(),
      ..SearchRequest::default()
    }
  }

  #[test]
  fn record_methods_and_limits_work() {
    let mut store = HistoryStore::default();
    store.record_query(request("one"));
    store.record_query_with_limit(request("two"), 2);
    store.record_query_with_limit(request("three"), 2);
    assert_eq!(store.query_entries.len(), 2);
    assert_eq!(store.query_entries[0].query, "two");
    assert_eq!(store.query_entries[1].query, "three");

    store.record_opened_path("a");
    store.record_opened_path_with_limit("b", 1);
    assert_eq!(store.opened_paths, vec!["b".to_string()]);
  }

  #[test]
  fn trim_oldest_handles_zero_limit() {
    let mut values = vec![1, 2, 3];
    trim_oldest(&mut values, 0);
    assert!(values.is_empty());
  }

  #[test]
  fn history_store_persist_and_load_roundtrip() {
    with_test_data_dir(|| {
      let mut store = HistoryStore::default();
      store.record_query(request("abc"));
      store.record_opened_path("C:/tmp/file.txt");
      store.persist().expect("persist");

      let loaded = HistoryStore::load();
      assert_eq!(loaded.query_entries.len(), 1);
      assert_eq!(loaded.query_entries[0].query, "abc");
      assert_eq!(loaded.opened_paths, vec!["C:/tmp/file.txt".to_string()]);
      assert_eq!(loaded.snapshot().query_entries.len(), 1);
    });
  }

  #[test]
  fn history_entry_excludes_sensitive_data() {
    let request = SearchRequest {
      query: "secret document".to_string(),
      roots: vec!["/home/user/secret".to_string()],
      exclude_paths: vec!["/home/user/secret/excluded".to_string()],
      ..SearchRequest::default()
    };
    let entry: HistoryQueryEntry = request.into();
    assert_eq!(entry.query, "secret document");
  }

  #[test]
  fn history_entry_has_timestamp() {
    let request = SearchRequest {
      query: "test query".to_string(),
      ..SearchRequest::default()
    };
    let entry: HistoryQueryEntry = request.into();
    assert!(!entry.timestamp.is_empty());
    assert!(chrono::DateTime::parse_from_rfc3339(&entry.timestamp).is_ok());
  }

  #[test]
  fn history_entry_default_has_timestamp() {
    let entry = HistoryQueryEntry::default();
    assert!(!entry.timestamp.is_empty());
    assert!(chrono::DateTime::parse_from_rfc3339(&entry.timestamp).is_ok());
  }
}
