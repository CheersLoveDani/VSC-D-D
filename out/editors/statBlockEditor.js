"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatBlockEditorProvider = void 0;
const vscode = require("vscode");
class StatBlockEditorProvider {
    static register(context) {
        const provider = new StatBlockEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(StatBlockEditorProvider.viewType, provider);
        return providerRegistration;
    }
    constructor(context) {
        this.context = context;
    }
    /**
     * Called when our custom editor is opened.
     */
    async resolveCustomTextEditor(document, webviewPanel, _token) {
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
        const updateWebview = () => {
            webviewPanel.webview.postMessage({
                type: 'update',
                text: document.getText(),
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
        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'ready':
                    // Wait for webview to be ready before sending data
                    updateWebview();
                    return;
                case 'updateData':
                    this.updateDocument(document, e.data);
                    return;
            }
        });
    }
    /**
     * Get the static HTML used for the editor webviews.
     */
    getHtmlForWebview(webview) {
        // Local path to script and css for the webview
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'statBlockEditor.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'statBlockEditor.css'));
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet" />
                <title>D&D Stat Block Editor</title>
            </head>
            <body>
                <div id="stat-block-container">
                    <div id="stat-block">
                        <!-- Content populated by JavaScript -->
                    </div>
                </div>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
    updateDocument(document, data) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(data, null, 2));
        vscode.workspace.applyEdit(edit);
    }
}
exports.StatBlockEditorProvider = StatBlockEditorProvider;
StatBlockEditorProvider.viewType = 'dnd.statBlockEditor';
//# sourceMappingURL=statBlockEditor.js.map