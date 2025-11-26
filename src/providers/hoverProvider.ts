import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CompendiumService, Spell, Monster, Item } from '../services/compendiumService';

export class DndHoverProvider implements vscode.HoverProvider {

    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {

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
        if (!linkPath.endsWith('.dnditem') && !linkPath.endsWith('.dndchar') && !linkPath.endsWith('.dndmap') && !linkPath.endsWith('.dndstat')) {
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
            } else if (linkPath.endsWith('.dndchar')) {
                this.formatCharacterHover(markdown, data);
            } else if (linkPath.endsWith('.dndmap')) {
                this.formatMapHover(markdown, data, linkPath);
            } else if (linkPath.endsWith('.dndstat')) {
                this.formatStatBlockHover(markdown, data);
            }

            return new vscode.Hover(markdown);
        } catch (e) {
            return new vscode.Hover(`Error reading file: ${e}`);
        }
    }

    private formatItemHover(md: vscode.MarkdownString, data: any) {
        md.appendMarkdown(`### ${data.name || 'Unknown Item'}\n`);
        md.appendMarkdown(`**Type**: ${data.type || 'Misc'} | **Value**: ${data.value || 0}gp | **Weight**: ${data.weight || 0}lb\n\n`);
        md.appendMarkdown(`${data.description || 'No description.'}`);
    }

    private formatCharacterHover(md: vscode.MarkdownString, data: any) {
        md.appendMarkdown(`### ${data.name || 'Unknown Character'}\n`);
        md.appendMarkdown(`**${data.race || 'Race'} ${data.class || 'Class'}**\n\n`);
        md.appendMarkdown(`**HP**: ${data.hp?.current}/${data.hp?.max} | **AC**: ${data.ac}\n`);
        md.appendMarkdown(`**STR** ${data.stats?.str} | **DEX** ${data.stats?.dex} | **CON** ${data.stats?.con} | **INT** ${data.stats?.int} | **WIS** ${data.stats?.wis} | **CHA** ${data.stats?.cha}`);
    }

    private formatMapHover(md: vscode.MarkdownString, data: any, linkPath: string) {
        md.appendMarkdown(`### Map Preview\n`);
        if (data.imagePath) {
            // For security, we might not be able to render local images easily in hover without correct URI
            // But we can try to show the path or a description
            md.appendMarkdown(`Image: ${data.imagePath}\n`);
            md.appendMarkdown(`**Pins**: ${data.pins ? data.pins.length : 0}`);
        }
    }

    private formatStatBlockHover(md: vscode.MarkdownString, data: any) {
        md.appendMarkdown(`### ${data.name || 'Unknown Creature'}\n`);
        md.appendMarkdown(`*${data.size || 'Medium'} ${data.type || 'humanoid'}${data.subtype ? ` (${data.subtype})` : ''}, ${data.alignment || 'neutral'}*\n\n`);
        md.appendMarkdown(`**AC** ${data.armorClass || 10} | **HP** ${data.hitPoints || 10} (${data.hitDice || '2d8'}) | **CR** ${data.challengeRating || '1/8'}\n\n`);

        // Display speed
        if (data.speed && Array.isArray(data.speed) && data.speed.length > 0) {
            const speedStr = data.speed.map((s: any) => `${s.name} ${s.description}`).join(', ');
            md.appendMarkdown(`**Speed**: ${speedStr}\n\n`);
        }

        // Display ability scores
        if (data.abilityScores) {
            const calcMod = (score: number) => {
                const mod = Math.floor((score - 10) / 2);
                return mod >= 0 ? `+${mod}` : `${mod}`;
            };
            md.appendMarkdown(`**STR** ${data.abilityScores.strength} (${calcMod(data.abilityScores.strength)}) | `);
            md.appendMarkdown(`**DEX** ${data.abilityScores.dexterity} (${calcMod(data.abilityScores.dexterity)}) | `);
            md.appendMarkdown(`**CON** ${data.abilityScores.constitution} (${calcMod(data.abilityScores.constitution)})\n`);
            md.appendMarkdown(`**INT** ${data.abilityScores.intelligence} (${calcMod(data.abilityScores.intelligence)}) | `);
            md.appendMarkdown(`**WIS** ${data.abilityScores.wisdom} (${calcMod(data.abilityScores.wisdom)}) | `);
            md.appendMarkdown(`**CHA** ${data.abilityScores.charisma} (${calcMod(data.abilityScores.charisma)})\n\n`);
        }

        // Display traits
        if (data.traits && data.traits.length > 0) {
            md.appendMarkdown(`**Traits**: `);
            md.appendMarkdown(data.traits.map((t: any) => t.name).join(', '));
        }
    }

    // Compendium reference handling: @spell[Name], @monster[Name], @item[Name]
    private checkCompendiumReference(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | null {
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
            const compendium = CompendiumService.getInstance();
            const markdown = new vscode.MarkdownString();
            markdown.supportHtml = true;

            if (type === 'spell') {
                const spell = compendium.getSpell(name);
                if (spell) {
                    this.formatSpellHover(markdown, spell);
                    return new vscode.Hover(markdown, range);
                } else {
                    return new vscode.Hover(`Spell not found: ${name}`, range);
                }
            } else if (type === 'monster') {
                const monster = compendium.getMonster(name);
                if (monster) {
                    this.formatMonsterHover(markdown, monster);
                    return new vscode.Hover(markdown, range);
                } else {
                    return new vscode.Hover(`Monster not found: ${name}`, range);
                }
            } else if (type === 'item') {
                const item = compendium.getItem(name);
                if (item) {
                    this.formatCompendiumItemHover(markdown, item);
                    return new vscode.Hover(markdown, range);
                } else {
                    return new vscode.Hover(`Item not found: ${name}`, range);
                }
            }
        } catch (e) {
            // CompendiumService not initialized yet
            return null;
        }

        return null;
    }

    private formatSpellHover(md: vscode.MarkdownString, spell: Spell) {
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

    private formatMonsterHover(md: vscode.MarkdownString, monster: Monster) {
        const sizeMap: { [key: string]: string } = {
            'T': 'Tiny', 'S': 'Small', 'M': 'Medium', 'L': 'Large', 'H': 'Huge', 'G': 'Gargantuan'
        };
        const size = sizeMap[monster.size] || monster.size;

        md.appendMarkdown(`### ${monster.name}\n`);
        md.appendMarkdown(`*${size} ${monster.type}, ${monster.alignment}*\n\n`);
        md.appendMarkdown(`**AC** ${monster.ac} | **HP** ${monster.hp} | **CR** ${monster.cr}\n\n`);
        md.appendMarkdown(`**Speed:** ${monster.speed}\n\n`);

        // Ability scores
        const calcMod = (score: number) => {
            const mod = Math.floor((score - 10) / 2);
            return mod >= 0 ? `+${mod}` : `${mod}`;
        };

        md.appendMarkdown(`| STR | DEX | CON | INT | WIS | CHA |\n`);
        md.appendMarkdown(`|:---:|:---:|:---:|:---:|:---:|:---:|\n`);
        md.appendMarkdown(`| ${monster.stats.str} (${calcMod(monster.stats.str)}) | ${monster.stats.dex} (${calcMod(monster.stats.dex)}) | ${monster.stats.con} (${calcMod(monster.stats.con)}) | ${monster.stats.int} (${calcMod(monster.stats.int)}) | ${monster.stats.wis} (${calcMod(monster.stats.wis)}) | ${monster.stats.cha} (${calcMod(monster.stats.cha)}) |\n`);
    }

    private formatCompendiumItemHover(md: vscode.MarkdownString, item: Item) {
        md.appendMarkdown(`### ${item.name}\n`);
        md.appendMarkdown(`*${item.type}${item.rarity ? `, ${item.rarity}` : ''}${item.attunement ? ' (requires attunement)' : ''}*\n\n`);

        // Truncate description for hover
        const desc = item.description.length > 500
            ? item.description.substring(0, 500) + '...'
            : item.description;
        md.appendMarkdown(`${desc}\n`);
    }
}
