use crate::core::models::SearchRequest;

#[derive(Debug, Clone, Default)]
pub struct HistoryStore {
  pub queries: Vec<SearchRequest>,
  pub opened_paths: Vec<String>,
}

impl HistoryStore {
  pub fn record_query(&mut self, request: SearchRequest) {
    self.queries.push(request);
  }

  pub fn record_opened_path(&mut self, path: impl Into<String>) {
    self.opened_paths.push(path.into());
  }
}
