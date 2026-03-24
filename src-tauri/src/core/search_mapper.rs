use crate::core::models::{SearchOptions, SearchRequest};

#[derive(Debug, Clone)]
pub struct SearchPlan {
  pub query: String,
  pub roots: Vec<String>,
  pub extensions: Vec<String>,
  pub options: SearchOptions,
}

pub fn request_to_plan(request: &SearchRequest) -> SearchPlan {
  SearchPlan {
    query: request.query.trim().to_string(),
    roots: request.roots.iter().map(|root| root.trim().to_string()).collect(),
    extensions: request
      .extensions
      .iter()
      .map(|ext| ext.trim().trim_start_matches('.').to_string())
      .filter(|ext| !ext.is_empty())
      .collect(),
    options: request.options.clone(),
  }
}
