/**
 * Core types for D&D 5e data structures.
 * Shared between VS Code extension and Tauri app.
 */

// ============================================================================
// Spell Types
// ============================================================================

export interface Spell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  higherLevels?: string;
  classes: string[];
  ritual: boolean;
  concentration: boolean;
  source: string;
  damage?: {
    type: string;
    dice: { [level: number]: string };
  };
}

export interface CustomSpell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  componentV: boolean;
  componentS: boolean;
  componentM: boolean;
  materials?: string;
  ritual: boolean;
  concentration: boolean;
  classes: string;
  description: string;
  higherLevels?: string;
  filePath?: string;
}

// ============================================================================
// Monster Types
// ============================================================================

export interface Monster {
  name: string;
  size: string;
  type: string;
  subtype?: string;
  alignment: string;
  ac: number;
  acType?: string;
  hp: number;
  hitDice: string;
  speed: string;
  stats: AbilityScores;
  saves?: string[];
  skills?: string[];
  damageVulnerabilities?: string[];
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: string[];
  senses: string;
  languages: string;
  cr: string;
  xp: number;
  proficiencyBonus: number;
  traits?: MonsterFeature[];
  actions?: MonsterFeature[];
  reactions?: MonsterFeature[];
  legendaryActions?: MonsterFeature[];
  legendaryDescription?: string;
  description?: string;
  source: string;
}

export interface MonsterFeature {
  name: string;
  description: string;
}

// ============================================================================
// Item Types
// ============================================================================

export interface Item {
  name: string;
  type: string;
  subtype?: string;
  rarity: string;
  magic: boolean;
  attunement: boolean;
  attunementRequirement?: string;
  weight: number;
  value: string;
  damage?: ItemDamage;
  armorClass?: ItemArmorClass;
  stealthDisadvantage?: boolean;
  strengthRequirement?: number;
  properties: string[];
  range?: ItemRange;
  description: string;
  source: string;
}

export interface ItemDamage {
  dice: string;
  type: string;
  twoHanded?: string;
}

export interface ItemArmorClass {
  base: number;
  dexBonus: boolean;
  maxBonus?: number;
}

export interface ItemRange {
  normal: number;
  long?: number;
}

export interface CustomWeapon {
  name: string;
  type: string;
  subtype?: string;
  rarity: string;
  magic: boolean;
  attunement: boolean;
  attunementRequirement?: string;
  weight: number;
  value: string;
  damage?: ItemDamage;
  properties: string[];
  range?: ItemRange;
  description: string;
  filePath?: string;
}

// ============================================================================
// Character Types
// ============================================================================

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export type AbilityName = keyof AbilityScores;

export interface Character {
  name: string;
  playerName: string;
  class: string;
  level: number;
  background: string;
  race: string;
  alignment: string;
  xp: number;
  stats: AbilityScores;
  hp: {
    current: number;
    max: number;
    temp: number;
  };
  ac: number;
  speed: string;
  hitDice: string;
  inspiration: boolean;
  money: {
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
    total: number;
  };
  deathSaves: {
    success1: boolean;
    success2: boolean;
    success3: boolean;
    failure1: boolean;
    failure2: boolean;
    failure3: boolean;
  };
  saves: {
    [key in AbilityName]: { prof: boolean };
  };
  skills: {
    [skillName: string]: { prof: boolean };
  };
  proficienciesAndLanguages: string;
  attacks: string;
  equipment: string;
  traits: string;
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  appearance: string;
  backstory: string;
  allies: string;
  additionalFeatures: string;
  treasure: string;
  spellcastingClass: string;
  spellcastingAbility: string;
  spellList: string;
  spellSlots: {
    [level: string]: {
      total: number;
      expended: number;
    };
  };
}

// ============================================================================
// Search & Compendium Types
// ============================================================================

export interface CompendiumSearchResult {
  type: 'spell' | 'monster' | 'item';
  name: string;
  subtitle: string;
  isCustom?: boolean;
}

// ============================================================================
// File Types
// ============================================================================

export type DndFileType =
  | 'dndchar'
  | 'dndspell'
  | 'dnditem'
  | 'dndmap'
  | 'dndnotes'
  | 'dndstat';

export interface DndFileInfo {
  name: string;
  path: string;
  type: DndFileType;
  isDirectory: boolean;
}
