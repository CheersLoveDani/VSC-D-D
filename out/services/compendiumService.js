"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompendiumService = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
// School abbreviation mapping
const SCHOOL_MAP = {
    'A': 'Abjuration',
    'C': 'Conjuration',
    'D': 'Divination',
    'EN': 'Enchantment',
    'EV': 'Evocation',
    'I': 'Illusion',
    'N': 'Necromancy',
    'T': 'Transmutation'
};
class CompendiumService {
    constructor(context) {
        this.spells = new Map();
        this.monsters = new Map();
        this.items = new Map();
        this.initialized = false;
        this.context = context;
    }
    static getInstance(context) {
        if (!CompendiumService.instance) {
            if (!context) {
                throw new Error('CompendiumService must be initialized with context first');
            }
            CompendiumService.instance = new CompendiumService(context);
        }
        return CompendiumService.instance;
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        // Load bundled SRD data first
        await this.loadSrdData();
        // Check for user-imported compendium
        const config = vscode.workspace.getConfiguration('dnd.compendium');
        const importedPath = config.get('importedPath');
        if (importedPath && fs.existsSync(importedPath)) {
            await this.importXmlCompendium(importedPath);
        }
        this.initialized = true;
        console.log(`Compendium initialized: ${this.spells.size} spells, ${this.monsters.size} monsters, ${this.items.size} items`);
    }
    async loadSrdData() {
        try {
            // Load bundled SRD spells
            const srdSpellsPath = path.join(this.context.extensionPath, 'src', 'data', 'srd-spells.json');
            if (fs.existsSync(srdSpellsPath)) {
                const data = JSON.parse(fs.readFileSync(srdSpellsPath, 'utf8'));
                for (const spell of data.spells || []) {
                    this.spells.set(spell.name.toLowerCase(), spell);
                }
                console.log(`Loaded ${this.spells.size} SRD spells`);
            }
        }
        catch (error) {
            console.error('Error loading SRD data:', error);
        }
    }
    async importXmlCompendium(filePath) {
        const counts = { spells: 0, monsters: 0, items: 0 };
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            // Parse spells
            const spellMatches = content.matchAll(/<spell>([\s\S]*?)<\/spell>/g);
            for (const match of spellMatches) {
                const spell = this.parseXmlSpell(match[1]);
                if (spell && spell.name) {
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
            // Parse items
            const itemMatches = content.matchAll(/<item>([\s\S]*?)<\/item>/g);
            for (const match of itemMatches) {
                const item = this.parseXmlItem(match[1]);
                if (item && item.name) {
                    this.items.set(item.name.toLowerCase(), item);
                    counts.items++;
                }
            }
            console.log(`Imported compendium: ${counts.spells} spells, ${counts.monsters} monsters, ${counts.items} items`);
        }
        catch (error) {
            console.error('Error importing XML compendium:', error);
            vscode.window.showErrorMessage(`Failed to import compendium: ${error}`);
        }
        return counts;
    }
    parseXmlSpell(xml) {
        const getTag = (tag) => {
            const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
            return match ? match[1].trim() : '';
        };
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
            }
            else if (!line.startsWith('Source:')) {
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
        let damage;
        const rollMatches = xml.matchAll(/<roll description="([^"]*)"(?: level="(\d+)")?>([\dd+]+)<\/roll>/g);
        const damageRolls = {};
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
    parseXmlMonster(xml) {
        const getTag = (tag) => {
            const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
            return match ? match[1].trim() : '';
        };
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
    parseXmlItem(xml) {
        const getTag = (tag) => {
            const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
            return match ? match[1].trim() : '';
        };
        const name = getTag('name');
        if (!name) {
            return null;
        }
        const detail = getTag('detail');
        const attunement = detail.toLowerCase().includes('requires attunement');
        return {
            name,
            type: getTag('type') || 'item',
            rarity: detail.split(',')[1]?.trim(),
            attunement,
            description: getTag('text') || '',
            source: 'Imported Compendium'
        };
    }
    // Public API methods
    getSpell(name) {
        return this.spells.get(name.toLowerCase());
    }
    searchSpells(query, limit = 20) {
        const results = [];
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
            if (aStartsWith && !bStartsWith)
                return -1;
            if (!aStartsWith && bStartsWith)
                return 1;
            return a.name.localeCompare(b.name);
        });
    }
    getSpellsByLevel(level) {
        const results = [];
        for (const spell of this.spells.values()) {
            if (spell.level === level) {
                results.push(spell);
            }
        }
        return results.sort((a, b) => a.name.localeCompare(b.name));
    }
    getSpellsByClass(className) {
        const results = [];
        const lowerClass = className.toLowerCase();
        for (const spell of this.spells.values()) {
            if (spell.classes.some(c => c.toLowerCase().includes(lowerClass))) {
                results.push(spell);
            }
        }
        return results.sort((a, b) => a.name.localeCompare(b.name));
    }
    getAllSpellNames() {
        return Array.from(this.spells.values()).map(s => s.name).sort();
    }
    getMonster(name) {
        return this.monsters.get(name.toLowerCase());
    }
    searchMonsters(query, limit = 20) {
        const results = [];
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
    getItem(name) {
        return this.items.get(name.toLowerCase());
    }
    searchItems(query, limit = 20) {
        const results = [];
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
    getStats() {
        return {
            spells: this.spells.size,
            monsters: this.monsters.size,
            items: this.items.size
        };
    }
    // Format spell for display
    formatSpellForHover(spell) {
        const lines = [];
        lines.push(`**${spell.name}**`);
        lines.push(`*${spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} ${spell.school}${spell.ritual ? ' (ritual)' : ''}*`);
        lines.push('');
        lines.push(`**Casting Time:** ${spell.castingTime}`);
        lines.push(`**Range:** ${spell.range}`);
        lines.push(`**Components:** ${spell.components}`);
        lines.push(`**Duration:** ${spell.duration}${spell.concentration ? ' (concentration)' : ''}`);
        lines.push('');
        lines.push(spell.description);
        if (spell.higherLevels) {
            lines.push('');
            lines.push(`**At Higher Levels:** ${spell.higherLevels}`);
        }
        if (spell.damage && Object.keys(spell.damage.dice).length > 0) {
            lines.push('');
            const damageEntries = Object.entries(spell.damage.dice)
                .map(([lvl, dice]) => `Level ${lvl}: ${dice}`)
                .join(', ');
            lines.push(`**Damage (${spell.damage.type}):** ${damageEntries}`);
        }
        if (spell.classes.length > 0) {
            lines.push('');
            lines.push(`**Classes:** ${spell.classes.slice(0, 5).join(', ')}${spell.classes.length > 5 ? '...' : ''}`);
        }
        return lines.join('\n');
    }
    // Format spell for compact display (autocomplete, etc.)
    formatSpellCompact(spell) {
        const levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
        return `${spell.name} (${levelText} ${spell.school})`;
    }
}
exports.CompendiumService = CompendiumService;
//# sourceMappingURL=compendiumService.js.map