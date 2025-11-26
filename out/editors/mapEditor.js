"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapEditorProvider = void 0;
const vscode = require("vscode");
const path = require("path");
const baseEditor_1 = require("./baseEditor");
const preview_1 = require("../utils/preview");
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
            try {
                const json = JSON.parse(text);
                if (json.imagePath) {
                    const docDir = vscode.Uri.joinPath(document.uri, '..');
                    const imageUri = vscode.Uri.joinPath(docDir, json.imagePath);
                    resolvedImageUri = webviewPanel.webview.asWebviewUri(imageUri).toString();
                }
            }
            catch { /* ignore parse errors */ }
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
            const relativePath = './' + path.relative(docDir.fsPath, imageUri.fsPath).replace(/\\/g, '/');
            const text = document.getText();
            try {
                const json = JSON.parse(text);
                json.imagePath = relativePath;
                this.updateDocumentJson(document, json);
            }
            catch { /* ignore parse errors */ }
        }
    }
    openFile(currentDoc, relativePath) {
        if (!relativePath) {
            return;
        }
        const targetUri = vscode.Uri.joinPath(currentDoc.uri, '..', relativePath);
        vscode.commands.executeCommand('vscode.open', targetUri);
    }
}
exports.MapEditorProvider = MapEditorProvider;
MapEditorProvider.viewType = 'dnd.mapEditor';
//# sourceMappingURL=mapEditor.js.map