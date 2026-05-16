use crate::core::index_service::IndexService;
use crate::storage::index_store::IndexSnapshot;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::atomic::AtomicBool;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};

/// Response returned after index rebuild completes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexRebuildResponse {
    pub status: String,
    pub roots: usize,
    pub entries: usize,
    pub updated_at: String,
    pub memory_mb: usize,
    pub truncated: bool,
}

/// Current status of the search index.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStatusResponse {
    pub status: String,
    pub entries: usize,
    pub roots: usize,
    pub root_paths: Vec<String>,
    pub updated_at: String,
    pub version_mismatch: bool,
    pub rebuild_entries_count: usize,
}

/// Event emitted during index rebuild to report progress.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexProgressEvent {
    pub entries: usize,
    pub roots: usize,
}

/// Event emitted when index rebuild completes successfully.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexDoneEvent {
    pub status: String,
    pub entries: usize,
    pub roots: usize,
    pub updated_at: String,
    pub memory_mb: usize,
    pub truncated: bool,
}

/// Event emitted when index rebuild fails.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexErrorEvent {
    pub message: String,
}

/// Rebuilds the search index from the specified root directories.
///
/// Only one rebuild can run at a time. The work is dispatched to a background
/// thread so the frontend remains responsive. Progress and completion are
/// communicated via Tauri events: `index:progress`, `index:done`, `index:error`.
#[tauri::command]
pub fn index_rebuild(
    app: AppHandle,
    state: State<'_, AppState>,
    roots: Vec<String>,
) -> Result<IndexRebuildResponse, String> {
    // Manual CAS — no guard because the background thread manages the flag.
    state
        .index_rebuild_in_progress
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .map_err(|_| "index rebuild already in progress".to_string())?;

    state.index_rebuild_entries.store(0, Ordering::Release);

    let cancel = Arc::new(AtomicBool::new(false));
    {
        let mut cancel_slot =
            crate::lock_mutex!(state.index_rebuild_cancel, "index_rebuild_cancel");
        *cancel_slot = Some(cancel.clone());
    }

    // Clone Arcs for the background thread.
    let rebuild_in_progress = state.index_rebuild_in_progress.clone();
    let index_rebuild_cancel = state.index_rebuild_cancel.clone();
    let index_rebuild_entries = state.index_rebuild_entries.clone();
    let index_store = state.index.clone();
    let roots_clone = roots.clone();
    let cancel_clone = cancel.clone();

    std::thread::spawn(move || {
        // Emit initial progress.
        let _ = app.emit(
            "index:progress",
            IndexProgressEvent {
                entries: 0,
                roots: roots_clone.len(),
            },
        );

        let result = IndexService::rebuild(
            &roots_clone,
            cancel_clone,
            Some(index_rebuild_entries),
        );

        // Clear the rebuild flag before emitting completion events.
        rebuild_in_progress.store(false, Ordering::Release);

        // Clear the cancel slot.
        {
            let mut cancel_slot = match index_rebuild_cancel.lock() {
                Ok(guard) => guard,
                Err(_) => return,
            };
            *cancel_slot = None;
        }

        match result {
            Ok((snapshot, summary)) => {
                let updated_at = snapshot.updated_at.clone();
                if let Ok(mut index) = index_store.lock() {
                    index.replace(snapshot);
                    let _ = index.persist();
                }
                let _ = app.emit(
                    "index:done",
                    IndexDoneEvent {
                        status: "ok".to_string(),
                        entries: summary.entries,
                        roots: summary.roots,
                        updated_at,
                        memory_mb: summary.memory_bytes / (1024 * 1024),
                        truncated: summary.truncated,
                    },
                );
            }
            Err(e) => {
                let _ = app.emit("index:error", IndexErrorEvent { message: e });
            }
        }
    });

    Ok(IndexRebuildResponse {
        status: "accepted".to_string(),
        roots: roots.len(),
        entries: 0,
        updated_at: String::new(),
        memory_mb: 0,
        truncated: false,
    })
}

/// Response returned by index_rebuild_cancel with completion status.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexRebuildCancelResponse {
    pub cancelled: bool,
    pub timed_out: bool,
}

/// Cancels an in-progress index rebuild operation.
///
/// Waits up to 2 seconds for the rebuild to complete after signalling cancellation.
/// Returns `cancelled: true` if rebuild was running, `timed_out: true` if it didn't
/// complete within the timeout.
#[tauri::command]
pub fn index_rebuild_cancel(
    state: State<'_, AppState>,
) -> Result<IndexRebuildCancelResponse, String> {
    let was_running = state.index_rebuild_in_progress.load(Ordering::Acquire);

    {
        let cancel_slot = crate::lock_mutex!(state.index_rebuild_cancel, "index_rebuild_cancel");
        if let Some(cancel) = cancel_slot.as_ref() {
            cancel.store(true, Ordering::Release);
        }
    }

    if !was_running {
        return Ok(IndexRebuildCancelResponse {
            cancelled: false,
            timed_out: false,
        });
    }

    let deadline = Instant::now() + Duration::from_secs(2);
    while Instant::now() < deadline {
        if !state.index_rebuild_in_progress.load(Ordering::Acquire) {
            return Ok(IndexRebuildCancelResponse {
                cancelled: true,
                timed_out: false,
            });
        }
        std::thread::sleep(Duration::from_millis(50));
    }

    Ok(IndexRebuildCancelResponse {
        cancelled: true,
        timed_out: true,
    })
}

/// Returns the current index status including entry count and rebuild state.
#[tauri::command]
pub fn index_status(state: State<'_, AppState>) -> Result<IndexStatusResponse, String> {
    let rebuild_in_progress = state.index_rebuild_in_progress.load(Ordering::Acquire);
    let rebuild_entries_count = state.index_rebuild_entries.load(Ordering::Acquire);
    let index = crate::lock_mutex!(state.index, "index");
    let snapshot = index.snapshot();
    let version_mismatch = index.version_mismatch();

    Ok(status_from_snapshot(
        &snapshot,
        rebuild_in_progress,
        version_mismatch,
        rebuild_entries_count,
    ))
}

fn status_from_snapshot(
    snapshot: &IndexSnapshot,
    rebuild_in_progress: bool,
    version_mismatch: bool,
    rebuild_entries_count: usize,
) -> IndexStatusResponse {
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
        version_mismatch,
        rebuild_entries_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_from_snapshot_reports_empty_and_ready() {
        let empty = IndexSnapshot::default();
        let status_empty = status_from_snapshot(&empty, false, false, 0);
        assert_eq!(status_empty.status, "empty");

        let ready = IndexSnapshot {
            version: 1,
            updated_at: "2026-03-25T10:00:00Z".to_string(),
            roots: vec!["C:\\".to_string()],
            entries: vec![crate::core::models::SearchResultItem::default()],
        };
        let status_ready = status_from_snapshot(&ready, false, false, 0);
        assert_eq!(status_ready.status, "ready");
        assert_eq!(status_ready.entries, 1);
        assert_eq!(status_ready.roots, 1);
        assert_eq!(status_ready.root_paths, vec!["C:\\"]);
    }

    #[test]
    fn status_from_snapshot_reports_in_progress() {
        let snapshot = IndexSnapshot::default();
        let status = status_from_snapshot(&snapshot, true, false, 500);
        assert_eq!(status.status, "in_progress");
        assert_eq!(status.rebuild_entries_count, 500);
    }

    #[test]
    fn status_from_snapshot_reports_version_mismatch() {
        let snapshot = IndexSnapshot::default();
        let status = status_from_snapshot(&snapshot, false, true, 0);
        assert!(status.version_mismatch);
    }

}
