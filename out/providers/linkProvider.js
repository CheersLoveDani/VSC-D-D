"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DndLinkProvider = void 0;
const vscode = require("vscode");
const path = require("path");
class DndLinkProvider {
    provideDocumentLinks(document, token) {
        const links = [];
        const text = document.getText();
        // Match markdown links: [text](path)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        while ((match = linkRegex.exec(text)) !== null) {
            const linkPath = match[2];
            // Only handle our custom file types
            if (linkPath.endsWith('.dnditem') ||
                linkPath.endsWith('.dndchar') ||
                linkPath.endsWith('.dndmap') ||
                linkPath.endsWith('.dndstat') ||
                linkPath.endsWith('.dndnotes')) {
                // Calculate the position of the link in the document
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                // Resolve the absolute path
                const currentDir = path.dirname(document.uri.fsPath);
                const absPath = path.resolve(currentDir, linkPath);
                const targetUri = vscode.Uri.file(absPath);
                const docLink = new vscode.DocumentLink(range, targetUri);
                docLink.tooltip = `Open ${path.basename(linkPath)}`;
                links.push(docLink);
            }
        }
        return links;
    }
}
exports.DndLinkProvider = DndLinkProvider;
//# sourceMappingURL=linkProvider.js.map