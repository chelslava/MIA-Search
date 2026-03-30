use crate::core::models::SearchResultItem;
use crate::storage::persistence;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

const INDEX_FILE: &str = "search_index.json";
const INDEX_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct IndexSnapshot {
  pub version: u32,
  pub updated_at: String,
  pub roots: Vec<String>,
  pub entries: Vec<SearchResultItem>,
}

impl IndexSnapshot {
  pub fn fresh(roots: Vec<String>, entries: Vec<SearchResultItem>) -> Self {
    Self {
      version: INDEX_VERSION,
      updated_at: Utc::now().to_rfc3339(),
      roots,
      entries,
    }
  }
}

#[derive(Debug, Clone, Default)]
pub struct IndexStore {
  value: Arc<IndexSnapshot>,
  version_mismatch: bool,
}

impl IndexStore {
  pub fn load() -> Self {
    let snapshot: IndexSnapshot = persistence::load_json(INDEX_FILE);
    let version_mismatch = snapshot.version != INDEX_VERSION && snapshot.version != 0;
    if version_mismatch {
      eprintln!(
        "Index version mismatch: got {}, expected {}. Rebuilding...",
        snapshot.version, INDEX_VERSION
      );
      return Self {
        value: Arc::new(IndexSnapshot::default()),
        version_mismatch,
      };
    }
    Self {
      value: Arc::new(snapshot),
      version_mismatch,
    }
  }

  pub fn snapshot(&self) -> Arc<IndexSnapshot> {
    Arc::clone(&self.value)
  }

  pub fn replace(&mut self, value: IndexSnapshot) {
    self.value = Arc::new(value);
    self.version_mismatch = false;
  }

  pub fn persist(&self) -> Result<(), String> {
    persistence::save_json(INDEX_FILE, &*self.value)
  }

  pub fn version_mismatch(&self) -> bool {
    self.version_mismatch
  }
}

