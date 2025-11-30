import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import "./MapPage.css";

interface Pin {
  id: string;
  x: number;
  y: number;
  label: string;
  linkedFile?: string;
}

interface MapData {
  imagePath: string;
  pins: Pin[];
}

export default function MapPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadMap(decodeURIComponent(id));
    } else {
      setMapData(createDefaultMap());
      setLoading(false);
    }
  }, [id]);

  async function loadMap(path: string) {
    setLoading(true);
    setError(null);
    try {
      const content = await invoke<string>("read_file", { path });
      const data = JSON.parse(content) as MapData;
      setMapData(data);
      
      // Load image if path exists
      if (data.imagePath) {
        // For Tauri, we'll need to convert the file path to a URL
        setImageUrl(data.imagePath);
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }

  function createDefaultMap(): MapData {
    return {
      imagePath: "",
      pins: []
    };
  }

  async function saveMap() {
    if (!mapData || !id) return;
    try {
      const content = JSON.stringify(mapData, null, 2);
      await invoke("write_file", { path: decodeURIComponent(id), content });
      setDirty(false);
    } catch (err) {
      setError(err as string);
    }
  }

  async function selectImage() {
    try {
      const selected = await invoke<string>("select_image");
      if (selected && mapData) {
        setMapData({ ...mapData, imagePath: selected });
        setImageUrl(selected);
        setDirty(true);
      }
    } catch (err) {
      setError(err as string);
    }
  }

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!editMode || !mapData) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPin: Pin = {
      id: Date.now().toString(),
      x,
      y,
      label: `Pin ${mapData.pins.length + 1}`,
      linkedFile: ""
    };

    setMapData({
      ...mapData,
      pins: [...mapData.pins, newPin]
    });
    setDirty(true);
  }

  function deletePin(pinId: string) {
    if (!mapData) return;
    setMapData({
      ...mapData,
      pins: mapData.pins.filter(p => p.id !== pinId)
    });
    setDirty(true);
  }

  function updatePin(pinId: string, updates: Partial<Pin>) {
    if (!mapData) return;
    setMapData({
      ...mapData,
      pins: mapData.pins.map(p => p.id === pinId ? { ...p, ...updates } : p)
    });
    setDirty(true);
  }

  if (loading) {
    return (
      <div className="map-page">
        <div className="loading">Loading map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-page">
        <div className="error-banner">
          <p>Error: {error}</p>
          <button onClick={() => navigate("/")}>Go Back</button>
        </div>
      </div>
    );
  }

  if (!mapData) return null;

  return (
    <div className="map-page">
      <header className="page-header">
        <button className="btn-ghost" onClick={() => navigate("/")}>
          ← Back
        </button>
        <div className="header-actions">
          <button onClick={() => setEditMode(!editMode)}>
            {editMode ? "View Mode" : "Edit Mode"}
          </button>
          {dirty && <button onClick={saveMap}>Save</button>}
        </div>
      </header>

      <div className="map-controls">
        <button onClick={selectImage}>
          {imageUrl ? "Change Image" : "Select Image"}
        </button>
      </div>

      <div className="map-container">
        {imageUrl ? (
          <div 
            className="map-image-wrapper"
            onClick={handleMapClick}
            style={{ cursor: editMode ? "crosshair" : "default" }}
          >
            <img src={imageUrl} alt="Map" className="map-image" />
            {mapData.pins.map(pin => (
              <div
                key={pin.id}
                className="map-pin"
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`
                }}
              >
                <div className="pin-marker">📍</div>
                {editMode && (
                  <div className="pin-editor">
                    <input
                      type="text"
                      value={pin.label}
                      onChange={(e) => updatePin(pin.id, { label: e.target.value })}
                      placeholder="Pin label"
                    />
                    <input
                      type="text"
                      value={pin.linkedFile || ""}
                      onChange={(e) => updatePin(pin.id, { linkedFile: e.target.value })}
                      placeholder="Linked file path"
                    />
                    <button onClick={() => deletePin(pin.id)}>Delete</button>
                  </div>
                )}
                {!editMode && (
                  <div className="pin-label">{pin.label}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="map-placeholder">
            <p>No map image selected</p>
            <button onClick={selectImage}>Select Image</button>
          </div>
        )}
      </div>
    </div>
  );
}
