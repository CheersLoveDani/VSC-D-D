"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DndHoverProvider = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
class DndHoverProvider {
    provideHover(document, position, token) {
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
            const calcMod = (score) => {
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
            md.appendMarkdown(data.traits.map((t) => t.name).join(', '));
        }
    }
}
exports.DndHoverProvider = DndHoverProvider;
//# sourceMappingURL=hoverProvider.js.map