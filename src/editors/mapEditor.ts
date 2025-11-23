import * as vscode from 'vscode';

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
		// Setup initial content for the webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};

		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

		function updateWebview() {
			webviewPanel.webview.postMessage({
				type: 'update',
				text: document.getText(),
			});
		}

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
				case 'addPin':
                    // TODO: Implement adding pin logic (modifying the document)
                    this.addPin(document, e.x, e.y);
					return;
                case 'ready':
                    updateWebview();
                    return;
			}
		});

		updateWebview();
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
                    <div id="map-content">
                        <img id="map-image" src="" alt="Map Image" />
                        <div id="pins-layer"></div>
                    </div>
				</div>
                <div id="controls">
                    <button id="add-pin-btn">Add Pin Mode</button>
                </div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
	}

    private addPin(document: vscode.TextDocument, x: number, y: number) {
        const json = this.getDocumentAsJson(document);
        if (!json.pins) {
            json.pins = [];
        }
        json.pins.push({ x, y, label: "New Pin", link: "" });
        
        return this.updateTextDocument(document, json);
    }

    private getDocumentAsJson(document: vscode.TextDocument): any {
        const text = document.getText();
        if (text.trim().length === 0) {
            return {};
        }
        try {
            return JSON.parse(text);
        } catch {
            throw new Error('Could not get document as json. Content is not valid json');
        }
    }

    private updateTextDocument(document: vscode.TextDocument, json: any) {
        const edit = new vscode.WorkspaceEdit();
        // Just replace the entire document for now
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            JSON.stringify(json, null, 2)
        );
        return vscode.workspace.applyEdit(edit);
    }
}
