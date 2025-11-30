import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import "./ItemPage.css";

interface Item {
  name: string;
  type: string;
  rarity: string;
  attunement: boolean;
  description: string;
  properties: string;
  weight: number;
  value: number;
}

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (id) {
      loadItem(decodeURIComponent(id));
    } else {
      setItem(createDefaultItem());
      setLoading(false);
    }
  }, [id]);

  async function loadItem(path: string) {
    setLoading(true);
    setError(null);
    try {
      const content = await invoke<string>("read_file", { path });
      const data = JSON.parse(content) as Item;
      setItem(data);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }

  function createDefaultItem(): Item {
    return {
      name: "New Item",
      type: "Adventuring Gear",
      rarity: "Common",
      attunement: false,
      description: "",
      properties: "",
      weight: 0,
      value: 0
    };
  }

  function updateItem<K extends keyof Item>(key: K, value: Item[K]) {
    if (!item) return;
    setItem({ ...item, [key]: value });
    setDirty(true);
  }

  async function saveItem() {
    if (!item || !id) return;
    try {
      const content = JSON.stringify(item, null, 2);
      await invoke("write_file", { path: decodeURIComponent(id), content });
      setDirty(false);
    } catch (err) {
      setError(err as string);
    }
  }

  if (loading) {
    return (
      <div className="item-page">
        <div className="loading">Loading item...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="item-page">
        <div className="error-banner">
          <p>Error: {error}</p>
          <button onClick={() => navigate("/")}>Go Back</button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="item-page">
      <header className="page-header">
        <button className="btn-ghost" onClick={() => navigate("/")}>
          ← Back
        </button>
        {dirty && <button onClick={saveItem}>Save</button>}
      </header>

      <section className="card item-header">
        <input
          type="text"
          className="item-name-input"
          value={item.name}
          onChange={(e) => updateItem("name", e.target.value)}
          placeholder="Item Name"
        />
        <div className="item-meta-grid">
          <div className="info-field">
            <label>Type</label>
            <select value={item.type} onChange={(e) => updateItem("type", e.target.value)}>
              <option>Weapon</option>
              <option>Armor</option>
              <option>Potion</option>
              <option>Ring</option>
              <option>Rod</option>
              <option>Scroll</option>
              <option>Staff</option>
              <option>Wand</option>
              <option>Wondrous Item</option>
              <option>Adventuring Gear</option>
            </select>
          </div>
          <div className="info-field">
            <label>Rarity</label>
            <select value={item.rarity} onChange={(e) => updateItem("rarity", e.target.value)}>
              <option>Common</option>
              <option>Uncommon</option>
              <option>Rare</option>
              <option>Very Rare</option>
              <option>Legendary</option>
              <option>Artifact</option>
            </select>
          </div>
          <div className="info-field">
            <label>Weight (lbs)</label>
            <input
              type="number"
              value={item.weight}
              onChange={(e) => updateItem("weight", parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
            />
          </div>
          <div className="info-field">
            <label>Value (gp)</label>
            <input
              type="number"
              value={item.value}
              onChange={(e) => updateItem("value", parseFloat(e.target.value) || 0)}
              min="0"
            />
          </div>
        </div>
        <div className="info-field inline-field">
          <input
            type="checkbox"
            id="attunement"
            checked={item.attunement}
            onChange={(e) => updateItem("attunement", e.target.checked)}
          />
          <label htmlFor="attunement">Requires Attunement</label>
        </div>
      </section>

      <section className="card">
        <h3>Properties</h3>
        <textarea
          value={item.properties}
          onChange={(e) => updateItem("properties", e.target.value)}
          placeholder="Item properties (e.g., Finesse, Versatile (1d10), etc.)"
          rows={3}
        />
      </section>

      <section className="card">
        <h3>Description</h3>
        <textarea
          value={item.description}
          onChange={(e) => updateItem("description", e.target.value)}
          placeholder="Item description..."
          rows={8}
        />
      </section>
    </div>
  );
}
