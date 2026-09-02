use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const MAX_RECENT_ERRORS: usize = 50;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ErrorRecord {
    pub timestamp: String,
    pub source: String,
    pub level: String,
    pub context: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CrashReport {
    pub timestamp: String,
    pub panic_message: String,
    pub location: String,
    pub os_info: String,
    pub app_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticReport {
    pub generated_at: String,
    pub app_version: String,
    pub os_info: String,
    pub telemetry_enabled: bool,
    pub anonymous_id: String,
    pub recent_errors: Vec<ErrorRecord>,
    pub crash_reports_count: usize,
}

struct ErrorTrackerState {
    recent_errors: VecDeque<ErrorRecord>,
    crashes_dir: Option<PathBuf>,
}

static ERROR_TRACKER: Mutex<Option<ErrorTrackerState>> = Mutex::new(None);

/// Initializes the error tracker and crash directory.
pub fn init_error_tracker(data_dir: &Path) {
    let crashes_dir = data_dir.join("crashes");
    let _ = fs::create_dir_all(&crashes_dir);

    if let Ok(mut lock) = ERROR_TRACKER.lock() {
        if let Some(state) = lock.as_mut() {
            state.crashes_dir = Some(crashes_dir.clone());
        } else {
            *lock = Some(ErrorTrackerState {
                recent_errors: VecDeque::with_capacity(MAX_RECENT_ERRORS),
                crashes_dir: Some(crashes_dir.clone()),
            });
        }
    }

    init_panic_hook(crashes_dir);
}

/// Sets up a global Rust panic hook that writes structured crash reports.
fn init_panic_hook(crashes_dir: PathBuf) {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        let timestamp = Utc::now().to_rfc3339();
        let message = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic payload".to_string()
        };

        let location = panic_info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".to_string());

        let os_info = format!("{} {}", std::env::consts::OS, std::env::consts::ARCH);
        let app_version = env!("CARGO_PKG_VERSION").to_string();

        let crash_report = CrashReport {
            timestamp: timestamp.clone(),
            panic_message: message.clone(),
            location,
            os_info,
            app_version,
        };

        record_error("panic", "panic", "RustPanicHook", &message);

        // Persist crash report to disk
        let filename = format!("crash_{}.json", Utc::now().format("%Y%m%d_%H%M%S_%3f"));
        let file_path = crashes_dir.join(filename);
        if let Ok(json) = serde_json::to_string_pretty(&crash_report) {
            let _ = fs::write(file_path, json);
        }

        default_hook(panic_info);
    }));
}

/// Records an error in the in-memory circular buffer.
pub fn record_error(source: &str, level: &str, context: &str, message: &str) {
    let record = ErrorRecord {
        timestamp: Utc::now().to_rfc3339(),
        source: source.to_string(),
        level: level.to_string(),
        context: context.to_string(),
        message: message.to_string(),
    };

    if let Ok(mut lock) = ERROR_TRACKER.lock() {
        let state = lock.get_or_insert_with(|| ErrorTrackerState {
            recent_errors: VecDeque::with_capacity(MAX_RECENT_ERRORS),
            crashes_dir: None,
        });
        if state.recent_errors.len() >= MAX_RECENT_ERRORS {
            state.recent_errors.pop_front();
        }
        state.recent_errors.push_back(record);
    }
}

/// Returns a copy of recent recorded errors.
pub fn get_recent_errors() -> Vec<ErrorRecord> {
    if let Ok(lock) = ERROR_TRACKER.lock() {
        if let Some(state) = lock.as_ref() {
            return state.recent_errors.iter().cloned().collect();
        }
    }
    Vec::new()
}

/// Reads saved crash reports from the crash reports directory.
pub fn get_crash_reports() -> Vec<CrashReport> {
    let mut reports = Vec::new();
    let dir = if let Ok(lock) = ERROR_TRACKER.lock() {
        lock.as_ref().and_then(|s| s.crashes_dir.clone())
    } else {
        None
    };

    let Some(crashes_dir) = dir else {
        return reports;
    };

    if let Ok(entries) = fs::read_dir(crashes_dir) {
        for entry in entries.flatten() {
            if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(entry.path()) {
                    if let Ok(report) = serde_json::from_str::<CrashReport>(&content) {
                        reports.push(report);
                    }
                }
            }
        }
    }

    reports.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    reports
}

/// Generates an anonymous diagnostic report string with stripped sensitive details.
pub fn generate_diagnostic_report(telemetry_enabled: bool, anonymous_id: &str) -> DiagnosticReport {
    let recent = get_recent_errors();
    let crash_count = get_crash_reports().len();

    // Sanitize error messages to remove user home directories
    let sanitized_errors = recent
        .into_iter()
        .map(|mut r| {
            r.message = sanitize_paths(&r.message);
            r.context = sanitize_paths(&r.context);
            r
        })
        .collect();

    DiagnosticReport {
        generated_at: Utc::now().to_rfc3339(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        os_info: format!("{} {}", std::env::consts::OS, std::env::consts::ARCH),
        telemetry_enabled,
        anonymous_id: anonymous_id.to_string(),
        recent_errors: sanitized_errors,
        crash_reports_count: crash_count,
    }
}

/// Clears recorded in-memory errors and saved crash dumps.
pub fn clear_errors_and_crashes() -> Result<(), String> {
    if let Ok(mut lock) = ERROR_TRACKER.lock() {
        if let Some(state) = lock.as_mut() {
            state.recent_errors.clear();
            if let Some(crashes_dir) = &state.crashes_dir {
                if let Ok(entries) = fs::read_dir(crashes_dir) {
                    for entry in entries.flatten() {
                        let _ = fs::remove_file(entry.path());
                    }
                }
            }
        }
    }
    Ok(())
}

fn sanitize_paths(input: &str) -> String {
    // Replace typical user path prefixes with generic placeholders
    let mut out = input.to_string();
    if let Ok(home) = std::env::var("USERPROFILE") {
        if !home.is_empty() {
            out = out.replace(&home, "<USER_HOME>");
        }
    }
    if let Ok(home) = std::env::var("HOME") {
        if !home.is_empty() {
            out = out.replace(&home, "<USER_HOME>");
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn record_and_get_recent_errors_works() {
        let dir = tempdir().expect("tempdir");
        init_error_tracker(dir.path());

        record_error("frontend", "error", "TestContext", "Test error message");
        let errors = get_recent_errors();
        assert!(!errors.is_empty());
        let last = errors.last().unwrap();
        assert_eq!(last.source, "frontend");
        assert_eq!(last.level, "error");
        assert_eq!(last.context, "TestContext");
        assert_eq!(last.message, "Test error message");
    }

    #[test]
    fn generate_diagnostic_report_creates_valid_structure() {
        let dir = tempdir().expect("tempdir");
        init_error_tracker(dir.path());

        record_error("backend", "warn", "SyncWorker", "Connection timeout");
        let report = generate_diagnostic_report(true, "anon-123");
        assert_eq!(report.anonymous_id, "anon-123");
        assert!(report.telemetry_enabled);
        assert!(!report.recent_errors.is_empty());
    }

    #[test]
    fn clear_errors_and_crashes_resets_state() {
        let dir = tempdir().expect("tempdir");
        init_error_tracker(dir.path());

        record_error("backend", "error", "DB", "Disk full");
        assert!(!get_recent_errors().is_empty());

        clear_errors_and_crashes().expect("clear");
        assert!(get_recent_errors().is_empty());
    }
}
