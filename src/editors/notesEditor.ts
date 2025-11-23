import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class NotesEditorProvider implements vscode.CustomTextEditorProvider {

    public static readonly viewType = 'dnd.notesEditor';

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new NotesEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(NotesEditorProvider.viewType, provider);
        return providerRegistration;
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
            ]
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        function updateWebview() {
            webviewPanel.webview.postMessage({
                type: 'update',
                text: document.getText(),
            });
        }

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(async e => {
            switch (e.type) {
                case 'ready':
                    updateWebview();
                    return;
                
                case 'updateData':
                    this.updateDocument(document, e.data);
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

                case 'editInPlainText':
                    vscode.commands.executeCommand('workbench.action.toggleEditorType');
                    return;
            }
        });
    }

    private updateDocument(document: vscode.TextDocument, content: string) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            content
        );
        vscode.workspace.applyEdit(edit);
    }

    private openFile(currentDoc: vscode.TextDocument, relativePath: string) {
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

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this.context.extensionPath, 'media', 'notesEditor.js')
        ));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this.context.extensionPath, 'media', 'notesEditor.css')
        ));

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet" />
                <title>D&D Notes</title>
            </head>
            <body>
                <div class="toolbar">
                    <button id="toggle-mode-btn" class="dnd-btn">Edit Note</button>
                </div>
                <div class="content-area" id="app"></div>
                <div id="popover" class="popover"></div>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
