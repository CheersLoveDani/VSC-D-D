import * as vscode from 'vscode';
import { BaseCustomTextEditorProvider } from './baseEditor';

export class StatBlockEditorProvider extends BaseCustomTextEditorProvider {

    public static readonly viewType = 'dnd.statBlockEditor';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new StatBlockEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(StatBlockEditorProvider.viewType, provider);
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        const subscription = this.setupWebview(document, webviewPanel, {
            onMessage: (message) => {
                const msg = message as { type: string; data?: unknown };
                if (msg.type === 'updateData') {
                    this.updateDocumentJson(document, msg.data);
                }
            }
        });

        webviewPanel.onDidDispose(() => {
            subscription.dispose();
        });
    }

    protected getHtmlForWebview(webview: vscode.Webview): string {
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
