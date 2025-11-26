"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemEditorProvider = void 0;
const vscode = require("vscode");
const baseEditor_1 = require("./baseEditor");
class ItemEditorProvider extends baseEditor_1.BaseCustomTextEditorProvider {
    static register(context) {
        const provider = new ItemEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(ItemEditorProvider.viewType, provider);
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
        const scriptUri = this.getMediaUri(webview, 'itemEditor.js');
        const styleUri = this.getMediaUri(webview, 'itemEditor.css');
        return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet" />
				<title>Item Database</title>
			</head>
			<body>
                <div class="container">
                    <div class="editor-pane">
                        <h2>Edit Item</h2>
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" id="name" placeholder="Item Name" />
                        </div>
                        <div class="form-group">
                            <label>Type</label>
                            <select id="type">
                                <option value="weapon">Weapon</option>
                                <option value="armor">Armor</option>
                                <option value="potion">Potion</option>
                                <option value="scroll">Scroll</option>
                                <option value="misc">Misc</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Value (gp)</label>
                            <input type="number" id="value" />
                        </div>
                        <div class="form-group">
                            <label>Weight (lb)</label>
                            <input type="number" id="weight" />
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="description" rows="5"></textarea>
                        </div>
                    </div>

                    <div class="preview-pane">
                        <h2>Preview</h2>
                        <div class="item-card">
                            <div class="card-header">
                                <span id="preview-name">Item Name</span>
                                <span id="preview-value">0 gp</span>
                            </div>
                            <div class="card-body">
                                <p id="preview-type" class="item-type">Misc</p>
                                <p id="preview-desc">Description...</p>
                            </div>
                            <div class="card-footer">
                                <span id="preview-weight">0 lb</span>
                            </div>
                        </div>
                    </div>
                </div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}
exports.ItemEditorProvider = ItemEditorProvider;
ItemEditorProvider.viewType = 'dnd.itemEditor';
//# sourceMappingURL=itemEditor.js.map