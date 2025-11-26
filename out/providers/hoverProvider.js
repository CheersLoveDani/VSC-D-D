"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DndHoverProvider = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const compendiumService_1 = require("../services/compendiumService");
class DndHoverProvider {
    /**
     * Calculate ability score modifier.
     * @param score The ability score (e.g., 10, 14, 8)
     * @returns The modifier string with sign (e.g., "+0", "+2", "-1")
     */
    calcMod(score) {
        const mod = Math.floor((score - 10) / 2);
        return mod >= 0 ? `+${mod}` : `${mod}`;
    }
    provideHover(document, position, token) {
        // Check for compendium references first: @spell[Name], @monster[Name], @item[Name]
        const compendiumHover = this.checkCompendiumReference(document, position);
        if (compendiumHover) {
            return compendiumHover;
        }
        // Check for markdown-style links to D&D files
        const range = document.getWordRangeAtPosition(position, /\[.*?\]\(.*?\)/);
        if (!range) {
            return null;
        }
        const text = document.getText(range);
        const match = text.match(/\[(.*?)\]\((.*?)\)/);
        if (!match) {
            return null;
        }
        const linkPath = match[2];
        if (!linkPath.endsWith('.dnditem') && !linkPath.endsWith('.dndchar') && !linkPath.endsWith('.dndmap') && !linkPath.endsWith('.dndstat') && !linkPath.endsWith('.dndspell')) {
            return null;
        }
        // Resolve absolute path
        const currentDir = path.dirname(document.uri.fsPath);
        const absPath = path.resolve(currentDir, linkPath);
        if (!fs.existsSync(absPath)) {
            return new vscode.Hover(`File not found: ${linkPath}`);
        }
        try {
            const content = fs.readFileSync(absPath, 'utf-8');
            const data = JSON.parse(content);
            const markdown = new vscode.MarkdownString();
            markdown.supportHtml = true;
            if (linkPath.endsWith('.dnditem')) {
                this.formatItemHover(markdown, data);
            }
            else if (linkPath.endsWith('.dndchar')) {
                this.formatCharacterHover(markdown, data);
            }
            else if (linkPath.endsWith('.dndmap')) {
                this.formatMapHover(markdown, data, linkPath);
            }
            else if (linkPath.endsWith('.dndstat')) {
                this.formatStatBlockHover(markdown, data);
            }
            else if (linkPath.endsWith('.dndspell')) {
                this.formatSpellFileHover(markdown, data);
            }
            return new vscode.Hover(markdown);
        }
        catch (e) {
            return new vscode.Hover(`Error reading file: ${e}`);
        }
    }
    formatItemHover(md, data) {
        md.appendMarkdown(`### ${data.name || 'Unknown Item'}\n`);
        md.appendMarkdown(`**Type**: ${data.type || 'Misc'} | **Value**: ${data.value || 0}gp | **Weight**: ${data.weight || 0}lb\n\n`);
        md.appendMarkdown(`${data.description || 'No description.'}`);
    }
    formatCharacterHover(md, data) {
        md.appendMarkdown(`### ${data.name || 'Unknown Character'}\n`);
        md.appendMarkdown(`**${data.race || 'Race'} ${data.class || 'Class'}**\n\n`);
        md.appendMarkdown(`**HP**: ${data.hp?.current}/${data.hp?.max} | **AC**: ${data.ac}\n`);
        md.appendMarkdown(`**STR** ${data.stats?.str} | **DEX** ${data.stats?.dex} | **CON** ${data.stats?.con} | **INT** ${data.stats?.int} | **WIS** ${data.stats?.wis} | **CHA** ${data.stats?.cha}`);
    }
    formatMapHover(md, data, linkPath) {
        md.appendMarkdown(`### Map Preview\n`);
        if (data.imagePath) {
            // For security, we might not be able to render local images easily in hover without correct URI
            // But we can try to show the path or a description
            md.appendMarkdown(`Image: ${data.imagePath}\n`);
            md.appendMarkdown(`**Pins**: ${data.pins ? data.pins.length : 0}`);
        }
    }
    formatStatBlockHover(md, data) {
        md.appendMarkdown(`### ${data.name || 'Unknown Creature'}\n`);
        md.appendMarkdown(`*${data.size || 'Medium'} ${data.type || 'humanoid'}${data.subtype ? ` (${data.subtype})` : ''}, ${data.alignment || 'neutral'}*\n\n`);
        md.appendMarkdown(`**AC** ${data.armorClass || 10} | **HP** ${data.hitPoints || 10} (${data.hitDice || '2d8'}) | **CR** ${data.challengeRating || '1/8'}\n\n`);
        // Display speed
        if (data.speed && Array.isArray(data.speed) && data.speed.length > 0) {
            const speedStr = data.speed.map((s) => `${s.name} ${s.description}`).join(', ');
            md.appendMarkdown(`**Speed**: ${speedStr}\n\n`);
        }
        // Display ability scores
        if (data.abilityScores) {
            md.appendMarkdown(`**STR** ${data.abilityScores.strength} (${this.calcMod(data.abilityScores.strength)}) | `);
            md.appendMarkdown(`**DEX** ${data.abilityScores.dexterity} (${this.calcMod(data.abilityScores.dexterity)}) | `);
            md.appendMarkdown(`**CON** ${data.abilityScores.constitution} (${this.calcMod(data.abilityScores.constitution)})\n`);
            md.appendMarkdown(`**INT** ${data.abilityScores.intelligence} (${this.calcMod(data.abilityScores.intelligence)}) | `);
            md.appendMarkdown(`**WIS** ${data.abilityScores.wisdom} (${this.calcMod(data.abilityScores.wisdom)}) | `);
            md.appendMarkdown(`**CHA** ${data.abilityScores.charisma} (${this.calcMod(data.abilityScores.charisma)})\n\n`);
        }
        // Display traits
        if (data.traits && data.traits.length > 0) {
            md.appendMarkdown(`**Traits**: `);
            md.appendMarkdown(data.traits.map((t) => t.name).join(', '));
        }
    }
    // Compendium reference handling: @spell[Name], @monster[Name], @item[Name]
    checkCompendiumReference(document, position) {
        // Match @spell[Name], @monster[Name], @item[Name] patterns
        const range = document.getWordRangeAtPosition(position, /@(spell|monster|item)\[[^\]]+\]/i);
        if (!range) {
            return null;
        }
        const text = document.getText(range);
        const match = text.match(/@(spell|monster|item)\[([^\]]+)\]/i);
        if (!match) {
            return null;
        }
        const type = match[1].toLowerCase();
        const name = match[2];
        try {
            const compendium = compendiumService_1.CompendiumService.getInstance();
            const markdown = new vscode.MarkdownString();
            markdown.supportHtml = true;
            if (type === 'spell') {
                const spell = compendium.getSpell(name);
                if (spell) {
                    this.formatSpellHover(markdown, spell);
                    return new vscode.Hover(markdown, range);
                }
                else {
                    return new vscode.Hover(`Spell not found: ${name}`, range);
                }
            }
            else if (type === 'monster') {
                const monster = compendium.getMonster(name);
                if (monster) {
                    this.formatMonsterHover(markdown, monster);
                    return new vscode.Hover(markdown, range);
                }
                else {
                    return new vscode.Hover(`Monster not found: ${name}`, range);
                }
            }
            else if (type === 'item') {
                const item = compendium.getItem(name);
                if (item) {
                    this.formatCompendiumItemHover(markdown, item);
                    return new vscode.Hover(markdown, range);
                }
                else {
                    return new vscode.Hover(`Item not found: ${name}`, range);
                }
            }
        }
        catch (e) {
            // CompendiumService not initialized yet
            return null;
        }
        return null;
    }
    formatSpellHover(md, spell) {
        const levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
        md.appendMarkdown(`### ${spell.name}\n`);
        md.appendMarkdown(`*${levelText} ${spell.school}${spell.ritual ? ' (ritual)' : ''}*\n\n`);
        md.appendMarkdown(`**Casting Time:** ${spell.castingTime}\n\n`);
        md.appendMarkdown(`**Range:** ${spell.range}\n\n`);
        md.appendMarkdown(`**Components:** ${spell.components}\n\n`);
        md.appendMarkdown(`**Duration:** ${spell.duration}${spell.concentration ? ' (concentration)' : ''}\n\n`);
        // Truncate description for hover (first 500 chars)
        const desc = spell.description.length > 500
            ? spell.description.substring(0, 500) + '...'
            : spell.description;
        md.appendMarkdown(`${desc}\n\n`);
        if (spell.higherLevels) {
            const higherText = spell.higherLevels.length > 200
                ? spell.higherLevels.substring(0, 200) + '...'
                : spell.higherLevels;
            md.appendMarkdown(`**At Higher Levels:** ${higherText}\n\n`);
        }
        if (spell.classes && spell.classes.length > 0) {
            md.appendMarkdown(`**Classes:** ${spell.classes.join(', ')}\n`);
        }
    }
    formatMonsterHover(md, monster) {
        const sizeMap = {
            'T': 'Tiny', 'S': 'Small', 'M': 'Medium', 'L': 'Large', 'H': 'Huge', 'G': 'Gargantuan'
        };
        const size = sizeMap[monster.size] || monster.size;
        md.appendMarkdown(`### ${monster.name}\n`);
        md.appendMarkdown(`*${size} ${monster.type}, ${monster.alignment}*\n\n`);
        md.appendMarkdown(`**AC** ${monster.ac} | **HP** ${monster.hp} | **CR** ${monster.cr}\n\n`);
        md.appendMarkdown(`**Speed:** ${monster.speed}\n\n`);
        // Ability scores
        md.appendMarkdown(`| STR | DEX | CON | INT | WIS | CHA |\n`);
        md.appendMarkdown(`|:---:|:---:|:---:|:---:|:---:|:---:|\n`);
        md.appendMarkdown(`| ${monster.stats.str} (${this.calcMod(monster.stats.str)}) | ${monster.stats.dex} (${this.calcMod(monster.stats.dex)}) | ${monster.stats.con} (${this.calcMod(monster.stats.con)}) | ${monster.stats.int} (${this.calcMod(monster.stats.int)}) | ${monster.stats.wis} (${this.calcMod(monster.stats.wis)}) | ${monster.stats.cha} (${this.calcMod(monster.stats.cha)}) |\n`);
    }
    formatCompendiumItemHover(md, item) {
        md.appendMarkdown(`### ${item.name}\n`);
        md.appendMarkdown(`*${item.type}${item.rarity ? `, ${item.rarity}` : ''}${item.attunement ? ' (requires attunement)' : ''}*\n\n`);
        // Truncate description for hover
        const desc = item.description.length > 500
            ? item.description.substring(0, 500) + '...'
            : item.description;
        md.appendMarkdown(`${desc}\n`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formatSpellFileHover(md, data) {
        const levelText = data.level === 0 ? 'Cantrip' : `Level ${data.level}`;
        md.appendMarkdown(`### ${data.name || 'Unknown Spell'}\n`);
        md.appendMarkdown(`*${levelText} ${data.school || 'Unknown'}${data.ritual ? ' (ritual)' : ''}*\n\n`);
        md.appendMarkdown(`**Casting Time:** ${data.castingTime || '1 action'}\n\n`);
        md.appendMarkdown(`**Range:** ${data.range || 'Self'}\n\n`);
        // Build components string
        const components = [];
        if (data.componentV) {
            components.push('V');
        }
        if (data.componentS) {
            components.push('S');
        }
        if (data.componentM) {
            components.push(`M (${data.materials || 'materials'})`);
        }
        md.appendMarkdown(`**Components:** ${components.join(', ') || 'None'}\n\n`);
        md.appendMarkdown(`**Duration:** ${data.duration || 'Instantaneous'}${data.concentration ? ' (concentration)' : ''}\n\n`);
        // Truncate description for hover
        const desc = (data.description || 'No description.').length > 500
            ? data.description.substring(0, 500) + '...'
            : (data.description || 'No description.');
        md.appendMarkdown(`${desc}\n`);
    }
}
exports.DndHoverProvider = DndHoverProvider;
//# sourceMappingURL=hoverProvider.js.map