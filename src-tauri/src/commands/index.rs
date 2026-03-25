use crate::core::index_service::IndexService;
use crate::storage::index_store::IndexSnapshot;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexRebuildResponse {
  pub status: String,
  pub roots: usize,
  pub entries: usize,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStatusResponse {
  pub status: String,
  pub entries: usize,
  pub roots: usize,
  pub updated_at: String,
}

#[tauri::command]
pub fn index_rebuild(state: State<'_, AppState>, roots: Vec<String>) -> Result<IndexRebuildResponse, String> {
  let cancel = Arc::new(AtomicBool::new(false));
  let (snapshot, summary) = IndexService::rebuild(&roots, cancel)?;

  let updated_at = snapshot.updated_at.clone();
  {
    let mut index = state
      .index
      .lock()
      .map_err(|_| "index store lock poisoned".to_string())?;
    index.replace(snapshot);
    index.persist()?;
  }

  Ok(IndexRebuildResponse {
    status: "ok".to_string(),
    roots: summary.roots,
    entries: summary.entries,
    updated_at,
  })
}

#[tauri::command]
pub fn index_status(state: State<'_, AppState>) -> Result<IndexStatusResponse, String> {
  let snapshot = state
    .index
    .lock()
    .map_err(|_| "index store lock poisoned".to_string())?
    .snapshot();

  Ok(status_from_snapshot(&snapshot))
}

fn status_from_snapshot(snapshot: &IndexSnapshot) -> IndexStatusResponse {
  IndexStatusResponse {
    status: if snapshot.entries.is_empty() {
      "empty".to_string()
    } else {
      "ready".to_string()
    },
    entries: snapshot.entries.len(),
    roots: snapshot.roots.len(),
    updated_at: snapshot.updated_at.clone(),
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn status_from_snapshot_reports_empty_and_ready() {
    let empty = IndexSnapshot::default();
    let status_empty = status_from_snapshot(&empty);
    assert_eq!(status_empty.status, "empty");

    let ready = IndexSnapshot {
      version: 1,
      updated_at: "2026-03-25T10:00:00Z".to_string(),
      roots: vec!["C:\\".to_string()],
      entries: vec![crate::core::models::SearchResultItem::default()],
    };
    let status_ready = status_from_snapshot(&ready);
    assert_eq!(status_ready.status, "ready");
    assert_eq!(status_ready.entries, 1);
    assert_eq!(status_ready.roots, 1);
  }
}

