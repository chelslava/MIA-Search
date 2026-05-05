use crate::{
    commands::history::record_opened_path_if_enabled, platform,
    platform::path_security::validate_path_for_read, AppState,
};
use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResponse {
    pub action: String,
    pub target: String,
    pub success: bool,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsTreeNode {
    pub name: String,
    pub path: String,
    pub is_drive: bool,
    pub has_children: bool,
}

fn has_dir_children(path: &Path) -> bool {
    match fs::read_dir(path) {
        Ok(entries) => entries.flatten().any(|entry| entry.path().is_dir()),
        Err(error) => {
            eprintln!("Failed to read directory {}: {}", path.display(), error);
            false
        }
    }
}

#[tauri::command]
pub fn fs_list_roots() -> Result<Vec<FsTreeNode>, String> {
    let mut items: Vec<FsTreeNode> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        for drive in b'A'..=b'Z' {
            let letter = drive as char;
            let path = format!("{letter}:\\");
            let path_ref = Path::new(&path);
            if path_ref.exists() {
                items.push(FsTreeNode {
                    name: path.clone(),
                    path: path.clone(),
                    is_drive: true,
                    has_children: has_dir_children(path_ref),
                });
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let root = Path::new("/");
        items.push(FsTreeNode {
            name: "/".to_string(),
            path: "/".to_string(),
            is_drive: true,
            has_children: has_dir_children(root),
        });
    }

    Ok(items)
}

#[tauri::command]
pub fn fs_list_children(path: String) -> Result<Vec<FsTreeNode>, String> {
    let canonical = validate_path_for_read(&path)?;
    let entries = fs::read_dir(&canonical)
        .map_err(|error| format!("read_dir failed for {}: {}", path, error))?;
    let mut children: Vec<FsTreeNode> = entries
        .flatten()
        .filter_map(|entry| {
            let entry_path = entry.path();
            if !entry_path.is_dir() {
                return None;
            }
            let full_path = entry_path.to_string_lossy().to_string();
            let name = entry.file_name().to_string_lossy().to_string();
            Some(FsTreeNode {
                name: if name.is_empty() {
                    full_path.clone()
                } else {
                    name
                },
                path: full_path,
                is_drive: false,
                has_children: has_dir_children(&entry_path),
            })
        })
        .collect();

    children.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(children)
}

#[tauri::command]
pub fn fs_pick_folder() -> Result<Option<String>, String> {
    Ok(FileDialog::new()
        .pick_folder()
        .map(|path_buf| path_buf.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn actions_open_path(
    state: State<'_, AppState>,
    path: String,
) -> Result<ActionResponse, String> {
    match platform::open_path::open_path(&path) {
        Ok(()) => {
            record_opened_path_if_enabled(&state, path.clone())?;
            Ok(ActionResponse {
                action: "open_path".to_string(),
                target: path,
                success: true,
                message: None,
            })
        }
        Err(error) => Ok(ActionResponse {
            action: "open_path".to_string(),
            target: path,
            success: false,
            message: Some(error),
        }),
    }
}

#[tauri::command]
pub fn actions_reveal_path(
    _state: State<'_, AppState>,
    path: String,
) -> Result<ActionResponse, String> {
    match platform::reveal_in_explorer::reveal_in_file_manager(&path) {
        Ok(()) => Ok(ActionResponse {
            action: "reveal_path".to_string(),
            target: path,
            success: true,
            message: None,
        }),
        Err(error) => Ok(ActionResponse {
            action: "reveal_path".to_string(),
            target: path,
            success: false,
            message: Some(error),
        }),
    }
}

#[tauri::command]
pub fn actions_open_parent(
    state: State<'_, AppState>,
    path: String,
) -> Result<ActionResponse, String> {
    let parent = resolve_parent_path(&path)?;

    match platform::open_path::open_path(&parent) {
        Ok(()) => {
            record_opened_path_if_enabled(&state, parent.clone())?;
            Ok(ActionResponse {
                action: "open_parent".to_string(),
                target: parent,
                success: true,
                message: None,
            })
        }
        Err(error) => Ok(ActionResponse {
            action: "open_parent".to_string(),
            target: parent,
            success: false,
            message: Some(error),
        }),
    }
}

#[tauri::command]
pub fn actions_copy_to_clipboard(
    _state: State<'_, AppState>,
    text: String,
) -> Result<ActionResponse, String> {
    const MAX_CLIPBOARD_TEXT_SIZE: usize = 10 * 1024; // 10KB limit

    if text.len() > MAX_CLIPBOARD_TEXT_SIZE {
        return Ok(ActionResponse {
            action: "copy_to_clipboard".to_string(),
            target: text.chars().take(50).collect(),
            success: false,
            message: Some(format!(
                "Text exceeds maximum size of {} bytes",
                MAX_CLIPBOARD_TEXT_SIZE
            )),
        });
    }

    match platform::clipboard::copy_text(&text) {
        Ok(()) => Ok(ActionResponse {
            action: "copy_to_clipboard".to_string(),
            target: text,
            success: true,
            message: None,
        }),
        Err(error) => Ok(ActionResponse {
            action: "copy_to_clipboard".to_string(),
            target: text,
            success: false,
            message: Some(error),
        }),
    }
}

fn resolve_parent_path(path: &str) -> Result<String, String> {
    Path::new(path)
        .parent()
        .and_then(|value| value.to_str())
        .ok_or_else(|| format!("failed to resolve parent for path: {path}"))
        .map(|value| value.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{create_dir_all, File};
    use tempfile::tempdir;

    #[test]
    fn resolve_parent_path_handles_valid_and_invalid_input() {
        let parent = resolve_parent_path("C:/dir/file.txt").expect("parent");
        assert!(!parent.is_empty());

        let error = resolve_parent_path("").unwrap_err();
        assert!(error.contains("failed to resolve parent"));
    }

    #[test]
    fn fs_list_children_returns_only_directories_sorted() {
        let dir = tempdir().expect("tempdir");
        let alpha = dir.path().join("Alpha");
        let zeta = dir.path().join("zeta");
        let file = dir.path().join("note.txt");
        create_dir_all(&zeta).expect("mkdir zeta");
        create_dir_all(&alpha).expect("mkdir alpha");
        File::create(file).expect("create file");

        let children =
            fs_list_children(dir.path().to_string_lossy().to_string()).expect("children");
        let names: Vec<String> = children.iter().map(|item| item.name.clone()).collect();
        assert_eq!(names, vec!["Alpha".to_string(), "zeta".to_string()]);
        assert!(children.iter().all(|item| !item.path.ends_with("note.txt")));
    }

    #[test]
    fn preview_file_reads_small_text_file() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        fs::write(&file_path, "Hello, World!").unwrap();
        
        let result = preview_file(file_path.to_string_lossy().to_string());
        assert!(result.error.is_none());
        assert_eq!(result.content, Some("Hello, World!".to_string()));
        assert!(!result.truncated);
    }

    #[test]
    fn preview_file_rejects_nonexistent() {
        let result = preview_file("/nonexistent/path/file.txt".to_string());
        assert!(result.error.is_some());
        assert!(result.content.is_none());
    }

    #[test]
    fn preview_file_rejects_directory() {
        let dir = tempdir().unwrap();
        let result = preview_file(dir.path().to_string_lossy().to_string());
        assert!(result.error.is_some());
        assert_eq!(result.error.unwrap(), "Not a file");
    }
}

const PREVIEW_MAX_SIZE: usize = 64 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilePreviewResponse {
    pub path: String,
    pub content: Option<String>,
    pub truncated: bool,
    pub size: usize,
    pub error: Option<String>,
}

#[tauri::command]
pub fn preview_file(path: String) -> FilePreviewResponse {
    let path_ref = Path::new(&path);
    
    if !path_ref.exists() {
        return FilePreviewResponse {
            path,
            content: None,
            truncated: false,
            size: 0,
            error: Some("File not found".to_string()),
        };
    }

    if !path_ref.is_file() {
        return FilePreviewResponse {
            path,
            content: None,
            truncated: false,
            size: 0,
            error: Some("Not a file".to_string()),
        };
    }

    let metadata = match fs::metadata(path_ref) {
        Ok(m) => m,
        Err(e) => {
            return FilePreviewResponse {
                path,
                content: None,
                truncated: false,
                size: 0,
                error: Some(format!("Cannot read metadata: {}", e)),
            };
        }
    };

    let size = metadata.len() as usize;
    
    if size > PREVIEW_MAX_SIZE {
        return FilePreviewResponse {
            path: path.clone(),
            content: None,
            truncated: true,
            size,
            error: Some(format!("File too large ({:.1} KB)", size as f64 / 1024.0)),
        };
    }

    match fs::read_to_string(path_ref) {
        Ok(content) => FilePreviewResponse {
            path,
            content: Some(content),
            truncated: false,
            size,
            error: None,
        },
        Err(e) => FilePreviewResponse {
            path,
            content: None,
            truncated: false,
            size,
            error: Some(format!("Cannot read file: {}", e)),
        },
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOperationResult {
    pub source: String,
    pub destination: Option<String>,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOperationResponse {
    pub operation: String,
    pub total: usize,
    pub successful: usize,
    pub failed: usize,
    pub results: Vec<BatchOperationResult>,
}

fn copy_file(from: &Path, to: &Path) -> Result<(), String> {
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    fs::copy(from, to).map_err(|e| format!("Failed to copy: {}", e))?;
    Ok(())
}

fn move_file(from: &Path, to: &Path) -> Result<(), String> {
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    fs::rename(from, to).map_err(|e| format!("Failed to move (trying copy+delete): {}", e))?;
    Ok(())
}

fn delete_file(path: &Path) -> Result<(), String> {
    let metadata = fs::metadata(path).map_err(|e| format!("Cannot access file: {}", e))?;
    if metadata.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("Failed to delete directory: {}", e))?;
    } else {
        fs::remove_file(path).map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn batch_copy(source_paths: Vec<String>, destination_dir: String) -> BatchOperationResponse {
    let dest_dir = PathBuf::from(&destination_dir);
    let mut results = Vec::with_capacity(source_paths.len());
    let mut successful = 0;
    
    for source in &source_paths {
        let source_path = Path::new(source);
        let file_name = source_path.file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Invalid file name".to_string());
        
        let result = match file_name {
            Ok(name) => {
                let dest_path = dest_dir.join(name);
                match copy_file(source_path, &dest_path) {
                    Ok(_) => {
                        successful += 1;
                        BatchOperationResult {
                            source: source.clone(),
                            destination: Some(dest_path.to_string_lossy().to_string()),
                            success: true,
                            error: None,
                        }
                    }
                    Err(e) => BatchOperationResult {
                        source: source.clone(),
                        destination: None,
                        success: false,
                        error: Some(e),
                    },
                }
            }
            Err(e) => BatchOperationResult {
                source: source.clone(),
                destination: None,
                success: false,
                error: Some(e),
            },
        };
        results.push(result);
    }
    
    BatchOperationResponse {
        operation: "copy".to_string(),
        total: source_paths.len(),
        successful,
        failed: source_paths.len() - successful,
        results,
    }
}

#[tauri::command]
pub fn batch_move(source_paths: Vec<String>, destination_dir: String) -> BatchOperationResponse {
    let dest_dir = PathBuf::from(&destination_dir);
    let mut results = Vec::with_capacity(source_paths.len());
    let mut successful = 0;
    
    for source in &source_paths {
        let source_path = Path::new(source);
        let file_name = source_path.file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Invalid file name".to_string());
        
        let result = match file_name {
            Ok(name) => {
                let dest_path = dest_dir.join(name);
                match move_file(source_path, &dest_path) {
                    Ok(_) => {
                        successful += 1;
                        BatchOperationResult {
                            source: source.clone(),
                            destination: Some(dest_path.to_string_lossy().to_string()),
                            success: true,
                            error: None,
                        }
                    }
                    Err(e) => BatchOperationResult {
                        source: source.clone(),
                        destination: None,
                        success: false,
                        error: Some(e),
                    },
                }
            }
            Err(e) => BatchOperationResult {
                source: source.clone(),
                destination: None,
                success: false,
                error: Some(e),
            },
        };
        results.push(result);
    }
    
    BatchOperationResponse {
        operation: "move".to_string(),
        total: source_paths.len(),
        successful,
        failed: source_paths.len() - successful,
        results,
    }
}

#[tauri::command]
pub fn batch_delete(paths: Vec<String>) -> BatchOperationResponse {
    let mut results = Vec::with_capacity(paths.len());
    let mut successful = 0;
    
    for path_str in &paths {
        let path = Path::new(path_str);
        match delete_file(path) {
            Ok(_) => {
                successful += 1;
                results.push(BatchOperationResult {
                    source: path_str.clone(),
                    destination: None,
                    success: true,
                    error: None,
                });
            }
            Err(e) => {
                results.push(BatchOperationResult {
                    source: path_str.clone(),
                    destination: None,
                    success: false,
                    error: Some(e),
                });
            }
        }
    }
    
    BatchOperationResponse {
        operation: "delete".to_string(),
        total: paths.len(),
        successful,
        failed: paths.len() - successful,
        results,
    }
}

#[cfg(test)]
mod batch_tests {
    use super::*;
    use tempfile::{tempdir, TempDir};

    fn create_temp_file(dir: &TempDir, name: &str, content: &str) -> PathBuf {
        let path = dir.path().join(name);
        fs::write(&path, content).unwrap();
        path
    }

    #[test]
    fn batch_copy_copies_single_file() {
        let dir = tempdir().unwrap();
        let source = create_temp_file(&dir, "source.txt", "test content");
        
        let subdir = dir.path().join("subdir");
        fs::create_dir_all(&subdir).unwrap();
        
        let result = batch_copy(
            vec![source.to_string_lossy().to_string()], 
            subdir.to_string_lossy().to_string()
        );
        
        assert_eq!(result.total, 1);
        assert!(result.results[0].success, "Copy failed: {:?}", result.results[0].error);
        let expected = subdir.join("source.txt");
        assert!(expected.exists());
        let dest_content = fs::read_to_string(&expected).unwrap();
        assert_eq!(dest_content, "test content");
    }

    #[test]
    fn batch_copy_reports_errors() {
        let result = batch_copy(vec!["/nonexistent/file.txt".to_string()], "/tmp".to_string());
        assert_eq!(result.total, 1);
        assert_eq!(result.failed, 1);
        assert!(!result.results[0].success);
        assert!(result.results[0].error.is_some());
    }

    #[test]
    fn batch_move_moves_single_file() {
        let dir = tempdir().unwrap();
        let source = create_temp_file(&dir, "source.txt", "test content");
        let subdir = dir.path().join("subdir");
        fs::create_dir_all(&subdir).unwrap();
        
        let result = batch_move(
            vec![source.to_string_lossy().to_string()], 
            subdir.to_string_lossy().to_string()
        );
        assert_eq!(result.total, 1);
        assert!(result.results[0].success, "Move failed: {:?}", result.results[0].error);
        assert!(!source.exists(), "Source should be moved");
        let dest_path = source.parent().unwrap().join("subdir/source.txt");
        assert!(dest_path.exists());
    }

    #[test]
    fn batch_delete_deletes_files() {
        let dir = tempdir().unwrap();
        let file1 = create_temp_file(&dir, "file1.txt", "content1");
        let file2 = create_temp_file(&dir, "file2.txt", "content2");
        
        let result = batch_delete(vec![file1.to_string_lossy().to_string(), file2.to_string_lossy().to_string()]);
        assert_eq!(result.total, 2);
        assert_eq!(result.successful, 2);
        assert!(!file1.exists());
        assert!(!file2.exists());
    }

    #[test]
    fn batch_delete_reports_errors() {
        let result = batch_delete(vec!["/nonexistent/file.txt".to_string()]);
        assert_eq!(result.total, 1);
        assert_eq!(result.failed, 1);
        assert!(!result.results[0].success);
    }

    #[test]
    fn batch_copy_multiple_files() {
        let dir = tempdir().unwrap();
        let file1 = create_temp_file(&dir, "file1.txt", "content1");
        let file2 = create_temp_file(&dir, "file2.txt", "content2");
        
        let subdir = dir.path().join("dest");
        fs::create_dir_all(&subdir).unwrap();
        
        let result = batch_copy(
            vec![file1.to_string_lossy().to_string(), file2.to_string_lossy().to_string()],
            subdir.to_string_lossy().to_string()
        );
        assert_eq!(result.total, 2);
        assert_eq!(result.successful, 2);
        assert!(result.results.iter().all(|r| r.success));
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResponse {
    pub path: Option<String>,
    pub count: usize,
    pub error: Option<String>,
}

fn build_csv_row(path: &str, metadata: Option<&str>) -> String {
    let escaped = path.replace('"', "\"\"");
    if let Some(meta) = metadata {
        format!("\"{}\",\"{}\"\n", escaped, meta)
    } else {
        format!("\"{}\"\n", escaped)
    }
}

fn build_json_entry(path: &str, metadata: Option<&str>) -> serde_json::Value {
    let mut obj = serde_json::json!({ "path": path });
    if let Some(meta) = metadata {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(meta) {
            obj = parsed;
            obj["path"] = serde_json::json!(path);
        }
    }
    obj
}

#[tauri::command]
pub fn export_search_results(
    results: Vec<String>,
    format: String,
    _include_metadata: bool
) -> ExportResponse {
    let format = format.to_lowercase();
    if format != "csv" && format != "json" {
        return ExportResponse {
            path: None,
            count: 0,
            error: Some("Invalid format. Use 'csv' or 'json'".to_string()),
        };
    }

    let output = if format == "csv" {
        let mut content = String::from("path\n");
        for path in &results {
            content.push_str(&build_csv_row(path, None));
        }
        content
    } else {
        let entries: Vec<serde_json::Value> = results
            .iter()
            .map(|p| build_json_entry(p, None))
            .collect();
        serde_json::to_string_pretty(&entries).unwrap_or_else(|_| "[]".to_string())
    };

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S_%f");
    let ext = if format == "csv" { "csv" } else { "json" };
    let temp_path = std::env::temp_dir().join(format!("mia_search_export_{}.{}", timestamp, ext));
    
    match fs::write(&temp_path, output) {
        Ok(_) => ExportResponse {
            path: Some(temp_path.to_string_lossy().to_string()),
            count: results.len(),
            error: None,
        },
        Err(e) => ExportResponse {
            path: None,
            count: 0,
            error: Some(format!("Failed to write file: {}", e)),
        },
    }
}

#[tauri::command]
pub fn export_to_clipboard(
    results: Vec<String>,
    format: String,
    _include_metadata: bool
) -> ExportResponse {
    let format = format.to_lowercase();
    if format != "csv" && format != "json" {
        return ExportResponse {
            path: None,
            count: 0,
            error: Some("Invalid format. Use 'csv' or 'json'".to_string()),
        };
    }

    let output = if format == "csv" {
        let mut content = String::from("path\n");
        for path in &results {
            content.push_str(&build_csv_row(path, None));
        }
        content
    } else {
        let entries: Vec<serde_json::Value> = results
            .iter()
            .map(|p| build_json_entry(p, None))
            .collect();
        serde_json::to_string_pretty(&entries).unwrap_or_else(|_| "[]".to_string())
    };

    match platform::clipboard::copy_text(&output) {
        Ok(()) => ExportResponse {
            path: None,
            count: results.len(),
            error: None,
        },
        Err(e) => ExportResponse {
            path: None,
            count: 0,
            error: Some(e),
        },
    }
}

#[cfg(test)]
mod export_tests {
    use super::*;

    #[test]
    fn export_to_csv_creates_valid_csv() {
        let results = vec![
            "/path/to/file1.txt".to_string(),
            "/path/to/file2.txt".to_string(),
        ];
        
        let result = export_search_results(results.clone(), "csv".to_string(), false);
        assert!(result.error.is_none(), "Export should succeed: {:?}", result.error);
        assert_eq!(result.count, results.len(), "Count should match results length");
        assert!(result.path.is_some());
        
        let content = fs::read_to_string(Path::new(result.path.as_ref().unwrap())).unwrap();
        assert!(content.starts_with("path\n"), "CSV should start with header");
        assert!(content.contains("file1.txt"));
        assert!(content.contains("file2.txt"));
    }

    #[test]
    fn export_to_json_creates_valid_json() {
        let results = vec![
            "/path/to/file1.txt".to_string(),
            "/path/to/file2.txt".to_string(),
        ];
        
        let result = export_search_results(results.clone(), "json".to_string(), false);
        assert!(result.error.is_none(), "Export should succeed: {:?}", result.error);
        assert_eq!(result.count, results.len(), "Count should match results length");
        assert!(result.path.is_some());
        
        let content = fs::read_to_string(Path::new(result.path.as_ref().unwrap())).unwrap();
        let parsed: Vec<serde_json::Value> = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed.len(), results.len());
        assert_eq!(parsed[0]["path"], "/path/to/file1.txt");
    }

    #[test]
    fn export_rejects_invalid_format() {
        let results = vec!["/path/to/file.txt".to_string()];
        let result = export_search_results(results, "xml".to_string(), false);
        assert!(result.error.is_some());
        assert!(result.error.unwrap().contains("Invalid format"));
    }

    #[test]
    fn export_handles_empty_results() {
        let results: Vec<String> = vec![];
        let csv_result = export_search_results(results.clone(), "csv".to_string(), false);
        assert_eq!(csv_result.count, 0);
        assert!(csv_result.error.is_none());
        
        let json_result = export_search_results(results, "json".to_string(), false);
        assert_eq!(json_result.count, 0);
        assert!(json_result.error.is_none());
    }

    #[test]
    fn export_handles_special_characters_in_paths() {
        let results = vec![
            "/path/with \"quotes\"/file.txt".to_string(),
            "/path/with,commas/file.txt".to_string(),
            "/path/with\nnewlines/file.txt".to_string(),
        ];
        
        let result = export_search_results(results, "csv".to_string(), false);
        assert!(result.error.is_none(), "Should handle special chars: {:?}", result.error);
        let content = fs::read_to_string(Path::new(result.path.as_ref().unwrap())).unwrap();
        assert!(content.contains("\"\"quotes\"\"")); // Escaped quotes
    }
}
