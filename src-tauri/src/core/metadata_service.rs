use crate::core::models::SearchResultItem;
use chrono::Utc;
use std::path::{Path, PathBuf};

#[derive(Debug, Default, Clone)]
pub struct MetadataService;

impl MetadataService {
  pub fn enrich_path(path: impl AsRef<Path>, source_root: impl AsRef<Path>) -> SearchResultItem {
    let path = path.as_ref();
    let metadata = std::fs::metadata(path);
    let file_name = path
      .file_name()
      .and_then(|value| value.to_str())
      .unwrap_or_default()
      .to_string();
    let parent_path = path
      .parent()
      .map(PathBuf::from)
      .and_then(|value| value.to_str().map(|text| text.to_string()))
      .unwrap_or_default();
    let extension = path.extension().and_then(|value| value.to_str()).map(|value| value.to_string());
    let (is_file, is_dir, size, modified_at, created_at) = match metadata {
      Ok(metadata) => {
        let modified_at = metadata
          .modified()
          .ok()
          .map(|value| chrono::DateTime::<Utc>::from(value).to_rfc3339());
        let created_at = metadata
          .created()
          .ok()
          .map(|value| chrono::DateTime::<Utc>::from(value).to_rfc3339());
        (metadata.is_file(), metadata.is_dir(), Some(metadata.len()), modified_at, created_at)
      }
      Err(_) => (false, false, None, None, None),
    };

    SearchResultItem {
      name: file_name.clone(),
      full_path: path.to_string_lossy().to_string(),
      parent_path,
      is_file,
      is_dir,
      extension,
      size,
      created_at,
      modified_at,
      hidden: file_name.starts_with('.'),
      score: None,
      source_root: source_root.as_ref().to_string_lossy().to_string(),
    }
  }
}
