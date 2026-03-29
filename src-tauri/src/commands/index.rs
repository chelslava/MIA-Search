use crate::core::index_service::IndexService;
use crate::storage::index_store::IndexSnapshot;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::atomic::Ordering;
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
  pub root_paths: Vec<String>,
  pub updated_at: String,
}

struct RebuildFlagGuard<'a> {
  flag: &'a AtomicBool,
}

impl Drop for RebuildFlagGuard<'_> {
  fn drop(&mut self) {
    self.flag.store(false, Ordering::Release);
  }
}

fn acquire_rebuild_guard<'a>(flag: &'a AtomicBool) -> Result<RebuildFlagGuard<'a>, String> {
  flag
    .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
    .map_err(|_| "index rebuild already in progress".to_string())?;
  Ok(RebuildFlagGuard { flag })
}

#[tauri::command]
pub fn index_rebuild(state: State<'_, AppState>, roots: Vec<String>) -> Result<IndexRebuildResponse, String> {
  let _guard = acquire_rebuild_guard(&state.index_rebuild_in_progress)?;

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
  let rebuild_in_progress = state.index_rebuild_in_progress.load(Ordering::Acquire);
  let snapshot = state
    .index
    .lock()
    .map_err(|_| "index store lock poisoned".to_string())?
    .snapshot();

  Ok(status_from_snapshot(&snapshot, rebuild_in_progress))
}

fn status_from_snapshot(snapshot: &IndexSnapshot, rebuild_in_progress: bool) -> IndexStatusResponse {
  IndexStatusResponse {
    status: if rebuild_in_progress {
      "in_progress".to_string()
    } else if snapshot.entries.is_empty() {
      "empty".to_string()
    } else {
      "ready".to_string()
    },
    entries: snapshot.entries.len(),
    roots: snapshot.roots.len(),
    root_paths: snapshot.roots.clone(),
    updated_at: snapshot.updated_at.clone(),
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn status_from_snapshot_reports_empty_and_ready() {
    let empty = IndexSnapshot::default();
    let status_empty = status_from_snapshot(&empty, false);
    assert_eq!(status_empty.status, "empty");

    let ready = IndexSnapshot {
      version: 1,
      updated_at: "2026-03-25T10:00:00Z".to_string(),
      roots: vec!["C:\\".to_string()],
      entries: vec![crate::core::models::SearchResultItem::default()],
    };
    let status_ready = status_from_snapshot(&ready, false);
    assert_eq!(status_ready.status, "ready");
    assert_eq!(status_ready.entries, 1);
    assert_eq!(status_ready.roots, 1);
    assert_eq!(status_ready.root_paths, vec!["C:\\"]);
  }

  #[test]
  fn status_from_snapshot_reports_in_progress() {
    let snapshot = IndexSnapshot::default();
    let status = status_from_snapshot(&snapshot, true);
    assert_eq!(status.status, "in_progress");
  }

  #[test]
  fn acquire_rebuild_guard_rejects_parallel_attempts() {
    let flag = AtomicBool::new(false);
    let _first = acquire_rebuild_guard(&flag).expect("first acquire");
    match acquire_rebuild_guard(&flag) {
      Ok(_) => panic!("second acquire should fail"),
      Err(message) => assert_eq!(message, "index rebuild already in progress"),
    };
  }

  #[test]
  fn acquire_rebuild_guard_releases_flag_on_drop() {
    let flag = AtomicBool::new(false);
    {
      let _guard = acquire_rebuild_guard(&flag).expect("acquire");
      assert!(flag.load(Ordering::Acquire));
    }
    assert!(!flag.load(Ordering::Acquire));
    let again = acquire_rebuild_guard(&flag);
    assert!(again.is_ok());
  }
}
