#[derive(Debug, Clone, Default)]
pub struct FavoritesStore {
  items: Vec<String>,
}

impl FavoritesStore {
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
}
