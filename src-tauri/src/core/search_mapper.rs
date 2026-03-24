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

#[cfg(test)]
mod tests {
  use super::*;
  use crate::core::models::SearchRequest;

  #[test]
  fn request_to_plan_trims_query_roots_and_extensions() {
    let request = SearchRequest {
      query: "  report  ".to_string(),
      roots: vec!["  C:/data  ".to_string(), "\tD:/logs\t".to_string()],
      extensions: vec!["  .rs  ".to_string(), "  txt".to_string(), "   ".to_string()],
      ..SearchRequest::default()
    };

    let plan = request_to_plan(&request);

    assert_eq!(plan.query, "report");
    assert_eq!(plan.roots, vec!["C:/data", "D:/logs"]);
    assert_eq!(plan.extensions, vec!["rs", "txt"]);
    assert_eq!(plan.options.limit, request.options.limit);
    assert_eq!(plan.options.strict, request.options.strict);
    assert_eq!(plan.options.ignore_case, request.options.ignore_case);
  }
}
