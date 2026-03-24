use crate::core::models::SearchProfile;

#[derive(Debug, Clone, Default)]
pub struct ProfilesStore {
  items: Vec<SearchProfile>,
  next_numeric_id: u64,
}

impl ProfilesStore {
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
}
