"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotesEditorProvider = void 0;
const vscode = require("vscode");
const path = require("path");
class NotesEditorProvider {
    constructor(context) {
        this.context = context;
    }
    static register(context) {
        const provider = new NotesEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(NotesEditorProvider.viewType, provider);
        return providerRegistration;
    }
    async resolveCustomTextEditor(document, webviewPanel, _token) {
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
        webviewPanel.webview.onDidReceiveMessage(async (e) => {
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
            }
        });
    }
    updateDocument(document, content) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
        vscode.workspace.applyEdit(edit);
    }
    openFile(currentDoc, relativePath) {
        const targetUri = vscode.Uri.joinPath(currentDoc.uri, '..', relativePath);
        vscode.commands.executeCommand('vscode.open', targetUri);
    }
    async getPreviewData(currentDoc, relativePath) {
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
            }
            else if (relativePath.endsWith('.dndchar')) {
                return {
                    type: 'character',
                    name: json.name,
                    class: json.class,
                    hp: `${json.hp?.current}/${json.hp?.max}`
                };
            }
            else if (relativePath.endsWith('.dndmap')) {
                return {
                    type: 'map',
                    pinCount: json.pins?.length || 0
                };
            }
        }
        catch (e) {
            console.error('Error fetching preview data', e);
            return null;
        }
    }
    getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'notesEditor.js')));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'notesEditor.css')));
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
exports.NotesEditorProvider = NotesEditorProvider;
NotesEditorProvider.viewType = 'dnd.notesEditor';
//# sourceMappingURL=notesEditor.js.map