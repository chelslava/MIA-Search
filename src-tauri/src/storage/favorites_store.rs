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
