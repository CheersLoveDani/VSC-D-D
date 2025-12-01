import * as vscode from 'vscode';

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
                linkPath.endsWith('.dndspell') ||
                linkPath.endsWith('.dndshop')) {

                // Calculate the position of the link in the document
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);

                try {
                    // Use vscode.Uri.joinPath for browser compatibility
                    // This handles URL encoding automatically, including special characters
                    // like spaces (%20), ampersands (%26), hashes (%23), parentheses, brackets, unicode, etc.
                    // We must decode the path first because it comes from a markdown link which is already encoded.
                    const decodedPath = decodeURIComponent(linkPath);
                    const targetUri = vscode.Uri.joinPath(document.uri, '..', decodedPath);
                    
                    // Extract filename for tooltip (handle paths with special characters)
                    const pathParts = linkPath.split('/');
                    const filename = pathParts[pathParts.length - 1];

                    const docLink = new vscode.DocumentLink(range, targetUri);
                    docLink.tooltip = `Open ${filename}`;
                    links.push(docLink);
                } catch (error) {
                    // Log error but don't break link provider for other links
                    console.error('[DndLinkProvider] Error creating link for:', linkPath, error);
                }
            }
        }

        return links;
    }
}
