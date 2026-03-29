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
  match item.size {
    Some(size) => match filter.comparison {
      SizeComparison::Smaller => size < filter.bytes,
      SizeComparison::Equal => size == filter.bytes,
      SizeComparison::Greater => size > filter.bytes,
    },
    None => match filter.comparison {
      SizeComparison::Smaller => true,
      SizeComparison::Equal => false,
      SizeComparison::Greater => true,
    },
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
  fn matches_entry_kind_handles_any_file_and_directory() {
    let file_item = SearchResultItem {
      is_file: true,
      ..SearchResultItem::default()
    };
    let dir_item = SearchResultItem {
      is_dir: true,
      ..SearchResultItem::default()
    };

    assert!(matches_entry_kind(&file_item, &EntryKind::Any));
    assert!(matches_entry_kind(&file_item, &EntryKind::File));
    assert!(!matches_entry_kind(&file_item, &EntryKind::Directory));
    assert!(matches_entry_kind(&dir_item, &EntryKind::Any));
    assert!(!matches_entry_kind(&dir_item, &EntryKind::File));
    assert!(matches_entry_kind(&dir_item, &EntryKind::Directory));
  }

  #[test]
  fn matches_size_accepts_missing_filter_and_handles_unknown_size() {
    assert!(matches_size(&sample_item(None), &None));

    let smaller = Some(SizeFilter {
      comparison: SizeComparison::Smaller,
      bytes: 1,
    });
    let equal = Some(SizeFilter {
      comparison: SizeComparison::Equal,
      bytes: 0,
    });
    let greater = Some(SizeFilter {
      comparison: SizeComparison::Greater,
      bytes: 0,
    });

    assert!(matches_size(&sample_item(None), &smaller));
    assert!(!matches_size(&sample_item(None), &equal));
    assert!(matches_size(&sample_item(None), &greater));
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
  fn matches_date_accepts_missing_filter_missing_value_and_invalid_input() {
    let filter = Some(DateFilter {
      field: DateField::Modified,
      comparison: DateComparison::Before,
      value: "2026-03-25T12:00:00Z".to_string(),
    });

    assert!(matches_date(&Some("not-a-date".to_string()), &filter));
    assert!(matches_date(&None, &filter));
    assert!(matches_date(&Some("2026-03-25T12:00:00Z".to_string()), &None));
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
