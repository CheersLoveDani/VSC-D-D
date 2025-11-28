/**
 * D&D 5e data mappings and constants.
 * Shared between VS Code extension and Tauri app.
 */

// ============================================================================
// Magic School Mappings
// ============================================================================

export const SCHOOL_MAP: Record<string, string> = {
  'A': 'Abjuration',
  'C': 'Conjuration',
  'D': 'Divination',
  'EN': 'Enchantment',
  'EV': 'Evocation',
  'I': 'Illusion',
  'N': 'Necromancy',
  'T': 'Transmutation',
};

export const SCHOOL_ABBREVIATIONS: Record<string, string> = {
  'Abjuration': 'A',
  'Conjuration': 'C',
  'Divination': 'D',
  'Enchantment': 'EN',
  'Evocation': 'EV',
  'Illusion': 'I',
  'Necromancy': 'N',
  'Transmutation': 'T',
};

export const ALL_SCHOOLS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
];

// ============================================================================
// Item Type Mappings (Fight Club 5e XML format)
// ============================================================================

export const ITEM_TYPE_MAP: Record<string, { type: string; subtype?: string }> = {
  'M': { type: 'Weapon', subtype: 'Melee Weapon' },
  'R': { type: 'Weapon', subtype: 'Ranged Weapon' },
  'A': { type: 'Ammunition' },
  'LA': { type: 'Armor', subtype: 'Light Armor' },
  'MA': { type: 'Armor', subtype: 'Medium Armor' },
  'HA': { type: 'Armor', subtype: 'Heavy Armor' },
  'S': { type: 'Armor', subtype: 'Shield' },
  'W': { type: 'Wondrous Item' },
  'WD': { type: 'Wand' },
  'RD': { type: 'Rod' },
  'ST': { type: 'Staff' },
  'RG': { type: 'Ring' },
  'P': { type: 'Potion' },
  'SC': { type: 'Scroll' },
  'G': { type: 'Adventuring Gear' },
  '$': { type: 'Adventuring Gear', subtype: 'Currency/Trade Good' },
};

export const ALL_ITEM_TYPES = [
  'Weapon',
  'Armor',
  'Ammunition',
  'Wondrous Item',
  'Wand',
  'Rod',
  'Staff',
  'Ring',
  'Potion',
  'Scroll',
  'Adventuring Gear',
];

export const ALL_RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Very Rare',
  'Legendary',
  'Artifact',
];

// ============================================================================
// Damage Type Mappings
// ============================================================================

export const DAMAGE_TYPE_MAP: Record<string, string> = {
  // Standard single-letter abbreviations
  'S': 'slashing',
  'P': 'piercing',
  'B': 'bludgeoning',
  'A': 'acid',
  'C': 'cold',
  'F': 'fire',
  'L': 'lightning',
  'N': 'necrotic',
  'R': 'radiant',
  'T': 'thunder',
  // Multi-letter abbreviations found in compendiums
  'FC': 'force',
  'PS': 'psychic',
  'PY': 'psychic',
  // Additional potential abbreviations
  'O': 'force',
  'I': 'poison',
  'Y': 'psychic',
};

export const ALL_DAMAGE_TYPES = [
  'slashing',
  'piercing',
  'bludgeoning',
  'acid',
  'cold',
  'fire',
  'lightning',
  'necrotic',
  'radiant',
  'thunder',
  'force',
  'psychic',
  'poison',
];

// ============================================================================
// Weapon Property Mappings
// ============================================================================

export const PROPERTY_MAP: Record<string, string> = {
  'A': 'Ammunition',
  'F': 'Finesse',
  'H': 'Heavy',
  'L': 'Light',
  'LD': 'Loading',
  'R': 'Reach',
  'S': 'Special',
  'T': 'Thrown',
  '2H': 'Two-Handed',
  'V': 'Versatile',
  'M': 'Monk',
};

export const ALL_WEAPON_PROPERTIES = [
  'Ammunition',
  'Finesse',
  'Heavy',
  'Light',
  'Loading',
  'Reach',
  'Special',
  'Thrown',
  'Two-Handed',
  'Versatile',
  'Monk',
];

// ============================================================================
// Size Mappings
// ============================================================================

export const SIZE_MAP: Record<string, string> = {
  'T': 'Tiny',
  'S': 'Small',
  'M': 'Medium',
  'L': 'Large',
  'H': 'Huge',
  'G': 'Gargantuan',
};

export const ALL_SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

// ============================================================================
// Spellcasting Classes
// ============================================================================

export const SPELLCASTING_CLASSES = [
  'Bard',
  'Cleric',
  'Druid',
  'Paladin',
  'Ranger',
  'Sorcerer',
  'Warlock',
  'Wizard',
  'Artificer',
];

// ============================================================================
// Conditions
// ============================================================================

export const ALL_CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Exhaustion',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
];

// ============================================================================
// SRD Data Imports
// Note: These are imported at runtime by the platform-specific implementations.
// The JSON files are located in ./srd/ directory.
// ============================================================================

/**
 * Path to SRD data files (relative to this module).
 * Platform implementations should use these paths to load the data.
 */
export const SRD_DATA_PATHS = {
  spells: './srd/srd-spells.json',
  items: './srd/srd-items.json',
  monsters: './srd/srd-monsters.json',
};
