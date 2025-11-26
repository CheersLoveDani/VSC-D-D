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
				<title>Item Editor</title>
			</head>
			<body>
                <div class="container">
                    <div class="editor-pane">
                        <h2>Edit Item</h2>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Name</label>
                                <input type="text" id="name" placeholder="Item Name" />
                            </div>
                            <div class="form-group form-group-small">
                                <label>Rarity</label>
                                <select id="rarity">
                                    <option value="Common">Common</option>
                                    <option value="Uncommon">Uncommon</option>
                                    <option value="Rare">Rare</option>
                                    <option value="Very Rare">Very Rare</option>
                                    <option value="Legendary">Legendary</option>
                                    <option value="Artifact">Artifact</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Type</label>
                                <select id="type">
                                    <option value="Weapon">Weapon</option>
                                    <option value="Armor">Armor</option>
                                    <option value="Adventuring Gear">Adventuring Gear</option>
                                    <option value="Tool">Tool</option>
                                    <option value="Wondrous Item">Wondrous Item</option>
                                    <option value="Potion">Potion</option>
                                    <option value="Ring">Ring</option>
                                    <option value="Rod">Rod</option>
                                    <option value="Scroll">Scroll</option>
                                    <option value="Staff">Staff</option>
                                    <option value="Wand">Wand</option>
                                    <option value="Ammunition">Ammunition</option>
                                    <option value="Mount/Vehicle">Mount/Vehicle</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Subtype</label>
                                <input type="text" id="subtype" placeholder="e.g., Martial Melee Weapon" />
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group form-group-small">
                                <label>Value</label>
                                <input type="text" id="value" placeholder="50 gp" />
                            </div>
                            <div class="form-group form-group-small">
                                <label>Weight (lb)</label>
                                <input type="number" id="weight" step="0.1" />
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Item Properties</label>
                            <div class="checkbox-row">
                                <label class="checkbox-label"><input type="checkbox" id="magic" /> Magic Item</label>
                                <label class="checkbox-label"><input type="checkbox" id="attunement" /> Requires Attunement</label>
                            </div>
                            <input type="text" id="attunementRequirement" placeholder="Attunement requirement (e.g., by a spellcaster)" />
                        </div>
                        <div class="form-group">
                            <label>Properties</label>
                            <input type="text" id="properties" placeholder="Versatile, Light, Finesse, etc." />
                        </div>

                        <div class="form-section" id="weapon-section">
                            <h3>Weapon Stats</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Damage Dice</label>
                                    <input type="text" id="damageDice" placeholder="1d8" />
                                </div>
                                <div class="form-group">
                                    <label>Damage Type</label>
                                    <select id="damageType">
                                        <option value="">None</option>
                                        <option value="slashing">Slashing</option>
                                        <option value="piercing">Piercing</option>
                                        <option value="bludgeoning">Bludgeoning</option>
                                        <option value="fire">Fire</option>
                                        <option value="cold">Cold</option>
                                        <option value="lightning">Lightning</option>
                                        <option value="thunder">Thunder</option>
                                        <option value="poison">Poison</option>
                                        <option value="acid">Acid</option>
                                        <option value="necrotic">Necrotic</option>
                                        <option value="radiant">Radiant</option>
                                        <option value="force">Force</option>
                                        <option value="psychic">Psychic</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Two-Handed Damage</label>
                                    <input type="text" id="twoHandedDamage" placeholder="1d10 (if versatile)" />
                                </div>
                                <div class="form-group">
                                    <label>Range</label>
                                    <input type="text" id="range" placeholder="20/60 (for thrown/ranged)" />
                                </div>
                            </div>
                        </div>

                        <div class="form-section" id="armor-section">
                            <h3>Armor Stats</h3>
                            <div class="form-row">
                                <div class="form-group form-group-small">
                                    <label>Base AC</label>
                                    <input type="number" id="armorClassBase" />
                                </div>
                                <div class="form-group form-group-small">
                                    <label class="checkbox-label inline"><input type="checkbox" id="armorClassDexBonus" /> + Dex Bonus</label>
                                </div>
                                <div class="form-group form-group-small">
                                    <label>Max Dex Bonus</label>
                                    <input type="number" id="armorClassMaxBonus" placeholder="e.g., 2" />
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group form-group-small">
                                    <label>Strength Req.</label>
                                    <input type="number" id="strengthRequirement" placeholder="e.g., 13" />
                                </div>
                                <div class="form-group form-group-small">
                                    <label class="checkbox-label inline"><input type="checkbox" id="stealthDisadvantage" /> Stealth Disadvantage</label>
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="description" rows="8"></textarea>
                        </div>
                    </div>

                    <div class="preview-pane">
                        <h2>Preview</h2>
                        <div class="item-card">
                            <div class="card-header">
                                <span id="preview-name">Item Name</span>
                                <span id="preview-rarity" class="item-rarity">Common</span>
                            </div>
                            <div class="card-subheader">
                                <span id="preview-type">Weapon</span>
                                <span id="preview-tags"></span>
                            </div>
                            <div class="card-body">
                                <div class="item-stats" id="preview-stats">
                                    <!-- Stats populated by JS -->
                                </div>
                                <div class="item-description">
                                    <p id="preview-desc">Item description...</p>
                                </div>
                            </div>
                            <div class="card-footer">
                                <span id="preview-value">0 gp</span>
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