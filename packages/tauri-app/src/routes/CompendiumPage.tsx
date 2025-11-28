import { useState, useMemo } from "react";
import type { Spell, Monster, Item } from "@critcode/shared-core";
import { SCHOOL_MAP } from "@critcode/shared-core";
import "./CompendiumPage.css";

// Import SRD data - wrapped in metadata objects
import srdSpellsData from "@critcode/shared-core/data/srd/srd-spells.json";
import srdMonstersData from "@critcode/shared-core/data/srd/srd-monsters.json";
import srdItemsData from "@critcode/shared-core/data/srd/srd-items.json";

// Extract the arrays from the wrapper objects
const srdSpells = srdSpellsData.spells as Spell[];
const srdMonsters = srdMonstersData.monsters as Monster[];
const srdItems = srdItemsData.items as Item[];

type TabType = "spells" | "monsters" | "items";

export default function CompendiumPage() {
  const [activeTab, setActiveTab] = useState<TabType>("spells");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Spell | Monster | Item | null>(null);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    switch (activeTab) {
      case "spells":
        return srdSpells.filter((s) => s.name.toLowerCase().includes(query));
      case "monsters":
        return srdMonsters.filter((m) => m.name.toLowerCase().includes(query));
      case "items":
        return srdItems.filter((i) => i.name.toLowerCase().includes(query));
    }
  }, [activeTab, searchQuery]);

  function renderSpellDetails(spell: Spell) {
    return (
      <div className="detail-content">
        <div className="detail-meta">
          <span className="meta-tag">{spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}</span>
          <span className="meta-tag">{SCHOOL_MAP[spell.school] || spell.school}</span>
          {spell.ritual && <span className="meta-tag ritual">Ritual</span>}
          {spell.concentration && <span className="meta-tag concentration">Concentration</span>}
        </div>
        <div className="detail-stats">
          <div><strong>Casting Time:</strong> {spell.castingTime}</div>
          <div><strong>Range:</strong> {spell.range}</div>
          <div><strong>Components:</strong> {spell.components}</div>
          <div><strong>Duration:</strong> {spell.duration}</div>
        </div>
        <div className="detail-description">
          {spell.description.split("\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {spell.higherLevels && (
          <div className="higher-levels">
            <strong>At Higher Levels:</strong> {spell.higherLevels}
          </div>
        )}
        <div className="detail-footer">
          <span>Classes: {spell.classes.join(", ")}</span>
        </div>
      </div>
    );
  }

  function renderMonsterDetails(monster: Monster) {
    return (
      <div className="detail-content">
        <div className="detail-meta">
          <span className="meta-tag">{monster.size} {monster.type}</span>
          <span className="meta-tag">CR {monster.cr}</span>
        </div>
        <div className="detail-stats">
          <div><strong>AC:</strong> {monster.ac} {monster.acType && `(${monster.acType})`}</div>
          <div><strong>HP:</strong> {monster.hp} ({monster.hitDice})</div>
          <div><strong>Speed:</strong> {monster.speed}</div>
        </div>
        <div className="ability-row">
          <div>STR: {monster.stats?.str ?? "-"}</div>
          <div>DEX: {monster.stats?.dex ?? "-"}</div>
          <div>CON: {monster.stats?.con ?? "-"}</div>
          <div>INT: {monster.stats?.int ?? "-"}</div>
          <div>WIS: {monster.stats?.wis ?? "-"}</div>
          <div>CHA: {monster.stats?.cha ?? "-"}</div>
        </div>
        {monster.traits && monster.traits.length > 0 && (
          <div className="traits-section">
            <h4>Traits</h4>
            {monster.traits.map((t, i) => (
              <div key={i} className="trait">
                <strong>{t.name}.</strong> {t.description}
              </div>
            ))}
          </div>
        )}
        {monster.actions && monster.actions.length > 0 && (
          <div className="traits-section">
            <h4>Actions</h4>
            {monster.actions.map((a, i) => (
              <div key={i} className="trait">
                <strong>{a.name}.</strong> {a.description}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderItemDetails(item: Item) {
    return (
      <div className="detail-content">
        <div className="detail-meta">
          <span className="meta-tag">{item.type}</span>
          {item.rarity && <span className="meta-tag">{item.rarity}</span>}
          {item.attunement && <span className="meta-tag attunement">Requires Attunement</span>}
        </div>
        <div className="detail-description">
          {item.description.split("\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {item.properties && item.properties.length > 0 && (
          <div className="detail-footer">
            <span>Properties: {item.properties.join(", ")}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="compendium-page">
      <header className="page-header">
        <h1>Compendium</h1>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "spells" ? "active" : ""}`}
          onClick={() => { setActiveTab("spells"); setSelectedItem(null); }}
        >
          Spells ({srdSpells.length})
        </button>
        <button
          className={`tab ${activeTab === "monsters" ? "active" : ""}`}
          onClick={() => { setActiveTab("monsters"); setSelectedItem(null); }}
        >
          Monsters ({srdMonsters.length})
        </button>
        <button
          className={`tab ${activeTab === "items" ? "active" : ""}`}
          onClick={() => { setActiveTab("items"); setSelectedItem(null); }}
        >
          Items ({srdItems.length})
        </button>
      </div>

      {/* Search */}
      <input
        type="search"
        className="search-input"
        placeholder={`Search ${activeTab}...`}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Content */}
      {selectedItem ? (
        <div className="detail-view">
          <button className="btn-ghost back-btn" onClick={() => setSelectedItem(null)}>
            ← Back to list
          </button>
          <h2 className="detail-title">{selectedItem.name}</h2>
          {activeTab === "spells" && renderSpellDetails(selectedItem as Spell)}
          {activeTab === "monsters" && renderMonsterDetails(selectedItem as Monster)}
          {activeTab === "items" && renderItemDetails(selectedItem as Item)}
        </div>
      ) : (
        <div className="item-list">
          {filteredItems.map((item) => (
            <button
              key={item.name}
              className="item-row"
              onClick={() => setSelectedItem(item)}
            >
              <span className="item-name">{item.name}</span>
              <span className="item-meta">
                {activeTab === "spells" && `Lvl ${(item as Spell).level}`}
                {activeTab === "monsters" && `CR ${(item as Monster).cr}`}
                {activeTab === "items" && (item as Item).type}
              </span>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="empty-state">No {activeTab} found matching "{searchQuery}"</div>
          )}
        </div>
      )}
    </div>
  );
}
