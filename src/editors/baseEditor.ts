import * as vscode from 'vscode';

/**
 * Base class for custom text editor providers.
 * Provides common registration logic, webview setup, and document update functionality.
 */
export abstract class BaseCustomTextEditorProvider implements vscode.CustomTextEditorProvider {
    /**
     * The view type identifier for this editor.
     * Must be overridden by subclasses.
     */
    public static readonly viewType: string;

    constructor(protected readonly context: vscode.ExtensionContext) {}

    /**
     * Resolve a custom text editor for a given document.
     * Subclasses must implement this method.
     */
    abstract resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): void | Thenable<void>;

    /**
     * Get the HTML content for the webview.
     * Subclasses must implement this method.
     */
    protected abstract getHtmlForWebview(webview: vscode.Webview): string;

    /**
     * Get a webview URI for a local resource in the media folder.
     * @param webview The webview to get the URI for
     * @param filename The filename in the media folder
     * @returns A webview URI
     */
    protected getMediaUri(webview: vscode.Webview, filename: string): vscode.Uri {
        return webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', filename));
    }

    /**
     * Get a nonce for Content Security Policy.
     * @returns A random nonce string
     */
    protected getNonce(): string {
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
    protected updateDocumentJson(document: vscode.TextDocument, data: unknown): Thenable<boolean> {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            JSON.stringify(data, null, 2)
        );
        return vscode.workspace.applyEdit(edit);
    }

    /**
     * Update the document with raw text content.
     * @param document The document to update
     * @param content The text content to write
     */
    protected updateDocumentText(document: vscode.TextDocument, content: string): Thenable<boolean> {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            content
        );
        return vscode.workspace.applyEdit(edit);
    }

    /**
     * Setup common webview configuration and event handlers.
     * @param document The text document
     * @param webviewPanel The webview panel
     * @param options Configuration options
     * @returns Cleanup function to call on dispose
     */
    protected setupWebview(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        options: {
            enableScripts?: boolean;
            localResourceRoots?: vscode.Uri[];
            onMessage?: (message: unknown) => void;
            getContent?: () => string;
        } = {}
    ): vscode.Disposable {
        const {
            enableScripts = true,
            localResourceRoots = [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
            onMessage,
            getContent = () => document.getText()
        } = options;

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
            webviewPanel.webview.onDidReceiveMessage((message: unknown) => {
                const msg = message as { type: string };
                if (msg.type === 'ready') {
                    updateWebview();
                    return;
                }
                onMessage(message);
            });
        } else {
            webviewPanel.webview.onDidReceiveMessage((message: unknown) => {
                const msg = message as { type: string };
                if (msg.type === 'ready') {
                    updateWebview();
                }
            });
        }

        return changeDocumentSubscription;
    }
}
