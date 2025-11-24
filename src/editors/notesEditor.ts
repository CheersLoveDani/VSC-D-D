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
                    this.updateDocument(document, e.text);
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
        const tiptapBundleUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this.context.extensionPath, 'media', 'tiptap-bundle.js')
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
                    <button id="raw-toggle-btn" class="dnd-btn" style="display: none;">Raw Markdown</button>
                </div>
                <div class="editor-toolbar">
                    <!-- Text Formatting -->
                    <div class="toolbar-group">
                        <button id="btn-bold" class="toolbar-btn" title="Bold (Ctrl+B)"><b>B</b></button>
                        <button id="btn-italic" class="toolbar-btn" title="Italic (Ctrl+I)"><i>I</i></button>
                        <button id="btn-strike" class="toolbar-btn" title="Strikethrough"><s>S</s></button>
                        <button id="btn-code" class="toolbar-btn" title="Inline Code">&lt;/&gt;</button>
                        <button id="btn-highlight" class="toolbar-btn" title="Highlight">H</button>
                    </div>
                    
                    <!-- Headings -->
                    <div class="toolbar-group">
                        <button id="btn-h1" class="toolbar-btn" title="Heading 1">H1</button>
                        <button id="btn-h2" class="toolbar-btn" title="Heading 2">H2</button>
                        <button id="btn-h3" class="toolbar-btn" title="Heading 3">H3</button>
                        <button id="btn-h4" class="toolbar-btn" title="Heading 4">H4</button>
                        <button id="btn-h5" class="toolbar-btn" title="Heading 5">H5</button>
                        <button id="btn-h6" class="toolbar-btn" title="Heading 6">H6</button>
                    </div>
                    
                    <!-- Lists -->
                    <div class="toolbar-group">
                        <button id="btn-bullet-list" class="toolbar-btn" title="Bullet List">• List</button>
                        <button id="btn-ordered-list" class="toolbar-btn" title="Numbered List">1. List</button>
                        <button id="btn-task-list" class="toolbar-btn" title="Task List">☑ Task</button>
                    </div>
                    
                    <!-- Block Elements -->
                    <div class="toolbar-group">
                        <button id="btn-blockquote" class="toolbar-btn" title="Blockquote">" Quote</button>
                        <button id="btn-code-block" class="toolbar-btn" title="Code Block">{ Code }</button>
                        <button id="btn-hr" class="toolbar-btn" title="Horizontal Rule">—</button>
                    </div>
                    
                    <!-- Links & Media -->
                    <div class="toolbar-group">
                        <button id="btn-link" class="toolbar-btn" title="Insert Link">🔗</button>
                        <button id="btn-image" class="toolbar-btn" title="Insert Image">🖼</button>
                    </div>
                    
                    <!-- Tables -->
                    <div class="toolbar-group">
                        <button id="btn-table" class="toolbar-btn" title="Insert Table">📊 Table</button>
                    </div>
                </div>
                <div class="content-area" id="app"></div>
                <div id="popover" class="popover"></div>
                <script src="${tiptapBundleUri}"></script>
                <script src="${scriptUri}"></script>
                <script>
                    // Show/hide raw toggle button based on edit mode
                    const toggleBtn = document.getElementById('toggle-mode-btn');
                    const rawToggleBtn = document.getElementById('raw-toggle-btn');
                    toggleBtn.addEventListener('click', () => {
                        const isEditMode = toggleBtn.textContent === 'View Note';
                        rawToggleBtn.style.display = isEditMode ? 'inline-block' : 'none';
                    });
                </script>
            </body>
            </html>`;
    }
}
