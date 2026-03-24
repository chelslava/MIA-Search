use crate::core::models::{
  DateComparison, DateField, DateFilter, EntryKind, SearchResultItem, SizeComparison, SizeFilter,
};
use chrono::{DateTime, Utc};

pub fn matches_entry_kind(item: &SearchResultItem, kind: &EntryKind) -> bool {
  match kind {
    EntryKind::Any => true,
    EntryKind::File => item.is_file,
    EntryKind::Directory => item.is_dir,
  }
}

pub fn matches_size(item: &SearchResultItem, filter: &Option<SizeFilter>) -> bool {
  let Some(filter) = filter else {
    return true;
  };
  let size = item.size.unwrap_or(0);
  match filter.comparison {
    SizeComparison::Smaller => size < filter.bytes,
    SizeComparison::Equal => size == filter.bytes,
    SizeComparison::Greater => size > filter.bytes,
  }
}

pub fn matches_date(value: &Option<String>, filter: &Option<DateFilter>) -> bool {
  let Some(filter) = filter else {
    return true;
  };
  let Some(value) = value else {
    return true;
  };

  let parsed_value = DateTime::parse_from_rfc3339(value);
  let parsed_filter = DateTime::parse_from_rfc3339(&filter.value);
  let (Ok(value), Ok(filter_value)) = (parsed_value, parsed_filter) else {
    return true;
  };

  let value = value.with_timezone(&Utc);
  let filter_value = filter_value.with_timezone(&Utc);

  match filter.comparison {
    DateComparison::Before => value < filter_value,
    DateComparison::After => value > filter_value,
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  fn sample_item(size: Option<u64>) -> SearchResultItem {
    SearchResultItem {
      size,
      ..SearchResultItem::default()
    }
  }

  #[test]
  fn matches_size_handles_smaller_equal_and_greater() {
    let smaller = Some(SizeFilter {
      comparison: SizeComparison::Smaller,
      bytes: 200,
    });
    let equal = Some(SizeFilter {
      comparison: SizeComparison::Equal,
      bytes: 200,
    });
    let greater = Some(SizeFilter {
      comparison: SizeComparison::Greater,
      bytes: 200,
    });

    assert!(matches_size(&sample_item(Some(150)), &smaller));
    assert!(!matches_size(&sample_item(Some(250)), &smaller));
    assert!(matches_size(&sample_item(Some(200)), &equal));
    assert!(!matches_size(&sample_item(Some(199)), &equal));
    assert!(matches_size(&sample_item(Some(250)), &greater));
    assert!(!matches_size(&sample_item(Some(200)), &greater));
  }

  #[test]
  fn matches_date_handles_before_and_after_with_rfc3339() {
    let before = Some(DateFilter {
      field: DateField::Modified,
      comparison: DateComparison::Before,
      value: "2026-03-25T12:00:00Z".to_string(),
    });
    let after = Some(DateFilter {
      field: DateField::Created,
      comparison: DateComparison::After,
      value: "2026-03-25T12:00:00Z".to_string(),
    });

    let earlier = Some("2026-03-25T11:59:59Z".to_string());
    let later = Some("2026-03-25T12:00:01Z".to_string());
    let equal = Some("2026-03-25T12:00:00Z".to_string());

    assert!(matches_date(&earlier, &before));
    assert!(!matches_date(&later, &before));
    assert!(matches_date(&later, &after));
    assert!(!matches_date(&equal, &after));
  }
}
