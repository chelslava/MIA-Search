use crate::core::models::SearchResultItem;
use chrono::Utc;
use std::path::{Path, PathBuf};

pub struct AsyncMetadataService;

impl AsyncMetadataService {
  pub async fn lightweight_path(path: impl AsRef<Path>, source_root: impl AsRef<Path>) -> SearchResultItem {
    let path = path.as_ref();
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
    
    let (is_file, is_dir) = match tokio::fs::metadata(path).await {
      Ok(meta) => (meta.is_file(), meta.is_dir()),
      Err(error) => {
        log::debug!("metadata lookup failed for {}: {}", path.display(), error);
        (false, false)
      }
    };

    SearchResultItem {
      name: file_name.clone(),
      full_path: path.to_string_lossy().to_string(),
      parent_path,
      is_file,
      is_dir,
      extension,
      size: None,
      created_at: None,
      modified_at: None,
      hidden: file_name.starts_with('.'),
      score: None,
      source_root: source_root.as_ref().to_string_lossy().to_string(),
    }
  }

  pub async fn enrich_path(path: impl AsRef<Path>, source_root: impl AsRef<Path>) -> SearchResultItem {
    let path = path.as_ref();
    let metadata = tokio::fs::metadata(path).await;
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
      Err(error) => {
        log::debug!("metadata lookup failed for {}: {}", path.display(), error);
        (false, false, None, None, None)
      }
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

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs;
  use tempfile::tempdir;
  use tokio::test as async_test;

  #[async_test]
  async fn enrich_path_reads_file_metadata_and_extension() {
    let dir = tempdir().expect("tempdir");
    let file_path = dir.path().join("report.txt");
    fs::write(&file_path, "hello world").expect("write file");

    let item = AsyncMetadataService::enrich_path(&file_path, dir.path()).await;

    assert_eq!(item.name, "report.txt");
    assert!(item.is_file);
    assert!(!item.is_dir);
    assert_eq!(item.extension.as_deref(), Some("txt"));
    assert_eq!(item.source_root, dir.path().to_string_lossy().to_string());
    assert!(item.size.is_some());
  }

  #[async_test]
  async fn enrich_path_marks_hidden_by_name_prefix() {
    let dir = tempdir().expect("tempdir");
    let file_path = dir.path().join(".secret");
    fs::write(&file_path, "x").expect("write hidden");

    let item = AsyncMetadataService::enrich_path(&file_path, dir.path()).await;
    assert!(item.hidden);
  }

  #[async_test]
  async fn enrich_path_handles_missing_path_without_panic() {
    let dir = tempdir().expect("tempdir");
    let missing = dir.path().join("missing.bin");

    let item = AsyncMetadataService::enrich_path(&missing, dir.path()).await;
    assert_eq!(item.name, "missing.bin");
    assert!(!item.is_file);
    assert!(!item.is_dir);
    assert_eq!(item.size, None);
  }

  #[async_test]
  async fn lightweight_path_omits_heavy_metadata_fields() {
    let dir = tempdir().expect("tempdir");
    let file_path = dir.path().join("light.txt");
    fs::write(&file_path, "hello").expect("write file");

    let item = AsyncMetadataService::lightweight_path(&file_path, dir.path()).await;
    assert_eq!(item.name, "light.txt");
    assert!(item.is_file);
    assert_eq!(item.size, None);
    assert!(item.created_at.is_none());
    assert!(item.modified_at.is_none());
  }
}
