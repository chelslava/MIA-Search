use crate::core::constants::ENTRY_OVERHEAD_BYTES;
use crate::core::models::SearchResultItem;

pub fn estimate_entry_size(entry: &SearchResultItem) -> usize {
    entry.full_path.len()
        + entry.name.len()
        + entry.extension.as_ref().map_or(0, |e| e.len())
        + entry.created_at.as_ref().map_or(0, |c| c.len())
        + entry.modified_at.as_ref().map_or(0, |m| m.len())
        + ENTRY_OVERHEAD_BYTES
}
