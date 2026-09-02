use crate::platform::crash_reporter::{
    clear_errors_and_crashes, generate_diagnostic_report, get_crash_reports, get_recent_errors,
    record_error, CrashReport, DiagnosticReport, ErrorRecord,
};
use crate::AppState;
use tauri::State;

/// Retrieves recent in-memory recorded errors.
#[tauri::command]
pub fn error_report_get_recent() -> Result<Vec<ErrorRecord>, String> {
    Ok(get_recent_errors())
}

/// Ingests an error or unhandled rejection from the frontend into the unified error buffer.
#[tauri::command]
pub fn error_report_record_frontend(
    source: String,
    level: String,
    context: String,
    message: String,
) -> Result<(), String> {
    record_error(&source, &level, &context, &message);
    log::warn!("[FrontendError] [{}]: {}", context, message);
    Ok(())
}

/// Generates an anonymous diagnostic report containing sanitized error logs and app state.
#[tauri::command]
pub fn error_report_export_diagnostics(
    state: State<'_, AppState>,
) -> Result<DiagnosticReport, String> {
    let settings = state
        .settings
        .lock()
        .map_err(|_| "settings lock poisoned".to_string())?
        .snapshot();

    let report = generate_diagnostic_report(
        settings.enable_error_reporting,
        &settings.anonymous_telemetry_id,
    );
    Ok(report)
}

/// Retrieves saved crash dump reports from disk.
#[tauri::command]
pub fn error_report_get_crash_reports() -> Result<Vec<CrashReport>, String> {
    Ok(get_crash_reports())
}

/// Clears stored in-memory errors and crash dump files.
#[tauri::command]
pub fn error_report_clear() -> Result<(), String> {
    clear_errors_and_crashes()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn record_and_get_recent_command_flow() {
        let _ = error_report_record_frontend(
            "frontend".to_string(),
            "error".to_string(),
            "WindowListener".to_string(),
            "ResizeObserver loop limit exceeded".to_string(),
        );

        let errors = error_report_get_recent().expect("get recent");
        assert!(!errors.is_empty());
        assert!(errors.iter().any(|e| e.context == "WindowListener"));
    }
}
