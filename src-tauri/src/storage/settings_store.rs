use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsSnapshot {
  pub theme: String,
  pub language: String,
  pub live_search: bool,
  pub debounce_ms: u64,
  pub default_limit: Option<usize>,
  pub show_hidden_by_default: bool,
  pub auto_similarity_sort: bool,
  pub keep_history: bool,
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
      date_format: "%Y-%m-%d %H:%M:%S".to_string(),
      size_unit: "MB".to_string(),
      double_click_action: "open".to_string(),
      default_roots: Vec::new(),
    }
  }
}

#[derive(Debug, Clone, Default)]
pub struct SettingsStore {
  value: SettingsSnapshot,
}

impl SettingsStore {
  pub fn snapshot(&self) -> SettingsSnapshot {
    self.value.clone()
  }

  pub fn replace(&mut self, value: SettingsSnapshot) {
    self.value = value;
  }
}
