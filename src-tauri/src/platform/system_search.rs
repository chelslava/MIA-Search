use crate::core::models::SearchRequest;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::Arc;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Returns true if native OS search integration is available on the current platform.
pub fn is_system_search_available() -> bool {
    cfg!(target_os = "windows") || cfg!(target_os = "macos")
}

/// Escapes a string for safe embedding into SQL single-quoted literals.
pub fn escape_sql_literal(input: &str) -> String {
    input.replace('\'', "''")
}

/// Builds the Windows Search SQL query for the given search request.
#[cfg(target_os = "windows")]
pub fn build_windows_search_sql(request: &SearchRequest) -> String {
    let mut conditions = Vec::new();

    // 1. Root directory conditions (SCOPE)
    if !request.roots.is_empty() {
        let mut scope_clauses = Vec::new();
        for root in &request.roots {
            let trimmed = root.trim();
            if !trimmed.is_empty() {
                let normalized = trimmed.replace('/', "\\");
                let escaped = escape_sql_literal(&normalized);
                scope_clauses.push(format!("SCOPE='file:{}'", escaped));
            }
        }
        if !scope_clauses.is_empty() {
            conditions.push(format!("({})", scope_clauses.join(" OR ")));
        }
    }

    // 2. Query matching on filename or path
    let query = request.query.trim();
    if !query.is_empty() {
        let escaped = escape_sql_literal(query);
        // Match query substring in FileName or ItemPathDisplay
        conditions.push(format!(
            "(System.FileName LIKE '%{}%' OR System.ItemPathDisplay LIKE '%{}%')",
            escaped, escaped
        ));
    }

    // 3. Extensions filter
    if !request.extensions.is_empty() {
        let mut ext_clauses = Vec::new();
        for ext in &request.extensions {
            let trimmed = ext.trim().trim_start_matches('.');
            if !trimmed.is_empty() {
                let escaped = escape_sql_literal(trimmed);
                ext_clauses.push(format!("System.FileExtension='.{}'", escaped));
            }
        }
        if !ext_clauses.is_empty() {
            conditions.push(format!("({})", ext_clauses.join(" OR ")));
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };

    let limit_clause = match request.options.limit {
        Some(limit) if limit > 0 => format!("TOP {} ", limit.saturating_mul(2)),
        _ => String::new(),
    };

    format!(
        "SELECT {}System.ItemPathDisplay FROM SYSTEMINDEX{}",
        limit_clause, where_clause
    )
}

/// Spawns a child process to stream system search paths for the current platform.
#[cfg(target_os = "windows")]
fn spawn_system_search_process(request: &SearchRequest) -> Result<Child, String> {
    let sql = build_windows_search_sql(request);
    let escaped_sql = sql.replace('\'', "''");

    // Construct PowerShell script that connects to Search.CollatorDSO and streams results
    let ps_script = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; \
         $conn = New-Object -ComObject ADODB.Connection; \
         $conn.Open('Provider=Search.CollatorDSO;Extended Properties=''Application=Windows'';'); \
         $rs = $conn.Execute('{}'); \
         while (-not $rs.EOF) {{ \
             [Console]::WriteLine($rs.Fields.Item('System.ItemPathDisplay').Value); \
             $rs.MoveNext(); \
         }}; \
         $conn.Close();",
        escaped_sql
    );

    let mut cmd = Command::new("powershell.exe");
    cmd.args(["-NoProfile", "-NonInteractive", "-Command", &ps_script])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .creation_flags(0x08000000); // CREATE_NO_WINDOW

    cmd.spawn()
        .map_err(|e| format!("Failed to spawn Windows Search process: {}", e))
}

#[cfg(target_os = "macos")]
fn spawn_system_search_process(request: &SearchRequest) -> Result<Child, String> {
    let mut cmd = Command::new("mdfind");

    for root in &request.roots {
        let trimmed = root.trim();
        if !trimmed.is_empty() {
            cmd.arg("-onlyin").arg(trimmed);
        }
    }

    let query = request.query.trim();
    if !query.is_empty() {
        cmd.arg("-name").arg(query);
    }

    cmd.stdout(Stdio::piped()).stderr(Stdio::null());

    cmd.spawn()
        .map_err(|e| format!("Failed to spawn Spotlight mdfind process: {}", e))
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn spawn_system_search_process(_request: &SearchRequest) -> Result<Child, String> {
    Err("System search is only available on Windows and macOS".to_string())
}

/// Streams file paths discovered by the OS search index into `tx`.
///
/// Cancels and kills the child process if `cancel_flag` is signaled.
pub fn stream_system_search_paths(
    request: &SearchRequest,
    cancel_flag: Arc<AtomicBool>,
    tx: mpsc::Sender<String>,
) -> Result<(), String> {
    let mut child = spawn_system_search_process(request)?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture child stdout".to_string())?;

    let reader = BufReader::new(stdout);
    for line_result in reader.lines() {
        if cancel_flag.load(Ordering::Acquire) {
            let _ = child.kill();
            break;
        }

        match line_result {
            Ok(line) => {
                let trimmed = line.trim();
                if !trimmed.is_empty() && tx.send(trimmed.to_string()).is_err() {
                    let _ = child.kill();
                    break;
                }
            }
            Err(_) => break,
        }
    }

    let _ = child.wait();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::models::SearchOptions;

    #[test]
    fn escape_sql_literal_doubles_single_quotes() {
        assert_eq!(escape_sql_literal("normal"), "normal");
        assert_eq!(escape_sql_literal("user's files"), "user''s files");
        assert_eq!(escape_sql_literal("''"), "''''");
    }

    #[test]
    fn is_system_search_available_returns_expected_for_os() {
        let expected = cfg!(target_os = "windows") || cfg!(target_os = "macos");
        assert_eq!(is_system_search_available(), expected);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn build_windows_search_sql_constructs_valid_query() {
        let request = SearchRequest {
            query: "report".to_string(),
            roots: vec!["C:/Projects".to_string()],
            extensions: vec!["pdf".to_string(), "docx".to_string()],
            options: SearchOptions {
                limit: Some(100),
                ..SearchOptions::default()
            },
            ..SearchRequest::default()
        };

        let sql = build_windows_search_sql(&request);
        assert!(sql.starts_with("SELECT TOP 200 System.ItemPathDisplay FROM SYSTEMINDEX WHERE "));
        assert!(sql.contains("SCOPE='file:C:\\Projects'"));
        assert!(sql.contains("System.FileName LIKE '%report%'"));
        assert!(
            sql.contains("System.FileExtension='.pdf'")
                || sql.contains("System.FileExtension='.docx'")
        );
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn build_windows_search_sql_handles_empty_query_and_multiple_roots() {
        let request = SearchRequest {
            query: "".to_string(),
            roots: vec!["C:/Alpha".to_string(), "D:/Beta".to_string()],
            extensions: vec![],
            options: SearchOptions {
                limit: None,
                ..SearchOptions::default()
            },
            ..SearchRequest::default()
        };

        let sql = build_windows_search_sql(&request);
        assert!(sql.starts_with("SELECT System.ItemPathDisplay FROM SYSTEMINDEX WHERE "));
        assert!(sql.contains("SCOPE='file:C:\\Alpha' OR SCOPE='file:D:\\Beta'"));
    }
}
