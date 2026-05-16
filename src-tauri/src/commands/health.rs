use crate::core::models::CommandStatus;
use crate::storage::persistence;
use crate::AppState;
use serde::{Deserialize, Serialize};
use std::sync::atomic::Ordering;
use tauri::State;

/// Aggregated app health information for diagnostics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckResponse {
    pub status: String,
    pub search_session_status: String,
    pub active_search_id: Option<u64>,
    pub index_status: String,
    pub index_entries: usize,
    pub index_roots: usize,
    pub index_version_mismatch: bool,
    pub index_rebuild_in_progress: bool,
    pub index_rebuild_entries_count: usize,
    pub settings_status: String,
    pub cache_status: String,
    pub storage_status: String,
    pub storage_path: String,
    pub storage_message: Option<String>,
}

/// Returns a snapshot of app/backend subsystem health.
#[tauri::command]
pub fn health_check(state: State<'_, AppState>) -> Result<HealthCheckResponse, String> {
    health_check_inner(state.inner())
}

fn health_check_inner(state: &AppState) -> Result<HealthCheckResponse, String> {
    let search_snapshot = crate::lock_mutex!(state.search_session, "search_session").snapshot();
    let search_session_status = command_status_label(&search_snapshot.status).to_string();
    let cache_status = if search_snapshot.active_search_id.is_some() {
        "active"
    } else {
        "idle"
    }
    .to_string();

    let settings_snapshot = crate::lock_mutex!(state.settings, "settings").snapshot();
    let settings_ok = !settings_snapshot.language.trim().is_empty()
        && !settings_snapshot.date_format.trim().is_empty()
        && !settings_snapshot.size_unit.trim().is_empty()
        && settings_snapshot.max_history_entries > 0;
    let settings_status = if settings_ok { "ok" } else { "invalid" }.to_string();

    let index_rebuild_in_progress = state.index_rebuild_in_progress.load(Ordering::Acquire);
    let index_rebuild_entries_count = state.index_rebuild_entries.load(Ordering::Acquire);
    let (index_status, index_entries, index_roots, index_version_mismatch) = {
        let index = crate::lock_mutex!(state.index, "index");
        let snapshot = index.snapshot();
        let version_mismatch = index.version_mismatch();
        let status = if index_rebuild_in_progress {
            "in_progress"
        } else if version_mismatch {
            "version_mismatch"
        } else if snapshot.entries.is_empty() {
            "empty"
        } else {
            "ready"
        };
        (
            status.to_string(),
            snapshot.entries.len(),
            snapshot.roots.len(),
            version_mismatch,
        )
    };

    let storage_path = persistence::data_dir();
    let (storage_status, storage_message) = match persistence::check_disk_space(&storage_path, 1) {
        Ok(()) => ("ok".to_string(), None),
        Err(message) => ("error".to_string(), Some(message)),
    };

    let status = if settings_ok && !index_version_mismatch && storage_status == "ok" {
        "ok"
    } else {
        "degraded"
    }
    .to_string();

    Ok(HealthCheckResponse {
        status,
        search_session_status,
        active_search_id: search_snapshot.active_search_id,
        index_status,
        index_entries,
        index_roots,
        index_version_mismatch,
        index_rebuild_in_progress,
        index_rebuild_entries_count,
        settings_status,
        cache_status,
        storage_status,
        storage_path: storage_path.to_string_lossy().to_string(),
        storage_message,
    })
}

fn command_status_label(status: &CommandStatus) -> &'static str {
    match status {
        CommandStatus::Idle => "idle",
        CommandStatus::Accepted => "accepted",
        CommandStatus::Cancelled => "cancelled",
        CommandStatus::NotFound => "not_found",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::persistence::with_test_data_dir;

    #[test]
    fn health_check_reports_default_state() {
        with_test_data_dir(|| {
            let state = AppState::bootstrap();
            let health = health_check_inner(&state).expect("health");

            assert_eq!(health.status, "ok");
            assert_eq!(health.search_session_status, "idle");
            assert_eq!(health.index_status, "empty");
            assert_eq!(health.settings_status, "ok");
            assert_eq!(health.cache_status, "idle");
            assert_eq!(health.storage_status, "ok");
            assert!(health.storage_message.is_none());
            assert!(!health.storage_path.is_empty());
        });
    }
}
