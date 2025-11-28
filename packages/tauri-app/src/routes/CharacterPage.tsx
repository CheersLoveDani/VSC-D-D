import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import type { Character, AbilityName } from "@critcode/shared-core";
import { calculateModifier, calculateProficiencyBonus } from "@critcode/shared-core";
import "./CharacterPage.css";

const ABILITY_KEYS: AbilityName[] = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS: Record<AbilityName, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

export default function CharacterPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (id) {
      loadCharacter(decodeURIComponent(id));
    } else {
      setCharacter(createDefaultCharacter());
      setLoading(false);
    }
  }, [id]);

  async function loadCharacter(path: string) {
    setLoading(true);
    setError(null);
    try {
      const content = await invoke<string>("read_file", { path });
      const data = JSON.parse(content) as Character;
      setCharacter(data);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }

  function createDefaultCharacter(): Character {
    return {
      name: "New Character",
      playerName: "",
      class: "",
      level: 1,
      background: "",
      race: "",
      alignment: "",
      xp: 0,
      stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      hp: { current: 10, max: 10, temp: 0 },
      ac: 10,
      speed: "30 ft.",
      hitDice: "1d10",
      inspiration: false,
      money: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, total: 0 },
      deathSaves: {
        success1: false, success2: false, success3: false,
        failure1: false, failure2: false, failure3: false,
      },
      saves: {
        str: { prof: false }, dex: { prof: false }, con: { prof: false },
        int: { prof: false }, wis: { prof: false }, cha: { prof: false },
      },
      skills: {},
      proficienciesAndLanguages: "",
      attacks: "",
      equipment: "",
      traits: "",
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      appearance: "",
      backstory: "",
      allies: "",
      additionalFeatures: "",
      treasure: "",
      spellcastingClass: "",
      spellcastingAbility: "",
      spellList: "",
      spellSlots: {},
    };
  }

  function updateCharacter<K extends keyof Character>(key: K, value: Character[K]) {
    if (!character) return;
    setCharacter({ ...character, [key]: value });
    setDirty(true);
  }

  function updateAbilityScore(ability: AbilityName, value: number) {
    if (!character) return;
    setCharacter({
      ...character,
      stats: { ...character.stats, [ability]: value },
    });
    setDirty(true);
  }

  async function saveCharacter() {
    if (!character || !id) return;
    try {
      const content = JSON.stringify(character, null, 2);
      await invoke("write_file", { path: decodeURIComponent(id), content });
      setDirty(false);
    } catch (err) {
      setError(err as string);
    }
  }

  if (loading) {
    return (
      <div className="character-page">
        <div className="loading">Loading character...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="character-page">
        <div className="error-banner">
          <p>Error: {error}</p>
          <button onClick={() => navigate("/")}>Go Back</button>
        </div>
      </div>
    );
  }

  if (!character) return null;

  const profBonus = calculateProficiencyBonus(character.level);

  return (
    <div className="character-page">
      <header className="page-header">
        <button className="btn-ghost" onClick={() => navigate("/")}>
          ← Back
        </button>
        {dirty && <button onClick={saveCharacter}>Save</button>}
      </header>

      {/* Character Name & Basic Info */}
      <section className="card character-header">
        <input
          type="text"
          className="character-name-input"
          value={character.name}
          onChange={(e) => updateCharacter("name", e.target.value)}
          placeholder="Character Name"
        />
        <div className="basic-info-grid">
          <div className="info-field">
            <label>Class</label>
            <input
              type="text"
              value={character.class}
              onChange={(e) => updateCharacter("class", e.target.value)}
              placeholder="Fighter"
            />
          </div>
          <div className="info-field">
            <label>Level</label>
            <input
              type="number"
              min="1"
              max="20"
              value={character.level}
              onChange={(e) => updateCharacter("level", parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="info-field">
            <label>Race</label>
            <input
              type="text"
              value={character.race}
              onChange={(e) => updateCharacter("race", e.target.value)}
              placeholder="Human"
            />
          </div>
          <div className="info-field">
            <label>Background</label>
            <input
              type="text"
              value={character.background}
              onChange={(e) => updateCharacter("background", e.target.value)}
              placeholder="Soldier"
            />
          </div>
        </div>
      </section>

      {/* Combat Stats */}
      <section className="combat-stats">
        <div className="stat-box">
          <span className="stat-value">{character.ac}</span>
          <span className="stat-label">AC</span>
        </div>
        <div className="stat-box hp-box">
          <div className="hp-display">
            <input
              type="number"
              className="hp-current"
              value={character.hp.current}
              onChange={(e) =>
                updateCharacter("hp", {
                  ...character.hp,
                  current: parseInt(e.target.value) || 0,
                })
              }
            />
            <span className="hp-separator">/</span>
            <input
              type="number"
              className="hp-max"
              value={character.hp.max}
              onChange={(e) =>
                updateCharacter("hp", {
                  ...character.hp,
                  max: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
          <span className="stat-label">Hit Points</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{character.speed}</span>
          <span className="stat-label">Speed</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">+{profBonus}</span>
          <span className="stat-label">Prof</span>
        </div>
      </section>

      {/* Ability Scores */}
      <section className="ability-scores">
        {ABILITY_KEYS.map((ability) => {
          const score = character.stats[ability] ?? 10;
          const mod = calculateModifier(score);
          return (
            <div key={ability} className="ability-box">
              <span className="ability-name">{ABILITY_LABELS[ability]}</span>
              <span className="ability-mod">{mod >= 0 ? `+${mod}` : mod}</span>
              <input
                type="number"
                className="ability-score"
                min="1"
                max="30"
                value={score}
                onChange={(e) => updateAbilityScore(ability, parseInt(e.target.value) || 10)}
              />
            </div>
          );
        })}
      </section>

      {/* Notes/Backstory */}
      <section className="card">
        <h3>Backstory</h3>
        <textarea
          value={character.backstory || ""}
          onChange={(e) => updateCharacter("backstory", e.target.value)}
          placeholder="Character backstory..."
          rows={4}
        />
      </section>
    </div>
  );
}
