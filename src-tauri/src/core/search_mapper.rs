use crate::core::models::{SearchOptions, SearchRequest};

#[derive(Debug, Clone)]
pub struct SearchPlan {
  pub query: String,
  pub roots: Vec<String>,
  pub extensions: Vec<String>,
  pub exclude_paths: Vec<String>,
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
    exclude_paths: request
      .exclude_paths
      .iter()
      .map(|value| value.trim().to_string())
      .filter(|value| !value.is_empty())
      .collect(),
    options: request.options.clone(),
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::core::models::{EntryKind, MatchMode, SearchBackend, SearchOptions, SearchRequest, SortMode};

  #[test]
  fn request_to_plan_trims_query_roots_and_extensions() {
    let request = SearchRequest {
      query: "  report  ".to_string(),
      roots: vec!["  C:/data  ".to_string(), "\tD:/logs\t".to_string()],
      extensions: vec!["  .rs  ".to_string(), "  txt".to_string(), "   ".to_string()],
      exclude_paths: vec!["  node_modules  ".to_string(), " ".to_string()],
      ..SearchRequest::default()
    };

    let plan = request_to_plan(&request);

    assert_eq!(plan.query, "report");
    assert_eq!(plan.roots, vec!["C:/data", "D:/logs"]);
    assert_eq!(plan.extensions, vec!["rs", "txt"]);
    assert_eq!(plan.exclude_paths, vec!["node_modules"]);
    assert_eq!(plan.options.limit, request.options.limit);
    assert_eq!(plan.options.strict, request.options.strict);
    assert_eq!(plan.options.ignore_case, request.options.ignore_case);
  }

  #[test]
  fn request_to_plan_preserves_options_and_filters_blank_extensions() {
    let request = SearchRequest {
      query: "\t quarterly summary \n".to_string(),
      roots: vec!["  C:/data  ".to_string(), " ".to_string(), "\tD:/logs\t".to_string()],
      extensions: vec![
        "  .md  ".to_string(),
        "..txt".to_string(),
        "   ".to_string(),
        ".".to_string(),
      ],
      exclude_paths: vec!["  target  ".to_string(), "  ".to_string(), ".git".to_string()],
      options: SearchOptions {
        max_depth: Some(3),
        limit: Some(7),
        strict: true,
        ignore_case: true,
        include_hidden: true,
        entry_kind: EntryKind::Directory,
        match_mode: MatchMode::Regex,
        size_filter: None,
        created_filter: None,
        modified_filter: None,
        sort_mode: SortMode::Name,
        search_backend: SearchBackend::Index,
      },
    };

    let plan = request_to_plan(&request);

    assert_eq!(plan.query, "quarterly summary");
    assert_eq!(plan.roots, vec!["C:/data", "", "D:/logs"]);
    assert_eq!(plan.extensions, vec!["md", "txt"]);
    assert_eq!(plan.exclude_paths, vec!["target", ".git"]);
    assert_eq!(plan.options.max_depth, Some(3));
    assert_eq!(plan.options.limit, Some(7));
    assert!(plan.options.strict);
    assert!(plan.options.ignore_case);
    assert!(plan.options.include_hidden);
    assert_eq!(plan.options.entry_kind, EntryKind::Directory);
    assert_eq!(plan.options.match_mode, MatchMode::Regex);
    assert_eq!(plan.options.sort_mode, SortMode::Name);
    assert_eq!(plan.options.search_backend, SearchBackend::Index);
  }
}
