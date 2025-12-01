"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreviewData = getPreviewData;
const vscode = require("vscode");
/**
 * Safely parse JSON with error handling.
 * @param text The JSON string to parse
 * @param fallback Optional fallback value if parsing fails
 * @returns The parsed object or fallback/null on error
 */
function safeParseJSON(text, fallback) {
    try {
        return JSON.parse(text);
    }
    catch {
        return fallback ?? null;
    }
}
async function getPreviewData(currentDoc, relativePath, webview) {
    try {
        // vscode.Uri.joinPath handles URL encoding automatically, including special characters
        // like spaces (%20), ampersands (%26), hashes (%23), parentheses, brackets, unicode, etc.
        const targetUri = vscode.Uri.joinPath(currentDoc.uri, '..', relativePath);
        // Log for debugging path resolution with special characters
        console.log('[getPreviewData] Resolving preview for:', relativePath);
        console.log('[getPreviewData] Target URI:', targetUri.toString());
        const content = await vscode.workspace.fs.readFile(targetUri);
        if (relativePath.endsWith('.dndnotes')) {
            // Parse markdown to extract headers
            const markdown = new TextDecoder().decode(content);
            const headers = [];
            let title = 'Note';
            // Match all markdown headers (# to ######)
            const headerRegex = /^(#{1,6})\s+(.+)$/gm;
            let match;
            while ((match = headerRegex.exec(markdown)) !== null) {
                const level = match[1].length; // Number of # symbols
                const text = match[2].trim();
                // Use the first H1 as the title
                if (level === 1 && title === 'Note') {
                    title = text;
                }
                headers.push({ level, text });
                // Limit to 10 headers to keep preview concise
                if (headers.length >= 10) {
                    break;
                }
            }
            return {
                type: 'notes',
                title: title,
                headers: headers
            };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json = safeParseJSON(new TextDecoder().decode(content));
        if (!json) {
            return null;
        }
        if (relativePath.endsWith('.dnditem')) {
            return {
                type: 'item',
                name: json.name,
                itemType: json.type,
                subtype: json.subtype,
                rarity: json.rarity,
                weight: json.weight,
                value: json.value,
                attunement: json.attunement,
                attunementRequirement: json.attunementRequirement,
                properties: json.properties,
                damage: json.damage,
                armorClass: json.armorClass,
                description: json.description
            };
        }
        else if (relativePath.endsWith('.dndchar')) {
            return {
                type: 'character',
                name: json.name,
                race: json.race,
                class: json.class,
                level: json.level,
                background: json.background,
                alignment: json.alignment,
                stats: json.stats,
                ac: json.ac,
                speed: json.speed,
                hp: `${json.hp?.current}/${json.hp?.max}`
            };
        }
        else if (relativePath.endsWith('.dndmap')) {
            let imageSrc = '';
            if (json.imagePath) {
                try {
                    const mapDirUri = vscode.Uri.joinPath(targetUri, '..');
                    const imageUri = vscode.Uri.joinPath(mapDirUri, json.imagePath);
                    imageSrc = webview.asWebviewUri(imageUri).toString();
                }
                catch (e) {
                    console.error('Error resolving map image path', e);
                }
            }
            return {
                type: 'map',
                pinCount: json.pins?.length || 0,
                imageSrc: imageSrc
            };
        }
        else if (relativePath.endsWith('.dndstat')) {
            // Normalize speed
            let speed = json.speed;
            if (Array.isArray(speed)) {
                speed = speed.map((s) => `${s.name} ${s.description}`).join(', ');
            }
            else if (typeof speed === 'object' && speed !== null) {
                speed = Object.entries(speed)
                    .map(([k, v]) => `${k} ${v} ft.`)
                    .join(', ');
            }
            // Normalize stats
            let stats = json.stats;
            if (!stats && json.abilityScores) {
                stats = {
                    str: json.abilityScores.strength,
                    dex: json.abilityScores.dexterity,
                    con: json.abilityScores.constitution,
                    int: json.abilityScores.intelligence,
                    wis: json.abilityScores.wisdom,
                    cha: json.abilityScores.charisma
                };
            }
            return {
                type: 'stat', // Keep type as 'stat' for the frontend to distinguish if needed, or switch to 'monster' to match compendium?
                // User said "compendium preview doesnt match our linked files preview".
                // If I change this to 'monster', the frontend will use the 'monster' block in showPopover (if it exists).
                // But showPopover currently has 'stat'.
                // I will keep 'stat' but normalize the FIELDS to match what renderMonsterPreview will expect.
                name: json.name,
                size: json.size,
                monsterType: json.type, // Map type to monsterType
                alignment: json.alignment,
                ac: json.ac || json.armorClass, // Handle aliases
                hp: json.hitPoints || json.hp,
                speed: speed,
                stats: stats,
                cr: json.challengeRating || json.cr
            };
        }
        else if (relativePath.endsWith('.dndspell')) {
            return {
                type: 'spell',
                name: json.name,
                level: json.level,
                school: json.school,
                castingTime: json.castingTime,
                range: json.range,
                components: [
                    json.componentV ? 'V' : '',
                    json.componentS ? 'S' : '',
                    json.componentM ? 'M' : '',
                    json.materials ? `(${json.materials})` : ''
                ].filter(Boolean).join(', '),
                duration: json.duration,
                description: json.description,
                ritual: json.ritual,
                concentration: json.concentration
            };
        }
    }
    catch (e) {
        // Enhanced error logging for debugging issues with special characters in file paths
        console.error('[getPreviewData] Error fetching preview data for:', relativePath);
        console.error('[getPreviewData] Error details:', e);
        return null;
    }
}
//# sourceMappingURL=preview.js.map