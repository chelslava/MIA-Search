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
