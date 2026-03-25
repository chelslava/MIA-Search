use crate::core::models::SearchRequest;
use crate::storage::persistence;
use serde::{Deserialize, Serialize};

const HISTORY_FILE: &str = "history.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HistorySnapshot {
  pub queries: Vec<SearchRequest>,
  pub opened_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HistoryStore {
  pub queries: Vec<SearchRequest>,
  pub opened_paths: Vec<String>,
}

impl HistoryStore {
  pub fn load() -> Self {
    let snapshot: HistorySnapshot = persistence::load_json(HISTORY_FILE);
    Self {
      queries: snapshot.queries,
      opened_paths: snapshot.opened_paths,
    }
  }

  pub fn record_query(&mut self, request: SearchRequest) {
    self.queries.push(request);
  }

  pub fn record_query_with_limit(&mut self, request: SearchRequest, limit: usize) {
    self.queries.push(request);
    trim_oldest(&mut self.queries, limit);
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
      queries: self.queries.clone(),
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
    assert_eq!(store.queries.len(), 2);
    assert_eq!(store.queries[0].query, "two");
    assert_eq!(store.queries[1].query, "three");

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
      assert_eq!(loaded.queries.len(), 1);
      assert_eq!(loaded.queries[0].query, "abc");
      assert_eq!(loaded.opened_paths, vec!["C:/tmp/file.txt".to_string()]);
      assert_eq!(loaded.snapshot().queries.len(), 1);
    });
  }
}
