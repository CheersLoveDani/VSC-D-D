import * as vscode from 'vscode';
import * as path from 'path';

export class DndLinkProvider implements vscode.DocumentLinkProvider {

    public provideDocumentLinks(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentLink[]> {

        const links: vscode.DocumentLink[] = [];
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
                linkPath.endsWith('.dndnotes') ||
                linkPath.endsWith('.dndspell')) {

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
