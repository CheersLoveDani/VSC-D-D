import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { calculateModifier, formatModifier } from "@critcode/shared-core";
import "./StatBlockPage.css";

interface StatBlock {
  name: string;
  size: string;
  type: string;
  alignment: string;
  ac: number;
  hp: number;
  speed: string;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  cr: string;
  traits: string;
  actions: string;
}

export default function StatBlockPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [statBlock, setStatBlock] = useState<StatBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (id) {
      loadStatBlock(decodeURIComponent(id));
    } else {
      setStatBlock(createDefaultStatBlock());
      setLoading(false);
    }
  }, [id]);

  async function loadStatBlock(path: string) {
    setLoading(true);
    setError(null);
    try {
      const content = await invoke<string>("read_file", { path });
      const data = JSON.parse(content) as StatBlock;
      setStatBlock(data);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }

  function createDefaultStatBlock(): StatBlock {
    return {
      name: "New Creature",
      size: "Medium",
      type: "humanoid",
      alignment: "neutral",
      ac: 10,
      hp: 10,
      speed: "30 ft.",
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      cr: "1",
      traits: "",
      actions: ""
    };
  }

  function updateStatBlock<K extends keyof StatBlock>(key: K, value: StatBlock[K]) {
    if (!statBlock) return;
    setStatBlock({ ...statBlock, [key]: value });
    setDirty(true);
  }

  function updateStat(stat: keyof StatBlock["stats"], value: number) {
    if (!statBlock) return;
    setStatBlock({
      ...statBlock,
      stats: { ...statBlock.stats, [stat]: value }
    });
    setDirty(true);
  }

  async function saveStatBlock() {
    if (!statBlock || !id) return;
    try {
      const content = JSON.stringify(statBlock, null, 2);
      await invoke("write_file", { path: decodeURIComponent(id), content });
      setDirty(false);
    } catch (err) {
      setError(err as string);
    }
  }

  if (loading) {
    return (
      <div className="stat-block-page">
        <div className="loading">Loading stat block...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stat-block-page">
        <div className="error-banner">
          <p>Error: {error}</p>
          <button onClick={() => navigate("/")}>Go Back</button>
        </div>
      </div>
    );
  }

  if (!statBlock) return null;

  const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

  return (
    <div className="stat-block-page">
      <header className="page-header">
        <button className="btn-ghost" onClick={() => navigate("/")}>
          ← Back
        </button>
        {dirty && <button onClick={saveStatBlock}>Save</button>}
      </header>

      <div className="stat-block-container">
        <input
          type="text"
          className="creature-name-input"
          value={statBlock.name}
          onChange={(e) => updateStatBlock("name", e.target.value)}
          placeholder="Creature Name"
        />

        <div className="creature-meta">
          <select value={statBlock.size} onChange={(e) => updateStatBlock("size", e.target.value)}>
            <option>Tiny</option>
            <option>Small</option>
            <option>Medium</option>
            <option>Large</option>
            <option>Huge</option>
            <option>Gargantuan</option>
          </select>
          <input
            type="text"
            value={statBlock.type}
            onChange={(e) => updateStatBlock("type", e.target.value)}
            placeholder="Type"
          />
          <input
            type="text"
            value={statBlock.alignment}
            onChange={(e) => updateStatBlock("alignment", e.target.value)}
            placeholder="Alignment"
          />
        </div>

        <div className="stat-line">
          <div className="stat-item">
            <label>Armor Class</label>
            <input
              type="number"
              value={statBlock.ac}
              onChange={(e) => updateStatBlock("ac", parseInt(e.target.value) || 10)}
            />
          </div>
          <div className="stat-item">
            <label>Hit Points</label>
            <input
              type="number"
              value={statBlock.hp}
              onChange={(e) => updateStatBlock("hp", parseInt(e.target.value) || 10)}
            />
          </div>
          <div className="stat-item">
            <label>Speed</label>
            <input
              type="text"
              value={statBlock.speed}
              onChange={(e) => updateStatBlock("speed", e.target.value)}
            />
          </div>
          <div className="stat-item">
            <label>Challenge Rating</label>
            <input
              type="text"
              value={statBlock.cr}
              onChange={(e) => updateStatBlock("cr", e.target.value)}
            />
          </div>
        </div>

        <div className="ability-scores">
          {ABILITIES.map((ability) => {
            const score = statBlock.stats[ability];
            const mod = calculateModifier(score);
            return (
              <div key={ability} className="ability-box">
                <span className="ability-name">{ability.toUpperCase()}</span>
                <input
                  type="number"
                  className="ability-score"
                  value={score}
                  onChange={(e) => updateStat(ability, parseInt(e.target.value) || 10)}
                  min="1"
                  max="30"
                />
                <span className="ability-mod">{formatModifier(mod)}</span>
              </div>
            );
          })}
        </div>

        <div className="section">
          <h3>Traits</h3>
          <textarea
            value={statBlock.traits}
            onChange={(e) => updateStatBlock("traits", e.target.value)}
            placeholder="Special traits, resistances, immunities..."
            rows={6}
          />
        </div>

        <div className="section">
          <h3>Actions</h3>
          <textarea
            value={statBlock.actions}
            onChange={(e) => updateStatBlock("actions", e.target.value)}
            placeholder="Actions the creature can take..."
            rows={8}
          />
        </div>
      </div>
    </div>
  );
}
