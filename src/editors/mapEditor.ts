import * as vscode from 'vscode';
// Removed path import for web compatibility
import { BaseCustomTextEditorProvider } from './baseEditor';
import { getPreviewData } from '../utils/preview';

/**
 * Resolves a relative path against a base URI in a web-compatible way.
 * Handles ./ and ../ segments properly without requiring Node.js path module.
 * @param baseUri The base URI (e.g., document directory)
 * @param relativePath The relative path (e.g., "./image.png" or "../images/map.jpg")
 * @returns The resolved URI
 */
function resolveRelativeUri(baseUri: vscode.Uri, relativePath: string): vscode.Uri {
    // Normalize the relative path by removing leading ./
    let normalized = relativePath;
    if (normalized.startsWith('./')) {
        normalized = normalized.substring(2);
    }

    // Split the base path and relative path into segments
    const basePath = baseUri.path;
    const baseSegments = basePath.split('/').filter(s => s.length > 0);
    const relativeSegments = normalized.split('/').filter(s => s.length > 0);

    // Process each segment of the relative path
    for (const segment of relativeSegments) {
        if (segment === '..') {
            // Go up one directory
            if (baseSegments.length > 0) {
                baseSegments.pop();
            }
        } else if (segment !== '.') {
            // Add the segment
            baseSegments.push(segment);
        }
        // Skip '.' as it means current directory
    }

    // Reconstruct the path
    const resolvedPath = '/' + baseSegments.join('/');

    // Create a new URI with the resolved path
    return baseUri.with({ path: resolvedPath });
}

export class MapEditorProvider extends BaseCustomTextEditorProvider {

    public static readonly viewType = 'dnd.mapEditor';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new MapEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(MapEditorProvider.viewType, provider);
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const localResourceRoots = [
            vscode.Uri.joinPath(this.context.extensionUri, 'media')
        ];

        if (workspaceFolder) {
            localResourceRoots.push(workspaceFolder.uri);
        }
        localResourceRoots.push(vscode.Uri.joinPath(document.uri, '..'));

        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        const updateWebview = () => {
            const text = document.getText();
            let resolvedImageUri = '';
            try {
                const json = JSON.parse(text);
                if (json.imagePath) {
                    const docDir = vscode.Uri.joinPath(document.uri, '..');
                    const imageUri = resolveRelativeUri(docDir, json.imagePath);
                    resolvedImageUri = webviewPanel.webview.asWebviewUri(imageUri).toString();
                }
            } catch { /* ignore parse errors */ }

            webviewPanel.webview.postMessage({
                type: 'update',
                text: text,
                resolvedImageUri: resolvedImageUri
            });
        };

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(async (message: unknown) => {
            const msg = message as { type: string; data?: unknown; path?: string; x?: number; y?: number; url?: string };
            switch (msg.type) {
                case 'ready':
                    updateWebview();
                    return;
                case 'updateData':
                    this.updateDocumentJson(document, msg.data);
                    return;
                case 'selectImage':
                    this.selectImage(document);
                    return;
                case 'openFile':
                    this.openFile(document, msg.path ?? '');
                    return;
                case 'openExternal':
                    this.openExternal(msg.url ?? '');
                    return;
                case 'getPreview':
                    const data = await getPreviewData(document, msg.path ?? '', webviewPanel.webview);
                    webviewPanel.webview.postMessage({
                        type: 'previewData',
                        data: data,
                        x: msg.x,
                        y: msg.y
                    });
                    return;
            }
        });
    }

    protected getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = this.getMediaUri(webview, 'mapEditor.js');
        const styleUri = this.getMediaUri(webview, 'mapEditor.css');

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet" />
                <title>D&D Map Editor</title>
            </head>
            <body>
                <div id="map-container">
                    <canvas id="map-canvas"></canvas>
                </div>
                <!-- Toolbar is created by JS -->
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private async selectImage(document: vscode.TextDocument): Promise<void> {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select Map Image',
            filters: {
                'Images': ['png', 'jpg', 'jpeg', 'gif', 'webp']
            }
        });

        if (uris && uris[0]) {
            const imageUri = uris[0];
            const docDir = vscode.Uri.joinPath(document.uri, '..');
            
            console.log('Selected image:', imageUri.toString());
            console.log('Document directory:', docDir.toString());
            
            // Calculate relative path manually for web compatibility
            // VS Code URIs always use forward slashes in the path property, even on Windows
            // Normalize to lowercase for case-insensitive comparison (Windows drive letters can vary)
            const docPath = docDir.path.toLowerCase();
            const imagePath = imageUri.path.toLowerCase();
            
            console.log('Doc path (normalized):', docPath);
            console.log('Image path (normalized):', imagePath);
            
            let relativePath = '';
            
            // Check if image is in the same directory or a subdirectory
            if (imagePath.startsWith(docPath)) {
                // Remove the document directory path and add ./
                relativePath = imagePath.substring(docPath.length);
                // Remove leading slash if present
                if (relativePath.startsWith('/')) {
                    relativePath = relativePath.substring(1);
                }
                relativePath = './' + relativePath;
            } else {
                // Calculate relative path using common ancestor
                const docDirParts = docPath.split('/').filter(p => p.length > 0);
                const imageParts = imagePath.split('/').filter(p => p.length > 0);
                
                // Find common prefix
                let i = 0;
                while (i < docDirParts.length && i < imageParts.length && docDirParts[i] === imageParts[i]) {
                    i++;
                }
                
                // Calculate how many directories to go back
                const backSteps = docDirParts.length - i;
                // Get the forward path from common ancestor to image
                const forwardPath = imageParts.slice(i).join('/');
                
                if (backSteps > 0) {
                    relativePath = '../'.repeat(backSteps) + forwardPath;
                } else {
                    relativePath = './' + forwardPath;
                }
            }
            
            console.log('Calculated relative path:', relativePath);

            const text = document.getText().trim();
            let json: { imagePath?: string; pins?: unknown[] };

            // Handle empty file or invalid JSON by creating default structure
            if (!text) {
                json = { imagePath: '', pins: [] };
            } else {
                try {
                    json = JSON.parse(text);
                } catch {
                    // If JSON is invalid, create fresh structure
                    json = { imagePath: '', pins: [] };
                }
            }

            json.imagePath = relativePath;
            await this.updateDocumentJson(document, json);
            console.log('Successfully updated map image path');
        }
    }

}
