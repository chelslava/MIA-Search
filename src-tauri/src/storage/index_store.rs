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
    Self::with_limits_impl(roots, entries, MAX_INDEX_ENTRIES, MAX_INDEX_SIZE_MB * 1024 * 1024)
  }

  #[cfg(test)]
  pub fn with_limits_with_max_entries(roots: Vec<String>, entries: Vec<SearchResultItem>, max_entries: usize) -> (Self, usize, bool) {
    Self::with_limits_impl(roots, entries, max_entries, MAX_INDEX_SIZE_MB * 1024 * 1024)
  }

  fn with_limits_impl(roots: Vec<String>, entries: Vec<SearchResultItem>, max_entries: usize, max_bytes: usize) -> (Self, usize, bool) {
    let mut truncated = false;
    let mut total_size = 0usize;
    let mut limited_entries = Vec::with_capacity(entries.len().min(max_entries));

    for entry in entries {
      if limited_entries.len() >= max_entries {
        truncated = true;
        eprintln!(
          "Index truncated at {} entries (max {})",
          limited_entries.len(),
          max_entries
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

#[cfg(test)]
mod tests {
  use super::*;

  fn make_item(path: &str, name: &str) -> SearchResultItem {
    SearchResultItem {
      full_path: path.to_string(),
      name: name.to_string(),
      parent_path: "/".to_string(),
      is_file: true,
      is_dir: false,
      extension: Some("txt".to_string()),
      size: Some(100),
      created_at: Some("2026-01-01T00:00:00Z".to_string()),
      modified_at: Some("2026-01-01T00:00:00Z".to_string()),
      hidden: false,
      score: None,
      source_root: "/".to_string(),
    }
  }

  #[test]
  fn estimate_entry_size_returns_reasonable_estimate() {
    let item = make_item("/path/to/file.txt", "file.txt");
    let size = estimate_entry_size(&item);
    assert!(size > 0);
    assert!(size >= item.full_path.len() + item.name.len() + ENTRY_OVERHEAD_BYTES);
  }

  #[test]
  fn with_limits_returns_all_entries_when_within_limits() {
    let entries: Vec<SearchResultItem> = (0..10)
      .map(|i| make_item(&format!("/path/file{}.txt", i), &format!("file{}.txt", i)))
      .collect();
    
    let (snapshot, total_size, truncated) = IndexSnapshot::with_limits(vec!["/".to_string()], entries.clone());
    
    assert!(!truncated);
    assert_eq!(snapshot.entries.len(), 10);
    assert!(total_size > 0);
  }

  #[test]
  fn with_limits_truncates_at_entry_count() {
    let entries: Vec<SearchResultItem> = (0..10)
      .map(|i| make_item(&format!("/path/file{}.txt", i), &format!("file{}.txt", i)))
      .collect();
    
    let (snapshot, _, truncated) = IndexSnapshot::with_limits_with_max_entries(vec!["/".to_string()], entries, 5);
    
    assert!(truncated);
    assert_eq!(snapshot.entries.len(), 5);
  }

  #[test]
  fn estimated_memory_bytes_matches_individual_estimates() {
    let entries: Vec<SearchResultItem> = vec![
      make_item("/a.txt", "a.txt"),
      make_item("/b.txt", "b.txt"),
    ];
    
    let snapshot = IndexSnapshot::fresh(vec!["/".to_string()], entries);
    let estimated = snapshot.estimated_memory_bytes();
    
    assert!(estimated > 0);
    assert_eq!(estimated, snapshot.entries.iter().map(estimate_entry_size).sum::<usize>());
  }
}

