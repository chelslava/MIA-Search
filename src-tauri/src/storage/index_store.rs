use crate::core::models::SearchResultItem;
use crate::storage::persistence;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

const INDEX_FILE: &str = "search_index.json";
const INDEX_VERSION: u32 = 1;
const MAX_INDEX_ENTRIES: usize = 1_000_000;
const MAX_INDEX_SIZE_MB: usize = 500;
const ENTRY_OVERHEAD_BYTES: usize = 512;

fn estimate_entry_size(entry: &SearchResultItem) -> usize {
  entry.full_path.len()
    + entry.name.len()
    + entry.extension.as_ref().map_or(0, |e| e.len())
    + entry.created_at.as_ref().map_or(0, |c| c.len())
    + entry.modified_at.as_ref().map_or(0, |m| m.len())
    + ENTRY_OVERHEAD_BYTES
}

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

  pub fn with_limits(roots: Vec<String>, entries: Vec<SearchResultItem>) -> (Self, usize, bool) {
    let mut truncated = false;
    let mut total_size = 0usize;
    let max_bytes = MAX_INDEX_SIZE_MB * 1024 * 1024;
    let mut limited_entries = Vec::with_capacity(entries.len().min(MAX_INDEX_ENTRIES));

    for entry in entries {
      if limited_entries.len() >= MAX_INDEX_ENTRIES {
        truncated = true;
        eprintln!(
          "Index truncated at {} entries (max {})",
          limited_entries.len(),
          MAX_INDEX_ENTRIES
        );
        break;
      }

      let entry_size = estimate_entry_size(&entry);
      if total_size.saturating_add(entry_size) > max_bytes {
        truncated = true;
        eprintln!(
          "Index truncated at {} MB (max {} MB)",
          total_size / (1024 * 1024),
          MAX_INDEX_SIZE_MB
        );
        break;
      }

      total_size = total_size.saturating_add(entry_size);
      limited_entries.push(entry);
    }

    (
      Self {
        version: INDEX_VERSION,
        updated_at: Utc::now().to_rfc3339(),
        roots,
        entries: limited_entries,
      },
      total_size,
      truncated,
    )
  }

  pub fn estimated_memory_bytes(&self) -> usize {
    self.entries.iter().map(estimate_entry_size).sum()
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

