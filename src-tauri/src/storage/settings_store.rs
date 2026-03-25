use crate::storage::persistence;
use serde::{Deserialize, Serialize};

const SETTINGS_FILE: &str = "settings.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SettingsSnapshot {
  pub theme: String,
  pub language: String,
  pub live_search: bool,
  pub debounce_ms: u64,
  pub default_limit: Option<usize>,
  pub show_hidden_by_default: bool,
  pub auto_similarity_sort: bool,
  pub keep_history: bool,
  pub max_history_entries: usize,
  pub date_format: String,
  pub size_unit: String,
  pub double_click_action: String,
  pub default_roots: Vec<String>,
}

impl Default for SettingsSnapshot {
  fn default() -> Self {
    Self {
      theme: "system".to_string(),
      language: "ru".to_string(),
      live_search: true,
      debounce_ms: 250,
      default_limit: Some(100),
      show_hidden_by_default: false,
      auto_similarity_sort: true,
      keep_history: true,
      max_history_entries: 200,
      date_format: "%Y-%m-%d %H:%M:%S".to_string(),
      size_unit: "MB".to_string(),
      double_click_action: "open".to_string(),
      default_roots: Vec::new(),
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SettingsStore {
  value: SettingsSnapshot,
}

impl SettingsStore {
  pub fn load() -> Self {
    Self {
      value: persistence::load_json(SETTINGS_FILE),
    }
  }

  pub fn snapshot(&self) -> SettingsSnapshot {
    self.value.clone()
  }

  pub fn replace(&mut self, value: SettingsSnapshot) {
    self.value = value;
  }

  pub fn persist(&self) -> Result<(), String> {
    persistence::save_json(SETTINGS_FILE, &self.value)
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::storage::persistence::with_test_data_dir;

  #[test]
  fn settings_default_has_expected_values() {
    let defaults = SettingsSnapshot::default();
    assert_eq!(defaults.theme, "system");
    assert_eq!(defaults.language, "ru");
    assert!(defaults.live_search);
    assert_eq!(defaults.debounce_ms, 250);
    assert_eq!(defaults.default_limit, Some(100));
    assert!(defaults.keep_history);
  }

  #[test]
  fn settings_replace_snapshot_and_persist_roundtrip() {
    with_test_data_dir(|| {
      let mut store = SettingsStore::default();
      let mut next = SettingsSnapshot::default();
      next.language = "en".to_string();
      next.live_search = false;
      next.max_history_entries = 42;
      store.replace(next.clone());
      assert_eq!(store.snapshot().language, "en");
      assert!(!store.snapshot().live_search);
      store.persist().expect("persist");

      let loaded = SettingsStore::load();
      assert_eq!(loaded.snapshot().language, "en");
      assert!(!loaded.snapshot().live_search);
      assert_eq!(loaded.snapshot().max_history_entries, 42);
    });
  }
}
