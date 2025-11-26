"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpellEditorProvider = void 0;
const vscode = require("vscode");
class SpellEditorProvider {
    static register(context) {
        const provider = new SpellEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(SpellEditorProvider.viewType, provider);
        return providerRegistration;
    }
    constructor(context) {
        this.context = context;
    }
    async resolveCustomTextEditor(document, webviewPanel, _token) {
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
        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'ready':
                    // Webview is ready, send initial data
                    updateWebview();
                    return;
                case 'updateData':
                    this.updateDocument(document, e.data);
                    return;
            }
        });
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });
        // Clean up subscriptions when webview is disposed
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }
    getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'spellEditor.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'spellEditor.css'));
        return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet" />
				<title>Spell Editor</title>
			</head>
			<body>
                <div class="container">
                    <div class="editor-pane">
                        <h2>Edit Spell</h2>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Name</label>
                                <input type="text" id="name" placeholder="Spell Name" />
                            </div>
                            <div class="form-group form-group-small">
                                <label>Level</label>
                                <select id="level">
                                    <option value="0">Cantrip</option>
                                    <option value="1">1st</option>
                                    <option value="2">2nd</option>
                                    <option value="3">3rd</option>
                                    <option value="4">4th</option>
                                    <option value="5">5th</option>
                                    <option value="6">6th</option>
                                    <option value="7">7th</option>
                                    <option value="8">8th</option>
                                    <option value="9">9th</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>School</label>
                                <select id="school">
                                    <option value="Abjuration">Abjuration</option>
                                    <option value="Conjuration">Conjuration</option>
                                    <option value="Divination">Divination</option>
                                    <option value="Enchantment">Enchantment</option>
                                    <option value="Evocation">Evocation</option>
                                    <option value="Illusion">Illusion</option>
                                    <option value="Necromancy">Necromancy</option>
                                    <option value="Transmutation">Transmutation</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Casting Time</label>
                                <input type="text" id="castingTime" placeholder="1 action" />
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Range</label>
                                <input type="text" id="range" placeholder="60 feet" />
                            </div>
                            <div class="form-group">
                                <label>Duration</label>
                                <input type="text" id="duration" placeholder="Instantaneous" />
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Components</label>
                            <div class="checkbox-row">
                                <label class="checkbox-label"><input type="checkbox" id="componentV" /> V</label>
                                <label class="checkbox-label"><input type="checkbox" id="componentS" /> S</label>
                                <label class="checkbox-label"><input type="checkbox" id="componentM" /> M</label>
                            </div>
                            <input type="text" id="materials" placeholder="Material components (if any)" />
                        </div>
                        <div class="form-row">
                            <div class="form-group form-group-small">
                                <label class="checkbox-label inline"><input type="checkbox" id="ritual" /> Ritual</label>
                            </div>
                            <div class="form-group form-group-small">
                                <label class="checkbox-label inline"><input type="checkbox" id="concentration" /> Concentration</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Classes</label>
                            <input type="text" id="classes" placeholder="Wizard, Sorcerer, Warlock" />
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="description" rows="6"></textarea>
                        </div>
                        <div class="form-group">
                            <label>At Higher Levels</label>
                            <textarea id="higherLevels" rows="3"></textarea>
                        </div>
                    </div>

                    <div class="preview-pane">
                        <h2>Preview</h2>
                        <div class="spell-card">
                            <div class="card-header">
                                <span id="preview-name">Spell Name</span>
                                <span id="preview-level" class="spell-level">Cantrip</span>
                            </div>
                            <div class="card-subheader">
                                <span id="preview-school">Evocation</span>
                                <span id="preview-tags"></span>
                            </div>
                            <div class="card-body">
                                <div class="spell-stats">
                                    <div class="stat-row">
                                        <span class="stat-label">Casting Time:</span>
                                        <span id="preview-castingTime">1 action</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-label">Range:</span>
                                        <span id="preview-range">Self</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-label">Components:</span>
                                        <span id="preview-components">V, S</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-label">Duration:</span>
                                        <span id="preview-duration">Instantaneous</span>
                                    </div>
                                </div>
                                <div class="spell-description">
                                    <p id="preview-desc">Spell description...</p>
                                </div>
                                <div id="preview-higher" class="spell-higher"></div>
                            </div>
                            <div class="card-footer">
                                <span id="preview-classes">Wizard</span>
                            </div>
                        </div>
                    </div>
                </div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
    }
    updateDocument(document, data) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), JSON.stringify(data, null, 2));
        vscode.workspace.applyEdit(edit);
    }
}
exports.SpellEditorProvider = SpellEditorProvider;
SpellEditorProvider.viewType = 'dnd.spellEditor';
//# sourceMappingURL=spellEditor.js.map