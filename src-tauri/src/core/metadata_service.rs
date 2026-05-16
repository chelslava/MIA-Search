use crate::core::models::SearchResultItem;
use chrono::Utc;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Icon metadata for a file type.
#[derive(Debug, Clone, PartialEq)]
pub struct Icon {
  pub name: String,
}

/// Metadata service with icon caching.
///
/// Icons are cached by file extension to avoid repeated filesystem calls
/// for the same extension across different results.
#[derive(Debug, Default)]
pub struct MetadataService {
  #[allow(dead_code)]
  pub icon_cache: Mutex<HashMap<String, Icon>>,
}

impl MetadataService {
  pub fn lightweight_path(path: impl AsRef<Path>, source_root: impl AsRef<Path>) -> SearchResultItem {
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
    let (is_file, is_dir) = match std::fs::metadata(path) {
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

#[allow(dead_code)]
impl MetadataService {
  pub fn new() -> Self {
    Self::default()
  }

  pub fn get_file_icon(&self, path: &str, extension: &str) -> Result<Icon, String> {
    {
      let cache = self.icon_cache.lock().map_err(|_| "icon cache lock poisoned".to_string())?;
      if let Some(icon) = cache.get(extension) {
        return Ok(icon.clone());
      }
    }

    let icon = self.get_file_icon_uncached(path, extension)?;

    {
      let mut cache = self.icon_cache.lock().map_err(|_| "icon cache lock poisoned".to_string())?;
      cache.insert(extension.to_string(), icon.clone());
    }

    Ok(icon)
  }

  fn get_file_icon_uncached(&self, _path: &str, extension: &str) -> Result<Icon, String> {
    let name = if extension.is_empty() {
      "file".to_string()
    } else {
      extension.to_string()
    };
    Ok(Icon { name })
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs;
  use tempfile::tempdir;

  #[test]
  fn enrich_path_reads_file_metadata_and_extension() {
    let dir = tempdir().expect("tempdir");
    let file_path = dir.path().join("report.txt");
    fs::write(&file_path, "hello world").expect("write file");

    let item = MetadataService::enrich_path(&file_path, dir.path());

    assert_eq!(item.name, "report.txt");
    assert!(item.is_file);
    assert!(!item.is_dir);
    assert_eq!(item.extension.as_deref(), Some("txt"));
    assert_eq!(item.source_root, dir.path().to_string_lossy().to_string());
    assert!(item.size.is_some());
  }

  #[test]
  fn enrich_path_marks_hidden_by_name_prefix() {
    let dir = tempdir().expect("tempdir");
    let file_path = dir.path().join(".secret");
    fs::write(&file_path, "x").expect("write hidden");

    let item = MetadataService::enrich_path(&file_path, dir.path());
    assert!(item.hidden);
  }

  #[test]
  fn enrich_path_handles_missing_path_without_panic() {
    let dir = tempdir().expect("tempdir");
    let missing = dir.path().join("missing.bin");

    let item = MetadataService::enrich_path(&missing, dir.path());
    assert_eq!(item.name, "missing.bin");
    assert!(!item.is_file);
    assert!(!item.is_dir);
    assert_eq!(item.size, None);
  }

  #[test]
  fn lightweight_path_omits_heavy_metadata_fields() {
    let dir = tempdir().expect("tempdir");
    let file_path = dir.path().join("light.txt");
    fs::write(&file_path, "hello").expect("write file");

    let item = MetadataService::lightweight_path(&file_path, dir.path());
    assert_eq!(item.name, "light.txt");
    assert!(item.is_file);
    assert_eq!(item.size, None);
    assert!(item.created_at.is_none());
    assert!(item.modified_at.is_none());
  }

  #[test]
  fn get_file_icon_caches_by_extension() {
    let service = MetadataService::new();

    // First call - should call the underlying method
    let icon1 = service.get_file_icon("/path/to/file.txt", "txt");
    assert!(icon1.is_ok());

    // Second call with same extension - should be cached
    let icon2 = service.get_file_icon("/different/path/file.txt", "txt");
    assert!(icon2.is_ok());

    // Verify same icon is returned for the same extension
    assert_eq!(icon1.unwrap().name, icon2.unwrap().name);
  }

  #[test]
  fn get_file_icon_different_extensions_do_not_collide() {
    let service = MetadataService::new();

    let icon_txt = service.get_file_icon("/path/file.txt", "txt");
    let icon_pdf = service.get_file_icon("/path/file.pdf", "pdf");

    assert!(icon_txt.is_ok());
    assert!(icon_pdf.is_ok());

    // The icons for .txt and .pdf should be different
    assert_ne!(icon_txt.unwrap().name, icon_pdf.unwrap().name);
  }
}
