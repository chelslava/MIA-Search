use crate::core::models::SearchProfile;
use crate::storage::persistence;
use serde::{Deserialize, Serialize};

const PRESETS_FILE: &str = "profiles.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProfilesSnapshot {
  pub items: Vec<SearchProfile>,
  pub next_numeric_id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProfilesStore {
  items: Vec<SearchProfile>,
  next_numeric_id: u64,
}

impl ProfilesStore {
  pub fn load() -> Self {
    let snapshot: ProfilesSnapshot = persistence::load_json(PRESETS_FILE);
    Self {
      items: snapshot.items,
      next_numeric_id: snapshot.next_numeric_id,
    }
  }

  pub fn list(&self) -> Vec<SearchProfile> {
    self.items.clone()
  }

  pub fn save(&mut self, mut profile: SearchProfile) -> SearchProfile {
    if profile.id.trim().is_empty() {
      self.next_numeric_id = self.next_numeric_id.saturating_add(1);
      profile.id = format!("profile-{}", self.next_numeric_id);
    }

    if let Some(existing) = self.items.iter_mut().find(|item| item.id == profile.id) {
      *existing = profile.clone();
    } else {
      self.items.push(profile.clone());
    }

    profile
  }

  pub fn delete(&mut self, profile_id: &str) -> bool {
    let before = self.items.len();
    self.items.retain(|profile| profile.id != profile_id);
    before != self.items.len()
  }

  pub fn snapshot(&self) -> ProfilesSnapshot {
    ProfilesSnapshot {
      items: self.items.clone(),
      next_numeric_id: self.next_numeric_id,
    }
  }

  pub fn persist(&self) -> Result<(), String> {
    persistence::save_json(PRESETS_FILE, &self.snapshot())
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::storage::persistence::with_test_data_dir;

  fn sample_profile() -> SearchProfile {
    SearchProfile {
      name: "default".to_string(),
      ..SearchProfile::default()
    }
  }

  #[test]
  fn save_assigns_id_then_updates_existing() {
    let mut store = ProfilesStore::default();
    let saved = store.save(sample_profile());
    assert!(saved.id.starts_with("profile-"));
    assert_eq!(store.list().len(), 1);

    let mut updated = saved.clone();
    updated.name = "updated".to_string();
    let saved_again = store.save(updated.clone());
    assert_eq!(saved_again.id, saved.id);
    assert_eq!(store.list().len(), 1);
    assert_eq!(store.list()[0].name, "updated");
  }

  #[test]
  fn delete_and_snapshot_work() {
    let mut store = ProfilesStore::default();
    let saved = store.save(sample_profile());
    assert!(store.delete(&saved.id));
    assert!(!store.delete("missing"));
    assert!(store.snapshot().items.is_empty());
  }

  #[test]
  fn profiles_store_persist_and_load_roundtrip() {
    with_test_data_dir(|| {
      let mut store = ProfilesStore::default();
      let saved = store.save(sample_profile());
      store.persist().expect("persist");

      let loaded = ProfilesStore::load();
      assert_eq!(loaded.list().len(), 1);
      assert_eq!(loaded.list()[0].id, saved.id);
    });
  }
}
