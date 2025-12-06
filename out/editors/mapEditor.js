"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapEditorProvider = void 0;
const vscode = require("vscode");
// Removed path import for web compatibility
const baseEditor_1 = require("./baseEditor");
const preview_1 = require("../utils/preview");
/**
 * Resolves a relative path against a base URI in a web-compatible way.
 * Handles ./ and ../ segments properly without requiring Node.js path module.
 * @param baseUri The base URI (e.g., document directory)
 * @param relativePath The relative path (e.g., "./image.png" or "../images/map.jpg")
 * @returns The resolved URI
 */
function resolveRelativeUri(baseUri, relativePath) {
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
        }
        else if (segment !== '.') {
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
function validateImagePath(imagePath) {
    if (!imagePath || imagePath.trim() === '') {
        return { valid: true, type: 'empty' };
    }
    // External HTTPS URLs - allowed with warning
    if (imagePath.startsWith('https://')) {
        return { valid: true, type: 'external', showWarning: true };
    }
    // HTTP URLs - not allowed (insecure)
    if (imagePath.startsWith('http://')) {
        return {
            valid: false,
            type: 'insecure',
            error: 'HTTP URLs are not supported for security reasons. Please use HTTPS or a local image file.'
        };
    }
    // Absolute Windows paths (C:\, D:\, etc.)
    if (/^[a-zA-Z]:[\\/]/.test(imagePath)) {
        return {
            valid: false,
            type: 'absolute',
            error: 'Absolute file paths are not portable. Please use a relative path like: ./images/map.png'
        };
    }
    // Absolute Unix paths
    if (imagePath.startsWith('/') && !imagePath.startsWith('./')) {
        return {
            valid: false,
            type: 'absolute',
            error: 'Absolute file paths are not portable. Please use a relative path like: ./images/map.png'
        };
    }
    return { valid: true, type: 'relative' };
}
class MapEditorProvider extends baseEditor_1.BaseCustomTextEditorProvider {
    static register(context) {
        const provider = new MapEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(MapEditorProvider.viewType, provider);
    }
    async resolveCustomTextEditor(document, webviewPanel, _token) {
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
            let imagePathType = '';
            let imagePathError = '';
            try {
                const json = JSON.parse(text);
                if (json.imagePath) {
                    const validation = validateImagePath(json.imagePath);
                    imagePathType = validation.type;
                    if (!validation.valid) {
                        imagePathError = validation.error || '';
                    }
                    else if (validation.type === 'external') {
                        // External HTTPS URL - use directly
                        resolvedImageUri = json.imagePath;
                    }
                    else if (validation.type === 'relative') {
                        // Relative path - resolve using existing logic
                        const docDir = vscode.Uri.joinPath(document.uri, '..');
                        const imageUri = resolveRelativeUri(docDir, json.imagePath);
                        resolvedImageUri = webviewPanel.webview.asWebviewUri(imageUri).toString();
                    }
                }
            }
            catch { /* ignore parse errors */ }
            webviewPanel.webview.postMessage({
                type: 'update',
                text: text,
                resolvedImageUri: resolvedImageUri,
                imagePathType: imagePathType,
                imagePathError: imagePathError
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
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            const msg = message;
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
                    const data = await (0, preview_1.getPreviewData)(document, msg.path ?? '', webviewPanel.webview);
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
    getHtmlForWebview(webview) {
        const scriptUri = this.getMediaUri(webview, 'mapEditor.js');
        const styleUri = this.getMediaUri(webview, 'mapEditor.css');
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline';">
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
    async selectImage(document) {
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
            // Check if image is within the workspace folder
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (workspaceFolder) {
                const workspacePath = workspaceFolder.uri.path.toLowerCase();
                const selectedPath = imageUri.path.toLowerCase();
                if (!selectedPath.startsWith(workspacePath)) {
                    vscode.window.showErrorMessage('Map images must be within the current project folder. ' +
                        'Please copy the image into your project and try again.', { modal: true });
                    return;
                }
            }
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
            }
            else {
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
                }
                else {
                    relativePath = './' + forwardPath;
                }
            }
            console.log('Calculated relative path:', relativePath);
            const text = document.getText().trim();
            let json;
            // Handle empty file or invalid JSON by creating default structure
            if (!text) {
                json = { imagePath: '', pins: [] };
            }
            else {
                try {
                    json = JSON.parse(text);
                }
                catch {
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
exports.MapEditorProvider = MapEditorProvider;
MapEditorProvider.viewType = 'dnd.mapEditor';
//# sourceMappingURL=mapEditor.js.map