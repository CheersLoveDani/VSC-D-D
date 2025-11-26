"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatBlockEditorProvider = void 0;
const vscode = require("vscode");
const baseEditor_1 = require("./baseEditor");
class StatBlockEditorProvider extends baseEditor_1.BaseCustomTextEditorProvider {
    static register(context) {
        const provider = new StatBlockEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(StatBlockEditorProvider.viewType, provider);
    }
    async resolveCustomTextEditor(document, webviewPanel, _token) {
        const subscription = this.setupWebview(document, webviewPanel, {
            onMessage: (message) => {
                const msg = message;
                if (msg.type === 'updateData') {
                    this.updateDocumentJson(document, msg.data);
                }
            }
        });
        webviewPanel.onDidDispose(() => {
            subscription.dispose();
        });
    }
    getHtmlForWebview(webview) {
        const scriptUri = this.getMediaUri(webview, 'statBlockEditor.js');
        const styleUri = this.getMediaUri(webview, 'statBlockEditor.css');
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
}
exports.StatBlockEditorProvider = StatBlockEditorProvider;
StatBlockEditorProvider.viewType = 'dnd.statBlockEditor';
//# sourceMappingURL=statBlockEditor.js.map