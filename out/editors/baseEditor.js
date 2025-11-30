"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCustomTextEditorProvider = void 0;
const vscode = require("vscode");
/**
 * Base class for custom text editor providers.
 * Provides common registration logic, webview setup, and document update functionality.
 */
class BaseCustomTextEditorProvider {
    constructor(context) {
        this.context = context;
    }
    /**
     * Get a webview URI for a local resource in the media folder.
     * @param webview The webview to get the URI for
     * @param filename The filename in the media folder
     * @returns A webview URI
     */
    getMediaUri(webview, filename) {
        return webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', filename));
    }
    /**
     * Get a nonce for Content Security Policy.
     * @returns A random nonce string
     */
    getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    /**
     * Update the document with new JSON data.
     * @param document The document to update
     * @param data The data to serialize and write
     */
    updateDocumentJson(document, data) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(data, null, 2));
        return vscode.workspace.applyEdit(edit);
    }
    /**
     * Update the document with raw text content.
     * @param document The document to update
     * @param content The text content to write
     */
    updateDocumentText(document, content) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
        return vscode.workspace.applyEdit(edit);
    }
    /**
     * Setup common webview configuration and event handlers.
     * @param document The text document
     * @param webviewPanel The webview panel
     * @param options Configuration options
     * @returns Cleanup function to call on dispose
     */
    setupWebview(document, webviewPanel, options = {}) {
        const { enableScripts = true, localResourceRoots = [vscode.Uri.joinPath(this.context.extensionUri, 'media')], onMessage, getContent = () => document.getText() } = options;
        webviewPanel.webview.options = {
            enableScripts,
            localResourceRoots
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
        const updateWebview = () => {
            webviewPanel.webview.postMessage({
                type: 'update',
                text: getContent(),
            });
        };
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });
        if (onMessage) {
            webviewPanel.webview.onDidReceiveMessage((message) => {
                const msg = message;
                if (msg.type === 'ready') {
                    updateWebview();
                    return;
                }
                onMessage(message);
            });
        }
        else {
            webviewPanel.webview.onDidReceiveMessage((message) => {
                const msg = message;
                if (msg.type === 'ready') {
                    updateWebview();
                }
            });
        }
        return changeDocumentSubscription;
    }
    /**
     * Open a file relative to the current document.
     * @param currentDoc The current document
     * @param relativePath The relative path to the file to open
     */
    openFile(currentDoc, relativePath) {
        if (!relativePath) {
            return;
        }
        const targetUri = vscode.Uri.joinPath(currentDoc.uri, '..', relativePath);
        // Open in a new tab (preview: false ensures it doesn't replace the current preview tab)
        vscode.commands.executeCommand('vscode.open', targetUri, { preview: false });
    }
    /**
     * Open an external URL in the Simple Browser.
     * @param url The URL to open
     */
    openExternal(url) {
        if (!url) {
            return;
        }
        console.log('Opening external URL:', url);
        // Use Simple Browser to open within VS Code
        vscode.commands.executeCommand('simpleBrowser.show', url);
    }
}
exports.BaseCustomTextEditorProvider = BaseCustomTextEditorProvider;
//# sourceMappingURL=baseEditor.js.map