use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// Represents a file or directory entry
#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub file_type: Option<String>,
    pub size: Option<u64>,
}

/// D&D file type extensions
const DND_FILE_TYPES: [&str; 6] = [
    "dndchar",
    "dndspell",
    "dnditem",
    "dndmap",
    "dndnotes",
    "dndstat",
];

/// Get the D&D file type from a file extension
fn get_dnd_file_type(extension: &str) -> Option<String> {
    if DND_FILE_TYPES.contains(&extension) {
        Some(format!(".{}", extension))
    } else {
        None
    }
}

/// List contents of a directory
#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err(format!("Directory does not exist: {}", path.display()));
    }

    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", path.display()));
    }

    let mut entries = Vec::new();

    let read_dir = fs::read_dir(path).map_err(|e| e.to_string())?;

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let entry_path = entry.path();

        // Skip hidden files
        if name.starts_with('.') {
            continue;
        }

        let file_type = if !metadata.is_dir() {
            entry_path
                .extension()
                .and_then(|ext| ext.to_str())
                .and_then(get_dnd_file_type)
        } else {
            None
        };

        entries.push(FileEntry {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_directory: metadata.is_dir(),
            file_type,
            size: if metadata.is_file() { Some(metadata.len()) } else { None },
        });
    }

    // Sort: directories first, then by name
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

/// Read a file's contents as a string
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Write content to a file
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }

    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

/// Create a directory (including parent directories)
#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

/// Delete a file or empty directory
#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let path = Path::new(&path);

    if path.is_dir() {
        fs::remove_dir(&path).map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

/// Check if a file or directory exists
#[tauri::command]
pub async fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}
