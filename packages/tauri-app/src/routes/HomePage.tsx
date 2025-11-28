import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  file_type: string | null;
  size: number | null;
}

const FILE_ICONS: Record<string, string> = {
  dndchar: "⚔️",
  dndspell: "✨",
  dnditem: "🎒",
  dndmap: "🗺️",
  dndnotes: "📝",
  dndstat: "📊",
  folder: "📁",
  default: "📄",
};

export default function HomePage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: Get campaign path from settings/store
    loadDirectory("");
  }, []);

  async function loadDirectory(path: string) {
    setLoading(true);
    setError(null);
    try {
      const entries = await invoke<FileEntry[]>("list_directory", { path });
      // Already sorted by Rust backend
      setFiles(entries);
      setCurrentPath(path);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }

  function getIcon(file: FileEntry): string {
    if (file.is_directory) return FILE_ICONS.folder;
    if (file.file_type) {
      // file_type is like ".dndchar", extract the extension part
      const ext = file.file_type.replace(".", "");
      if (FILE_ICONS[ext]) return FILE_ICONS[ext];
    }
    return FILE_ICONS.default;
  }

  function getExtension(file: FileEntry): string | null {
    if (file.file_type) return file.file_type.replace(".", "");
    return null;
  }

  function handleFileClick(file: FileEntry) {
    if (file.is_directory) {
      loadDirectory(file.path);
    } else {
      const ext = getExtension(file);
      if (ext === "dndchar") {
        navigate(`/character/${encodeURIComponent(file.path)}`);
      }
      // TODO: Handle other file types
    }
  }

  function handleBack() {
    if (!currentPath) return;
    const parentPath = currentPath.split("/").slice(0, -1).join("/");
    loadDirectory(parentPath);
  }

  if (loading && files.length === 0) {
    return (
      <div className="home-page">
        <div className="loading">Loading files...</div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <header className="page-header">
        <h1>Campaign Files</h1>
        {currentPath && (
          <button className="btn-ghost back-btn" onClick={handleBack}>
            ← Back
          </button>
        )}
      </header>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => loadDirectory("")}>Open Campaign Folder</button>
        </div>
      )}

      {!error && files.length === 0 && (
        <div className="empty-state">
          <p>No campaign files found.</p>
          <button onClick={() => loadDirectory("")}>Select Campaign Folder</button>
        </div>
      )}

      <div className="file-grid">
        {files.map((file) => (
          <button
            key={file.path}
            className="file-item"
            onClick={() => handleFileClick(file)}
          >
            <span className="file-icon">{getIcon(file)}</span>
            <span className="file-name">{file.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
