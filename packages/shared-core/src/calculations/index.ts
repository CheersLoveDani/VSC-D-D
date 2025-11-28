/**
 * D&D 5e calculation functions.
 * Shared between VS Code extension and Tauri app.
 */

import type { AbilityScores, AbilityName } from '../types';

// ============================================================================
// Skill to Ability Mappings
// ============================================================================

export const SKILL_ABILITIES: Record<string, AbilityName> = {
  acrobatics: 'dex',
  animal_handling: 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  sleight_of_hand: 'dex',
  stealth: 'dex',
  survival: 'wis',
};

export const ALL_SKILLS = Object.keys(SKILL_ABILITIES);

export const ALL_ABILITIES: AbilityName[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Calculate ability modifier: (score - 10) / 2, rounded down
 */
export function calculateModifier(score: number): number {
  if (!score || isNaN(score)) return 0;
  return Math.floor((score - 10) / 2);
}

/**
 * Calculate proficiency bonus based on character level.
 * Formula: 1 + ceil(level / 4)
 */
export function calculateProficiencyBonus(level: number): number {
  if (!level || isNaN(level) || level < 1) return 2;
  return Math.ceil(level / 4) + 1;
}

/**
 * Format a modifier with + or - sign
 */
export function formatModifier(value: number): string {
  if (isNaN(value)) return '+0';
  return value >= 0 ? `+${value}` : `${value}`;
}

/**
 * Calculate saving throw bonus
 */
export function calculateSavingThrow(
  abilityScore: number,
  isProficient: boolean,
  proficiencyBonus: number
): number {
  const modifier = calculateModifier(abilityScore);
  return modifier + (isProficient ? proficiencyBonus : 0);
}

/**
 * Calculate skill bonus
 */
export function calculateSkillBonus(
  abilityScore: number,
  isProficient: boolean,
  proficiencyBonus: number,
  hasExpertise: boolean = false
): number {
  const modifier = calculateModifier(abilityScore);
  const profMod = isProficient ? proficiencyBonus : 0;
  const expertiseMod = hasExpertise ? proficiencyBonus : 0;
  return modifier + profMod + expertiseMod;
}

/**
 * Calculate passive perception
 */
export function calculatePassivePerception(
  wisdomScore: number,
  isProficient: boolean,
  proficiencyBonus: number
): number {
  const modifier = calculateModifier(wisdomScore);
  return 10 + modifier + (isProficient ? proficiencyBonus : 0);
}

/**
 * Calculate initiative (Dexterity modifier)
 */
export function calculateInitiative(dexterityScore: number): number {
  return calculateModifier(dexterityScore);
}

/**
 * Calculate spell save DC
 */
export function calculateSpellSaveDC(
  spellcastingAbilityScore: number,
  proficiencyBonus: number
): number {
  const modifier = calculateModifier(spellcastingAbilityScore);
  return 8 + proficiencyBonus + modifier;
}

/**
 * Calculate spell attack bonus
 */
export function calculateSpellAttackBonus(
  spellcastingAbilityScore: number,
  proficiencyBonus: number
): number {
  const modifier = calculateModifier(spellcastingAbilityScore);
  return proficiencyBonus + modifier;
}

/**
 * Calculate all ability modifiers from scores
 */
export function calculateAllModifiers(stats: AbilityScores): Record<AbilityName, number> {
  return {
    str: calculateModifier(stats.str),
    dex: calculateModifier(stats.dex),
    con: calculateModifier(stats.con),
    int: calculateModifier(stats.int),
    wis: calculateModifier(stats.wis),
    cha: calculateModifier(stats.cha),
  };
}

// ============================================================================
// CR & XP Calculations
// ============================================================================

/**
 * Convert Challenge Rating to XP
 */
export function crToXp(cr: string): number {
  const xpMap: Record<string, number> = {
    '0': 0, '1/8': 25, '1/4': 50, '1/2': 100,
    '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
    '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
    '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
    '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
    '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000,
    '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000,
  };
  return xpMap[cr] || 0;
}

/**
 * Convert Challenge Rating to Proficiency Bonus
 */
export function crToProficiency(cr: string): number {
  // Handle fractional CRs
  let numCr: number;
  if (cr.includes('/')) {
    const [num, denom] = cr.split('/').map(Number);
    numCr = num / denom;
  } else {
    numCr = parseFloat(cr);
  }

  if (numCr < 5) return 2;
  if (numCr < 9) return 3;
  if (numCr < 13) return 4;
  if (numCr < 17) return 5;
  if (numCr < 21) return 6;
  if (numCr < 25) return 7;
  if (numCr < 29) return 8;
  return 9;
}

// ============================================================================
// Money Calculations
// ============================================================================

/**
 * Convert all currency to total gold pieces
 */
export function calculateTotalGold(
  cp: number,
  sp: number,
  ep: number,
  gp: number,
  pp: number
): number {
  return (cp / 100) + (sp / 10) + (ep / 2) + gp + (pp * 10);
}
