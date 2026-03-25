use crate::core::models::{SearchResultItem, SortMode};
use std::cmp::Ordering;

pub fn sort_results(items: &mut [SearchResultItem], mode: &SortMode) {
  match mode {
    SortMode::Relevance => items.sort_by(|left, right| match (right.score, left.score) {
      (Some(right_score), Some(left_score)) => right_score
        .partial_cmp(&left_score)
        .unwrap_or(Ordering::Equal),
      _ => left.name.cmp(&right.name),
    }),
    SortMode::Name => items.sort_by(|left, right| left.name.cmp(&right.name)),
    SortMode::Size => items.sort_by(|left, right| left.size.cmp(&right.size)),
    SortMode::Modified => items.sort_by(|left, right| left.modified_at.cmp(&right.modified_at)),
    SortMode::Type => items.sort_by(|left, right| left.extension.cmp(&right.extension)),
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  fn item(name: &str, size: Option<u64>) -> SearchResultItem {
    SearchResultItem {
      name: name.to_string(),
      size,
      ..SearchResultItem::default()
    }
  }

  #[test]
  fn sort_results_by_name_orders_ascending() {
    let mut items = vec![
      item("zeta.txt", Some(3)),
      item("alpha.txt", Some(1)),
      item("beta.txt", Some(2)),
    ];

    sort_results(&mut items, &SortMode::Name);

    let names: Vec<_> = items.iter().map(|item| item.name.as_str()).collect();
    assert_eq!(names, vec!["alpha.txt", "beta.txt", "zeta.txt"]);
  }

  #[test]
  fn sort_results_by_size_orders_ascending() {
    let mut items = vec![
      item("large.txt", Some(300)),
      item("small.txt", Some(100)),
      item("medium.txt", Some(200)),
    ];

    sort_results(&mut items, &SortMode::Size);

    let sizes: Vec<_> = items.iter().map(|item| item.size).collect();
    assert_eq!(sizes, vec![Some(100), Some(200), Some(300)]);
  }

  #[test]
  fn sort_results_by_relevance_uses_score_desc() {
    let mut items = vec![
      SearchResultItem {
        name: "c".to_string(),
        score: Some(0.2),
        ..SearchResultItem::default()
      },
      SearchResultItem {
        name: "a".to_string(),
        score: Some(0.9),
        ..SearchResultItem::default()
      },
      SearchResultItem {
        name: "b".to_string(),
        score: Some(0.5),
        ..SearchResultItem::default()
      },
    ];

    sort_results(&mut items, &SortMode::Relevance);
    let names: Vec<_> = items.iter().map(|item| item.name.as_str()).collect();
    assert_eq!(names, vec!["a", "b", "c"]);
  }

  #[test]
  fn sort_results_by_modified_orders_ascending() {
    let mut items = vec![
      SearchResultItem {
        name: "late".to_string(),
        modified_at: Some("2026-03-25T12:00:00Z".to_string()),
        ..SearchResultItem::default()
      },
      SearchResultItem {
        name: "early".to_string(),
        modified_at: Some("2026-03-25T11:00:00Z".to_string()),
        ..SearchResultItem::default()
      },
    ];

    sort_results(&mut items, &SortMode::Modified);
    let names: Vec<_> = items.iter().map(|item| item.name.as_str()).collect();
    assert_eq!(names, vec!["early", "late"]);
  }

  #[test]
  fn sort_results_by_type_orders_ascending() {
    let mut items = vec![
      SearchResultItem {
        name: "b".to_string(),
        extension: Some("txt".to_string()),
        ..SearchResultItem::default()
      },
      SearchResultItem {
        name: "a".to_string(),
        extension: Some("md".to_string()),
        ..SearchResultItem::default()
      },
    ];

    sort_results(&mut items, &SortMode::Type);
    let names: Vec<_> = items.iter().map(|item| item.name.as_str()).collect();
    assert_eq!(names, vec!["a", "b"]);
  }
}
