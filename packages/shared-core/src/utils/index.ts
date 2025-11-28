/**
 * Utility functions for D&D data handling.
 * Shared between VS Code extension and Tauri app.
 */

import type { Spell, Item, Monster, CustomSpell, CompendiumSearchResult } from '../types';

// ============================================================================
// Nested Object Helpers
// ============================================================================

/**
 * Get a value from a nested object using dot notation.
 * Example: getNestedValue(obj, 'stats.str') returns obj.stats.str
 */
export function getNestedValue<T = unknown>(obj: Record<string, unknown>, path: string): T | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current as T;
}

/**
 * Set a value in a nested object using dot notation.
 * Creates intermediate objects if they don't exist.
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format a spell for compact display (autocomplete, lists).
 */
export function formatSpellCompact(spell: Spell): string {
  const levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
  return `${spell.name} (${levelText} ${spell.school})`;
}

/**
 * Format an item for compact display (autocomplete, lists).
 */
export function formatItemCompact(item: Item): string {
  const parts = [item.name];
  if (item.subtype) {
    parts.push(`(${item.subtype})`);
  } else {
    parts.push(`(${item.type})`);
  }
  if (item.magic && item.rarity !== 'Common') {
    parts.push(`- ${item.rarity}`);
  }
  return parts.join(' ');
}

/**
 * Format a monster for compact display.
 */
export function formatMonsterCompact(monster: Monster): string {
  return `${monster.name} (${monster.type} - CR ${monster.cr})`;
}

/**
 * Format a spell as a search result.
 */
export function formatSpellSearchResult(spell: Spell): CompendiumSearchResult {
  return {
    type: 'spell',
    name: spell.name,
    subtitle: `${spell.level === 0 ? 'Cantrip' : 'Level ' + spell.level} ${spell.school}`,
    isCustom: spell.source === 'Custom',
  };
}

/**
 * Format a monster as a search result.
 */
export function formatMonsterSearchResult(monster: Monster): CompendiumSearchResult {
  return {
    type: 'monster',
    name: monster.name,
    subtitle: `${monster.type} - CR ${monster.cr}`,
  };
}

/**
 * Format an item as a search result.
 */
export function formatItemSearchResult(item: Item): CompendiumSearchResult {
  const parts = [item.subtype || item.type];
  if (item.magic && item.rarity !== 'Common') {
    parts.push(item.rarity);
  }
  return {
    type: 'item',
    name: item.name,
    subtitle: parts.join(' - '),
  };
}

// ============================================================================
// CustomSpell Conversion
// ============================================================================

/**
 * Convert a CustomSpell to the standard Spell format.
 */
export function customSpellToSpell(custom: CustomSpell): Spell {
  // Build components string
  const components: string[] = [];
  if (custom.componentV) components.push('V');
  if (custom.componentS) components.push('S');
  if (custom.componentM) {
    components.push(custom.materials ? `M (${custom.materials})` : 'M');
  }

  // Parse classes string to array
  const classes = custom.classes
    ? custom.classes.split(',').map(c => c.trim()).filter(c => c)
    : [];

  return {
    name: custom.name,
    level: custom.level,
    school: custom.school,
    castingTime: custom.castingTime,
    range: custom.range,
    components: components.join(', '),
    duration: custom.duration,
    description: custom.description,
    higherLevels: custom.higherLevels,
    classes,
    ritual: custom.ritual,
    concentration: custom.concentration,
    source: 'Custom',
  };
}

// ============================================================================
// String Helpers
// ============================================================================

/**
 * Sanitize a filename by removing invalid characters.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a unique ID.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Debounce a function.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
