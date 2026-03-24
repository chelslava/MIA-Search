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
