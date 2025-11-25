import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getPreviewData } from '../utils/preview';

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
        // Get workspace folder for loading local images
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const localResourceRoots = [
            vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
        ];
        
        // Add workspace folder if available
        if (workspaceFolder) {
            localResourceRoots.push(workspaceFolder.uri);
        }
        
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: localResourceRoots
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        const updateWebview = () => {
            const content = document.getText();
            // Convert local image paths to webview URIs
            const convertedContent = this.convertImagePaths(content, document.uri, webviewPanel.webview);
            
            webviewPanel.webview.postMessage({
                type: 'update',
                text: convertedContent,
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
                    const data = await this.getPreviewData(document, e.path, webviewPanel.webview);
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



    private async getPreviewData(currentDoc: vscode.TextDocument, relativePath: string, webview: vscode.Webview): Promise<any> {
        return getPreviewData(currentDoc, relativePath, webview);
    }

    private convertImagePaths(markdown: string, documentUri: vscode.Uri, webview: vscode.Webview): string {
        // Convert markdown image syntax ![alt](path) to use webview URIs for local paths
        return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, imagePath) => {
            // Skip if it's already an http/https/data URI
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
                return match;
            }
            
            try {
                // Resolve relative path to absolute URI
                const imageUri = vscode.Uri.joinPath(documentUri, '..', imagePath);
                // Convert to webview URI
                const webviewUri = webview.asWebviewUri(imageUri);
                // Return the markdown with the converted URI
                return `![${alt}](${webviewUri.toString()})`;
            } catch (error) {
                console.error(`Error converting image path: ${imagePath}`, error);
                return match; // Return original if conversion fails
            }
        });
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

        // Generate a nonce for inline scripts
        const nonce = this.getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:;">
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

                <!-- Context Menu -->
                <div id="context-menu" class="context-menu">
                    <button id="ctx-add-link" class="context-menu-item">🔗 Add Link</button>
                    <button id="ctx-bold" class="context-menu-item"><b>B</b> Bold</button>
                    <button id="ctx-italic" class="context-menu-item"><i>I</i> Italic</button>
                </div>

                <!-- Link Input Dialog -->
                <div id="link-dialog" class="input-dialog">
                    <div class="input-dialog-content">
                        <h3 class="input-dialog-title">Insert Link</h3>
                        <div class="input-dialog-field">
                            <label for="link-text">Text:</label>
                            <input type="text" id="link-text" placeholder="Link text" />
                        </div>
                        <div class="input-dialog-field">
                            <label for="link-url">URL:</label>
                            <input type="text" id="link-url" placeholder="https://" />
                        </div>
                        <div class="input-dialog-buttons">
                            <button id="link-cancel" class="dnd-btn">Cancel</button>
                            <button id="link-insert" class="dnd-btn dnd-btn-primary">Insert</button>
                        </div>
                    </div>
                </div>

                <!-- Image Input Dialog -->
                <div id="image-dialog" class="input-dialog">
                    <div class="input-dialog-content">
                        <h3 class="input-dialog-title">Insert Image</h3>
                        <div class="input-dialog-field">
                            <label for="image-url">Image URL:</label>
                            <input type="text" id="image-url" placeholder="https://" />
                        </div>
                        <div class="input-dialog-field">
                            <label for="image-alt">Alt Text:</label>
                            <input type="text" id="image-alt" placeholder="Image description" />
                        </div>
                        <div class="input-dialog-buttons">
                            <button id="image-cancel" class="dnd-btn">Cancel</button>
                            <button id="image-insert" class="dnd-btn dnd-btn-primary">Insert</button>
                        </div>
                    </div>
                </div>

                <script nonce="${nonce}" src="${tiptapBundleUri}"></script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
                <script nonce="${nonce}">
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

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
