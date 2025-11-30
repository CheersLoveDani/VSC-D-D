import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import "./SpellPage.css";

interface Spell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  higherLevels: string;
}

export default function SpellPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [spell, setSpell] = useState<Spell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (id) {
      loadSpell(decodeURIComponent(id));
    } else {
      setSpell(createDefaultSpell());
      setLoading(false);
    }
  }, [id]);

  async function loadSpell(path: string) {
    setLoading(true);
    setError(null);
    try {
      const content = await invoke<string>("read_file", { path });
      const data = JSON.parse(content) as Spell;
      setSpell(data);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }

  function createDefaultSpell(): Spell {
    return {
      name: "New Spell",
      level: 0,
      school: "Evocation",
      castingTime: "1 action",
      range: "60 feet",
      components: "V, S",
      duration: "Instantaneous",
      concentration: false,
      ritual: false,
      description: "",
      higherLevels: ""
    };
  }

  function updateSpell<K extends keyof Spell>(key: K, value: Spell[K]) {
    if (!spell) return;
    setSpell({ ...spell, [key]: value });
    setDirty(true);
  }

  async function saveSpell() {
    if (!spell || !id) return;
    try {
      const content = JSON.stringify(spell, null, 2);
      await invoke("write_file", { path: decodeURIComponent(id), content });
      setDirty(false);
    } catch (err) {
      setError(err as string);
    }
  }

  if (loading) {
    return (
      <div className="spell-page">
        <div className="loading">Loading spell...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spell-page">
        <div className="error-banner">
          <p>Error: {error}</p>
          <button onClick={() => navigate("/")}>Go Back</button>
        </div>
      </div>
    );
  }

  if (!spell) return null;

  return (
    <div className="spell-page">
      <header className="page-header">
        <button className="btn-ghost" onClick={() => navigate("/")}>
          ← Back
        </button>
        {dirty && <button onClick={saveSpell}>Save</button>}
      </header>

      <div className="spell-container">
        <input
          type="text"
          className="spell-name-input"
          value={spell.name}
          onChange={(e) => updateSpell("name", e.target.value)}
          placeholder="Spell Name"
        />

        <div className="spell-meta">
          <div className="info-field">
            <label>Level</label>
            <select value={spell.level} onChange={(e) => updateSpell("level", parseInt(e.target.value))}>
              <option value={0}>Cantrip</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div className="info-field">
            <label>School</label>
            <select value={spell.school} onChange={(e) => updateSpell("school", e.target.value)}>
              <option>Abjuration</option>
              <option>Conjuration</option>
              <option>Divination</option>
              <option>Enchantment</option>
              <option>Evocation</option>
              <option>Illusion</option>
              <option>Necromancy</option>
              <option>Transmutation</option>
            </select>
          </div>
          <div className="info-field">
            <label>Casting Time</label>
            <input
              type="text"
              value={spell.castingTime}
              onChange={(e) => updateSpell("castingTime", e.target.value)}
            />
          </div>
          <div className="info-field">
            <label>Range</label>
            <input
              type="text"
              value={spell.range}
              onChange={(e) => updateSpell("range", e.target.value)}
            />
          </div>
          <div className="info-field">
            <label>Components</label>
            <input
              type="text"
              value={spell.components}
              onChange={(e) => updateSpell("components", e.target.value)}
            />
          </div>
          <div className="info-field">
            <label>Duration</label>
            <input
              type="text"
              value={spell.duration}
              onChange={(e) => updateSpell("duration", e.target.value)}
            />
          </div>
        </div>

        <div className="spell-flags">
          <div className="inline-field">
            <input
              type="checkbox"
              id="concentration"
              checked={spell.concentration}
              onChange={(e) => updateSpell("concentration", e.target.checked)}
            />
            <label htmlFor="concentration">Concentration</label>
          </div>
          <div className="inline-field">
            <input
              type="checkbox"
              id="ritual"
              checked={spell.ritual}
              onChange={(e) => updateSpell("ritual", e.target.checked)}
            />
            <label htmlFor="ritual">Ritual</label>
          </div>
        </div>

        <div className="section">
          <h3>Description</h3>
          <textarea
            value={spell.description}
            onChange={(e) => updateSpell("description", e.target.value)}
            placeholder="Spell description..."
            rows={8}
          />
        </div>

        {spell.level > 0 && (
          <div className="section">
            <h3>At Higher Levels</h3>
            <textarea
              value={spell.higherLevels}
              onChange={(e) => updateSpell("higherLevels", e.target.value)}
              placeholder="Effects when cast at higher levels..."
              rows={4}
            />
          </div>
        )}
      </div>
    </div>
  );
}
