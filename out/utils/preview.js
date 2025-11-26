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
        const targetUri = vscode.Uri.joinPath(currentDoc.uri, '..', relativePath);
        const content = await vscode.workspace.fs.readFile(targetUri);
        if (relativePath.endsWith('.dndnotes')) {
            // Parse markdown to extract headers
            const markdown = Buffer.from(content).toString('utf8');
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
        const json = safeParseJSON(Buffer.from(content).toString('utf8'));
        if (!json) {
            return null;
        }
        if (relativePath.endsWith('.dnditem')) {
            return {
                type: 'item',
                name: json.name,
                itemType: json.type,
                value: json.value,
                description: json.description
            };
        }
        else if (relativePath.endsWith('.dndchar')) {
            return {
                type: 'character',
                name: json.name,
                class: json.class,
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
            return {
                type: 'stat',
                name: json.name,
                size: json.size,
                creatureType: json.type,
                cr: json.challengeRating,
                hp: json.hitPoints
            };
        }
    }
    catch (e) {
        console.error('Error fetching preview data', e);
        return null;
    }
}
//# sourceMappingURL=preview.js.map