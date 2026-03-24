use crate::core::models::{
  DateComparison, DateFilter, EntryKind, SearchResultItem, SizeComparison, SizeFilter,
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
