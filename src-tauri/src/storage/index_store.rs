use crate::core::models::SearchResultItem;
use crate::storage::persistence;
use chrono::Utc;
use serde::{Deserialize, Serialize};

const INDEX_FILE: &str = "search_index.json";

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
      version: 1,
      updated_at: Utc::now().to_rfc3339(),
      roots,
      entries,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct IndexStore {
  value: IndexSnapshot,
}

impl IndexStore {
  pub fn load() -> Self {
    Self {
      value: persistence::load_json(INDEX_FILE),
    }
  }

  pub fn snapshot(&self) -> IndexSnapshot {
    self.value.clone()
  }

  pub fn replace(&mut self, value: IndexSnapshot) {
    self.value = value;
  }

  pub fn persist(&self) -> Result<(), String> {
    persistence::save_json(INDEX_FILE, &self.value)
  }
}

