/**
 * Shared UI Logic Utilities
 * 
 * These functions are used across both VS Code extension and Tauri app
 * to ensure consistent behavior and calculations.
 */

// Re-export calculation functions from calculations module
export {
  calculateModifier,
  calculateProficiencyBonus,
  formatModifier,
  calculatePassivePerception,
  calculateInitiative,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  calculateSavingThrow,
  calculateSkillBonus as calculateSkillModifier,
  calculateTotalGold,
  SKILL_ABILITIES,
  ALL_ABILITIES,
  ALL_SKILLS
} from '../calculations';

// Import for internal use
import { calculateModifier } from '../calculations';

/**
 * Ability score labels
 */
export const ABILITY_LABELS = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA'
} as const;

/**
 * Ability score keys
 */
export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

/**
 * Calculate attack bonus: ability modifier + proficiency bonus
 */
export function calculateAttackBonus(
  abilityScore: number,
  proficiencyBonus: number
): number {
  const abilityMod = calculateModifier(abilityScore);
  return abilityMod + proficiencyBonus;
}

/**
 * Calculate damage bonus: ability modifier + bonus damage
 */
export function calculateDamageBonus(
  abilityScore: number,
  bonusDamage: number = 0
): number {
  const abilityMod = calculateModifier(abilityScore);
  return abilityMod + bonusDamage;
}

/**
 * Adjust HP (heal or damage)
 */
export function adjustHP(
  currentHP: number,
  maxHP: number,
  adjustment: number,
  isHealing: boolean
): number {
  if (isHealing) {
    return Math.min(currentHP + adjustment, maxHP);
  } else {
    return Math.max(currentHP - adjustment, -maxHP);
  }
}
