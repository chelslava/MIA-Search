use crate::storage::persistence;
use serde::{Deserialize, Serialize};

const FAVORITES_FILE: &str = "favorites.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FavoritesSnapshot {
  pub items: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FavoritesStore {
  items: Vec<String>,
}

impl FavoritesStore {
  pub fn load() -> Self {
    let snapshot: FavoritesSnapshot = persistence::load_json(FAVORITES_FILE);
    Self {
      items: snapshot.items,
    }
  }

  pub fn list(&self) -> Vec<String> {
    self.items.clone()
  }

  pub fn add(&mut self, path: impl Into<String>) {
    let path = path.into();
    if !self.items.iter().any(|item| item == &path) {
      self.items.push(path);
    }
  }

  pub fn remove(&mut self, path: &str) -> bool {
    let before = self.items.len();
    self.items.retain(|item| item != path);
    before != self.items.len()
  }

  pub fn snapshot(&self) -> FavoritesSnapshot {
    FavoritesSnapshot {
      items: self.items.clone(),
    }
  }

  pub fn persist(&self) -> Result<(), String> {
    persistence::save_json(FAVORITES_FILE, &self.snapshot())
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::storage::persistence::with_test_data_dir;

  #[test]
  fn favorites_store_add_remove_and_snapshot() {
    let mut store = FavoritesStore::default();
    store.add("C:/a");
    store.add("C:/a");
    store.add("D:/b");
    assert_eq!(store.list(), vec!["C:/a".to_string(), "D:/b".to_string()]);

    assert!(store.remove("C:/a"));
    assert!(!store.remove("C:/missing"));
    assert_eq!(store.snapshot().items, vec!["D:/b".to_string()]);
  }

  #[test]
  fn favorites_store_persist_and_load_roundtrip() {
    with_test_data_dir(|| {
      let mut store = FavoritesStore::default();
      store.add("C:/work");
      store.add("D:/docs");
      store.persist().expect("persist");

      let loaded = FavoritesStore::load();
      assert_eq!(loaded.list(), vec!["C:/work".to_string(), "D:/docs".to_string()]);
    });
  }
}
