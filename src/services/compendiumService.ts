import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Spell data interface matching both SRD API and XML formats
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

export interface Monster {
    name: string;
    size: string;
    type: string;
    alignment: string;
    ac: string;
    hp: string;
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
    description: string;
    source: string;
}

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
    damage?: {
        dice: string;
        type: string;
        twoHanded?: string;
    };
    armorClass?: {
        base: number;
        dexBonus: boolean;
        maxBonus?: number;
    };
    stealthDisadvantage?: boolean;
    strengthRequirement?: number;
    properties: string[];
    range?: {
        normal: number;
        long?: number;
    };
    description: string;
    source: string;
}

/**
 * Search result for compendium entries (used by editors for autocomplete/previews)
 */
export interface CompendiumSearchResult {
    type: 'spell' | 'monster' | 'item';
    name: string;
    subtitle: string;
}

// School abbreviation mapping
const SCHOOL_MAP: { [key: string]: string } = {
    'A': 'Abjuration',
    'C': 'Conjuration',
    'D': 'Divination',
    'EN': 'Enchantment',
    'EV': 'Evocation',
    'I': 'Illusion',
    'N': 'Necromancy',
    'T': 'Transmutation'
};

// Item type abbreviation mapping (Fight Club 5e XML format)
const ITEM_TYPE_MAP: { [key: string]: { type: string; subtype?: string } } = {
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

// Damage type abbreviation mapping (Fight Club 5e XML format)
const DAMAGE_TYPE_MAP: { [key: string]: string } = {
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

// Weapon property abbreviation mapping
const PROPERTY_MAP: { [key: string]: string } = {
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

export class CompendiumService {
    private static instance: CompendiumService;
    private spells: Map<string, Spell> = new Map();
    private monsters: Map<string, Monster> = new Map();
    private items: Map<string, Item> = new Map();
    private initialized: boolean = false;
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public static getInstance(context?: vscode.ExtensionContext): CompendiumService {
        if (!CompendiumService.instance) {
            if (!context) {
                throw new Error('CompendiumService must be initialized with context first');
            }
            CompendiumService.instance = new CompendiumService(context);
        }
        return CompendiumService.instance;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        // Load bundled SRD data first
        await this.loadSrdData();

        // Check for user-imported compendium
        const config = vscode.workspace.getConfiguration('dnd.compendium');
        const importedPath = config.get<string>('importedPath');

        if (importedPath && fs.existsSync(importedPath)) {
            await this.importXmlCompendium(importedPath);
        }

        this.initialized = true;
    }

    private async loadSrdData(): Promise<void> {
        try {
            // Load bundled SRD spells
            const srdSpellsPath = path.join(this.context.extensionPath, 'src', 'data', 'srd-spells.json');
            if (fs.existsSync(srdSpellsPath)) {
                const data = JSON.parse(fs.readFileSync(srdSpellsPath, 'utf8'));
                for (const spell of data.spells || []) {
                    this.spells.set(spell.name.toLowerCase(), spell);
                }
            }

            // Load bundled SRD items
            const srdItemsPath = path.join(this.context.extensionPath, 'src', 'data', 'srd-items.json');
            if (fs.existsSync(srdItemsPath)) {
                const data = JSON.parse(fs.readFileSync(srdItemsPath, 'utf8'));
                for (const item of data.items || []) {
                    this.items.set(item.name.toLowerCase(), item);
                }
            }
        } catch (error) {
            console.error('Error loading SRD data:', error);
        }
    }

    public async importXmlCompendium(filePath: string): Promise<{ spells: number; monsters: number; items: number }> {
        const counts = { spells: 0, monsters: 0, items: 0 };

        try {
            const content = fs.readFileSync(filePath, 'utf8');

            // Parse spells (don't overwrite SRD spells which have better data)
            const spellMatches = content.matchAll(/<spell>([\s\S]*?)<\/spell>/g);
            for (const match of spellMatches) {
                const spell = this.parseXmlSpell(match[1]);
                if (spell && spell.name && !this.spells.has(spell.name.toLowerCase())) {
                    this.spells.set(spell.name.toLowerCase(), spell);
                    counts.spells++;
                }
            }

            // Parse monsters
            const monsterMatches = content.matchAll(/<monster>([\s\S]*?)<\/monster>/g);
            for (const match of monsterMatches) {
                const monster = this.parseXmlMonster(match[1]);
                if (monster && monster.name) {
                    this.monsters.set(monster.name.toLowerCase(), monster);
                    counts.monsters++;
                }
            }

            // Parse items (don't overwrite SRD items which have better data)
            const itemMatches = content.matchAll(/<item>([\s\S]*?)<\/item>/g);
            for (const match of itemMatches) {
                const item = this.parseXmlItem(match[1]);
                if (item && item.name && !this.items.has(item.name.toLowerCase())) {
                    this.items.set(item.name.toLowerCase(), item);
                    counts.items++;
                }
            }
        } catch (error) {
            console.error('Error importing XML compendium:', error);
            vscode.window.showErrorMessage(`Failed to import compendium: ${error}`);
        }

        return counts;
    }

    /**
     * Extract content from an XML tag.
     */
    private getXmlTag(xml: string, tag: string): string {
        const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
        return match ? match[1].trim() : '';
    }

    private parseXmlSpell(xml: string): Spell | null {
        const getTag = (tag: string): string => this.getXmlTag(xml, tag);

        const name = getTag('name');
        if (!name || name.startsWith('Invocation:')) {
            return null; // Skip invocations and empty entries
        }

        const levelStr = getTag('level');
        const level = parseInt(levelStr) || 0;
        const schoolAbbr = getTag('school');
        const school = SCHOOL_MAP[schoolAbbr] || schoolAbbr || 'Unknown';

        const text = getTag('text');
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        // Extract higher levels text if present
        let description = '';
        let higherLevels = '';

        for (const line of lines) {
            if (line.startsWith('At Higher Levels:')) {
                higherLevels = line.replace('At Higher Levels:', '').trim();
            } else if (!line.startsWith('Source:')) {
                description += (description ? '\n' : '') + line;
            }
        }

        // Extract source
        const sourceMatch = text.match(/Source:\s*(.+?)(?:\n|$)/);
        const source = sourceMatch ? sourceMatch[1].trim() : 'Unknown';

        // Parse classes
        const classesStr = getTag('classes');
        const classes = classesStr.split(',').map(c => c.trim()).filter(c => c && !c.includes('('));

        // Check for concentration and ritual
        const duration = getTag('duration');
        const concentration = duration.toLowerCase().includes('concentration');
        const ritual = xml.includes('<ritual>YES</ritual>');

        // Parse damage if present
        let damage: Spell['damage'] | undefined;
        const rollMatches = xml.matchAll(/<roll description="([^"]*)"(?: level="(\d+)")?>([\dd+]+)<\/roll>/g);
        const damageRolls: { [level: number]: string } = {};
        let damageType = '';

        for (const rollMatch of rollMatches) {
            const desc = rollMatch[1];
            const lvl = rollMatch[2] ? parseInt(rollMatch[2]) : level;
            const dice = rollMatch[3];

            if (desc.toLowerCase().includes('damage')) {
                damageRolls[lvl] = dice;
                if (!damageType) {
                    // Extract damage type from description (e.g., "Fire Damage" -> "fire")
                    damageType = desc.replace(/damage/i, '').trim().toLowerCase();
                }
            }
        }

        if (Object.keys(damageRolls).length > 0) {
            damage = { type: damageType, dice: damageRolls };
        }

        return {
            name,
            level,
            school,
            castingTime: getTag('time') || '1 action',
            range: getTag('range') || 'Self',
            components: getTag('components') || '',
            duration: duration || 'Instantaneous',
            description,
            higherLevels: higherLevels || undefined,
            classes,
            ritual,
            concentration,
            source,
            damage
        };
    }

    private parseXmlMonster(xml: string): Monster | null {
        const getTag = (tag: string): string => this.getXmlTag(xml, tag);

        const name = getTag('name');
        if (!name) {
            return null;
        }

        return {
            name,
            size: getTag('size') || 'M',
            type: getTag('type') || 'unknown',
            alignment: getTag('alignment') || 'unaligned',
            ac: getTag('ac') || '10',
            hp: getTag('hp') || '1',
            speed: getTag('speed') || '30 ft.',
            stats: {
                str: parseInt(getTag('str')) || 10,
                dex: parseInt(getTag('dex')) || 10,
                con: parseInt(getTag('con')) || 10,
                int: parseInt(getTag('int')) || 10,
                wis: parseInt(getTag('wis')) || 10,
                cha: parseInt(getTag('cha')) || 10
            },
            cr: getTag('cr') || '0',
            description: getTag('description') || '',
            source: 'Imported Compendium'
        };
    }

    private parseXmlItem(xml: string): Item | null {
        const getTag = (tag: string): string => this.getXmlTag(xml, tag);

        const name = getTag('name');
        if (!name) {
            return null;
        }

        const detail = getTag('detail');
        const attunement = detail.toLowerCase().includes('requires attunement');

        // Extract attunement requirement if present
        let attunementRequirement: string | undefined;
        const attunementMatch = detail.match(/requires attunement(?: by (?:a |an )?([^,)]+))?/i);
        if (attunementMatch && attunementMatch[1]) {
            attunementRequirement = attunementMatch[1].trim();
        }

        // Parse rarity from detail string
        const rarityMatch = detail.match(/\b(common|uncommon|rare|very rare|legendary|artifact)\b/i);
        const rarity = rarityMatch ? rarityMatch[1].charAt(0).toUpperCase() + rarityMatch[1].slice(1).toLowerCase() : 'Common';

        // Parse weight
        const weightStr = getTag('weight');
        const weight = parseFloat(weightStr) || 0;

        // Parse value
        const value = getTag('value') || '';

        // Determine if magic item
        const magic = rarity !== 'Common' || detail.toLowerCase().includes('magic');

        // Parse properties and map abbreviations to full names
        const propertyStr = getTag('property');
        const properties = propertyStr
            ? propertyStr.split(',').map(p => p.trim()).filter(p => p).map(p => PROPERTY_MAP[p] || p)
            : [];

        // Parse damage if present, mapping type abbreviation
        const dmgStr = getTag('dmg1');
        const dmgTypeRaw = getTag('dmgType');
        const dmgType = DAMAGE_TYPE_MAP[dmgTypeRaw] || dmgTypeRaw;
        const dmg2Str = getTag('dmg2');

        let damage: Item['damage'] | undefined;
        if (dmgStr) {
            // Standard damage tags present
            damage = {
                dice: dmgStr,
                type: dmgType || '',
                twoHanded: dmg2Str || undefined
            };
        } else {
            // Try to extract damage from <roll> tags if no dmg1 tag
            // Look for roll tags with "damage" in description
            const rollMatch = xml.match(/<roll description="([^"]*[Dd]amage[^"]*)">([\dd+]+)<\/roll>/);
            if (rollMatch) {
                const rollDesc = rollMatch[1].toLowerCase();
                const rollDice = rollMatch[2];
                // Extract damage type from description (e.g., "Fire Damage" -> "fire")
                let rollDamageType = '';
                for (const fullType of Object.values(DAMAGE_TYPE_MAP)) {
                    if (rollDesc.includes(fullType)) {
                        rollDamageType = fullType;
                        break;
                    }
                }
                // Also check for full type names directly
                const typeMatch = rollDesc.match(/(slashing|piercing|bludgeoning|fire|cold|lightning|thunder|poison|acid|necrotic|radiant|force|psychic)/i);
                if (typeMatch) {
                    rollDamageType = typeMatch[1].toLowerCase();
                }
                damage = {
                    dice: rollDice,
                    type: rollDamageType,
                    twoHanded: undefined
                };
            }
        }

        // Parse AC if present
        const acStr = getTag('ac');
        const armorClass = acStr ? {
            base: parseInt(acStr) || 0,
            dexBonus: !detail.toLowerCase().includes('heavy'),
            maxBonus: detail.toLowerCase().includes('medium') ? 2 : undefined
        } : undefined;

        // Parse stealth disadvantage
        const stealthStr = getTag('stealth');
        const stealthDisadvantage = stealthStr.toLowerCase() === 'yes';

        // Parse strength requirement
        const strengthStr = getTag('strength');
        const strengthRequirement = strengthStr ? parseInt(strengthStr) : undefined;

        // Parse range if present
        const rangeStr = getTag('range');
        let range: Item['range'] | undefined;
        if (rangeStr) {
            const rangeMatch = rangeStr.match(/(\d+)(?:\/(\d+))?/);
            if (rangeMatch) {
                range = {
                    normal: parseInt(rangeMatch[1]),
                    long: rangeMatch[2] ? parseInt(rangeMatch[2]) : undefined
                };
            }
        }

        // Map XML type abbreviation to proper type/subtype
        const xmlType = getTag('type');
        const typeInfo = ITEM_TYPE_MAP[xmlType] || { type: xmlType || 'Adventuring Gear' };

        return {
            name,
            type: typeInfo.type,
            subtype: typeInfo.subtype,
            rarity,
            magic,
            attunement,
            attunementRequirement,
            weight,
            value,
            damage,
            armorClass,
            stealthDisadvantage: stealthDisadvantage || undefined,
            strengthRequirement,
            properties,
            range,
            description: getTag('text') || '',
            source: 'Imported Compendium'
        };
    }

    // Public API methods
    public getSpell(name: string): Spell | undefined {
        return this.spells.get(name.toLowerCase());
    }

    public searchSpells(query: string, limit: number = 20): Spell[] {
        const results: Spell[] = [];
        const lowerQuery = query.toLowerCase();

        for (const [key, spell] of this.spells) {
            if (key.includes(lowerQuery) || spell.name.toLowerCase().includes(lowerQuery)) {
                results.push(spell);
                if (results.length >= limit) {
                    break;
                }
            }
        }

        return results.sort((a, b) => {
            // Prioritize exact prefix matches
            const aStartsWith = a.name.toLowerCase().startsWith(lowerQuery);
            const bStartsWith = b.name.toLowerCase().startsWith(lowerQuery);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    public getMonster(name: string): Monster | undefined {
        return this.monsters.get(name.toLowerCase());
    }

    public searchMonsters(query: string, limit: number = 20): Monster[] {
        const results: Monster[] = [];
        const lowerQuery = query.toLowerCase();

        for (const [key, monster] of this.monsters) {
            if (key.includes(lowerQuery)) {
                results.push(monster);
                if (results.length >= limit) {
                    break;
                }
            }
        }

        return results.sort((a, b) => a.name.localeCompare(b.name));
    }

    public getItem(name: string): Item | undefined {
        return this.items.get(name.toLowerCase());
    }

    public searchItems(query: string, limit: number = 20): Item[] {
        const results: Item[] = [];
        const lowerQuery = query.toLowerCase();

        for (const [key, item] of this.items) {
            if (key.includes(lowerQuery)) {
                results.push(item);
                if (results.length >= limit) {
                    break;
                }
            }
        }

        return results.sort((a, b) => a.name.localeCompare(b.name));
    }

    public getStats(): { spells: number; monsters: number; items: number } {
        return {
            spells: this.spells.size,
            monsters: this.monsters.size,
            items: this.items.size
        };
    }

    // Format spell for compact display (autocomplete, etc.)
    public formatSpellCompact(spell: Spell): string {
        const levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
        return `${spell.name} (${levelText} ${spell.school})`;
    }

    /**
     * Format a spell as a search result for UI display.
     */
    public formatSpellSearchResult(spell: Spell): CompendiumSearchResult {
        return {
            type: 'spell',
            name: spell.name,
            subtitle: `${spell.level === 0 ? 'Cantrip' : 'Level ' + spell.level} ${spell.school}`
        };
    }

    /**
     * Format a monster as a search result for UI display.
     */
    public formatMonsterSearchResult(monster: Monster): CompendiumSearchResult {
        return {
            type: 'monster',
            name: monster.name,
            subtitle: `${monster.type} - CR ${monster.cr}`
        };
    }

    /**
     * Format an item as a search result for UI display.
     */
    public formatItemSearchResult(item: Item): CompendiumSearchResult {
        const parts = [item.subtype || item.type];
        if (item.magic && item.rarity !== 'Common') {
            parts.push(item.rarity);
        }
        return {
            type: 'item',
            name: item.name,
            subtitle: parts.join(' - ')
        };
    }

    // Format item for compact display (autocomplete, etc.)
    public formatItemCompact(item: Item): string {
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
     * Search all compendium entries and return formatted results.
     */
    public searchAll(query: string, searchType: 'spell' | 'monster' | 'item' | 'all' = 'all', limit: number = 5): CompendiumSearchResult[] {
        let results: CompendiumSearchResult[] = [];

        if (searchType === 'spell' || searchType === 'all') {
            const spells = this.searchSpells(query, limit).map(s => this.formatSpellSearchResult(s));
            results = results.concat(spells);
        }
        if (searchType === 'monster' || searchType === 'all') {
            const monsters = this.searchMonsters(query, limit).map(m => this.formatMonsterSearchResult(m));
            results = results.concat(monsters);
        }
        if (searchType === 'item' || searchType === 'all') {
            const items = this.searchItems(query, limit).map(i => this.formatItemSearchResult(i));
            results = results.concat(items);
        }

        return results;
    }

    /**
     * Get full spell info formatted for webview display.
     */
    public getSpellInfo(name: string): {
        name: string;
        level: number;
        school: string;
        castingTime: string;
        range: string;
        components: string;
        duration: string;
        description: string;
        higherLevels?: string;
        concentration: boolean;
        ritual: boolean;
        damage?: Spell['damage'];
        classes: string[];
    } | null {
        const spell = this.getSpell(name);
        if (!spell) {
            return null;
        }
        return {
            name: spell.name,
            level: spell.level,
            school: spell.school,
            castingTime: spell.castingTime,
            range: spell.range,
            components: spell.components,
            duration: spell.duration,
            description: spell.description,
            higherLevels: spell.higherLevels,
            concentration: spell.concentration,
            ritual: spell.ritual,
            damage: spell.damage,
            classes: spell.classes
        };
    }

    /**
     * Get full item info formatted for webview display.
     */
    public getItemInfo(name: string): {
        name: string;
        type: string;
        subtype?: string;
        rarity: string;
        magic: boolean;
        attunement: boolean;
        attunementRequirement?: string;
        weight: number;
        value: string;
        damage?: Item['damage'];
        armorClass?: Item['armorClass'];
        properties: string[];
        range?: Item['range'];
        description: string;
    } | null {
        const item = this.getItem(name);
        if (!item) {
            return null;
        }
        return {
            name: item.name,
            type: item.type,
            subtype: item.subtype,
            rarity: item.rarity,
            magic: item.magic,
            attunement: item.attunement,
            attunementRequirement: item.attunementRequirement,
            weight: item.weight,
            value: item.value,
            damage: item.damage,
            armorClass: item.armorClass,
            properties: item.properties,
            range: item.range,
            description: item.description
        };
    }
}
