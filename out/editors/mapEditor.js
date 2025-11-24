"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapEditorProvider = void 0;
const vscode = require("vscode");
const path = require("path");
class MapEditorProvider {
    static register(context) {
        const provider = new MapEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(MapEditorProvider.viewType, provider);
        return providerRegistration;
    }
    constructor(context) {
        this.context = context;
    }
    /**
     * Called when our custom editor is opened.
     */
    async resolveCustomTextEditor(document, webviewPanel, _token) {
        // Setup initial content for the webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                vscode.Uri.joinPath(document.uri, '..')
            ]
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
        function updateWebview() {
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
            catch { }
            webviewPanel.webview.postMessage({
                type: 'update',
                text: text,
                resolvedImageUri: resolvedImageUri
            });
        }
        // Hook up event handlers so that when the document changes, the webview is updated
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });
        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
        // Receive message from the webview.
        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'update':
                    this.updateDocument(document, e.data);
                    return;
                case 'selectImage':
                    this.selectImage(document);
                    return;
                case 'openFile':
                    this.openFile(document, e.path);
                    return;
            }
        });
        updateWebview();
    }
    /**
     * Get the static HTML used for the editor webviews.
     */
    getHtmlForWebview(webview) {
        // Local path to script and css for the webview
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'mapEditor.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'mapEditor.css'));
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
                    <div id="map-content">
                        <img id="map-image" src="" alt="Map Image" />
                        <div id="pins-layer"></div>
                    </div>
                </div>
                <!-- Toolbar is created by JS -->
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
    updateDocument(document, data) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(data, null, 2));
        vscode.workspace.applyEdit(edit);
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
            // Calculate relative path
            const imageUri = uris[0];
            const docDir = vscode.Uri.joinPath(document.uri, '..');
            const relativePath = './' + path.relative(docDir.fsPath, imageUri.fsPath).replace(/\\/g, '/');
            // Update document
            const text = document.getText();
            try {
                const json = JSON.parse(text);
                json.imagePath = relativePath;
                this.updateDocument(document, json);
            }
            catch {
                // Ignore parse errors
            }
        }
    }
    openFile(currentDoc, relativePath) {
        if (!relativePath)
            return;
        const targetUri = vscode.Uri.joinPath(currentDoc.uri, '..', relativePath);
        vscode.commands.executeCommand('vscode.open', targetUri);
    }
}
exports.MapEditorProvider = MapEditorProvider;
MapEditorProvider.viewType = 'dnd.mapEditor';
//# sourceMappingURL=mapEditor.js.map