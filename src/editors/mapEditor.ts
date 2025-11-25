import * as vscode from 'vscode';
import * as path from 'path';

export class MapEditorProvider implements vscode.CustomTextEditorProvider {

    public static readonly viewType = 'dnd.mapEditor';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new MapEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(MapEditorProvider.viewType, provider);
        return providerRegistration;
    }

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    /**
     * Called when our custom editor is opened.
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Get workspace folder for loading local images
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const localResourceRoots = [
            vscode.Uri.joinPath(this.context.extensionUri, 'media')
        ];
        
        // Add workspace folder if available
        if (workspaceFolder) {
            localResourceRoots.push(workspaceFolder.uri);
        }
        
        // Also add document directory as fallback
        localResourceRoots.push(vscode.Uri.joinPath(document.uri, '..'));
        
        // Setup initial content for the webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: localResourceRoots
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
            } catch { }

            webviewPanel.webview.postMessage({
                type: 'update',
                text: text,
                resolvedImageUri: resolvedImageUri
            });
        };

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
        webviewPanel.webview.onDidReceiveMessage(async e => {
            switch (e.type) {
                case 'ready':
                    // Wait for webview to be ready before sending data
                    updateWebview();
                    return;
                case 'updateData':
                    this.updateDocument(document, e.data);
                    return;
                case 'selectImage':
                    this.selectImage(document);
                    return;
                case 'openFile':
                    this.openFile(document, e.path);
                    return;
                case 'getPreview':
                    const data = await this.getPreviewData(document, e.path);
                    webviewPanel.webview.postMessage({
                        type: 'previewData',
                        data: data,
                        x: e.x,
                        y: e.y
                    });
                    return;
            }
        });
    }

    /**
     * Get the static HTML used for the editor webviews.
     */
    private getHtmlForWebview(webview: vscode.Webview): string {
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
                    <canvas id="map-canvas"></canvas>
                </div>
                <!-- Toolbar is created by JS -->
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private updateDocument(document: vscode.TextDocument, data: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            JSON.stringify(data, null, 2)
        );
        vscode.workspace.applyEdit(edit);
    }

    private async selectImage(document: vscode.TextDocument) {
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
            } catch {
                // Ignore parse errors
            }
        }
    }

    private openFile(currentDoc: vscode.TextDocument, relativePath: string) {
        if (!relativePath) return;
        const targetUri = vscode.Uri.joinPath(currentDoc.uri, '..', relativePath);
        vscode.commands.executeCommand('vscode.open', targetUri);
    }

    private async getPreviewData(currentDoc: vscode.TextDocument, relativePath: string): Promise<any> {
        try {
            const targetUri = vscode.Uri.joinPath(currentDoc.uri, '..', relativePath);
            const content = await vscode.workspace.fs.readFile(targetUri);
            const json = JSON.parse(Buffer.from(content).toString('utf8'));

            if (relativePath.endsWith('.dnditem')) {
                return {
                    type: 'item',
                    name: json.name,
                    itemType: json.type,
                    value: json.value,
                    description: json.description
                };
            } else if (relativePath.endsWith('.dndchar')) {
                return {
                    type: 'character',
                    name: json.name,
                    class: json.class,
                    hp: `${json.hp?.current}/${json.hp?.max}`
                };
            } else if (relativePath.endsWith('.dndmap')) {
                return {
                    type: 'map',
                    pinCount: json.pins?.length || 0
                };
            }
        } catch (e) {
            console.error('Error fetching preview data', e);
            return null;
        }
    }
}
