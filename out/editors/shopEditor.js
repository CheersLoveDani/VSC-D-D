"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopEditorProvider = void 0;
const vscode = require("vscode");
const baseEditor_1 = require("./baseEditor");
const compendiumService_1 = require("../services/compendiumService");
const tempFileService_1 = require("../services/tempFileService");
const filePaths_1 = require("../utils/filePaths");
class ShopEditorProvider extends baseEditor_1.BaseCustomTextEditorProvider {
    static register(context) {
        const provider = new ShopEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(ShopEditorProvider.viewType, provider);
    }
    async resolveCustomTextEditor(document, webviewPanel, _token) {
        const subscription = this.setupWebview(document, webviewPanel, {
            onMessage: async (message) => {
                const msg = message;
                switch (msg.type) {
                    case 'updateData':
                        this.updateDocumentJson(document, msg.data);
                        return;
                    case 'openFile':
                        if (msg.path) {
                            this.openFile(document, msg.path);
                        }
                        return;
                    // Item search and lookup
                    case 'searchItems':
                        this.handleItemSearch(webviewPanel, msg.query ?? '', msg.requestId ?? '');
                        return;
                    case 'getItemInfo':
                        this.handleGetItemInfo(webviewPanel, msg.name ?? '', msg.requestId ?? '');
                        return;
                    case 'openItem':
                        await this.handleOpenItem(msg.name ?? '', document);
                        return;
                    // Spell search and lookup
                    case 'searchSpells':
                        this.handleSpellSearch(webviewPanel, msg.query ?? '', msg.requestId ?? '');
                        return;
                    case 'getSpellInfo':
                        this.handleGetSpellInfo(webviewPanel, msg.name ?? '', msg.requestId ?? '');
                        return;
                    case 'openSpell':
                        await this.handleOpenSpell(msg.name ?? '', msg.level ?? 0, document);
                        return;
                }
            }
        });
        webviewPanel.onDidDispose(() => {
            subscription.dispose();
        });
    }
    handleItemSearch(webviewPanel, query, requestId) {
        const compendium = compendiumService_1.CompendiumService.getInstance();
        const results = compendium.searchItems(query, 10);
        webviewPanel.webview.postMessage({
            type: 'itemSearchResults',
            requestId: requestId,
            results: results.map(i => ({
                name: i.name,
                type: i.type,
                subtype: i.subtype,
                rarity: i.rarity,
                value: i.value,
                isCustom: i.source === 'Custom' || compendium.isCustomItem(i.name)
            }))
        });
    }
    handleGetItemInfo(webviewPanel, name, requestId) {
        const compendium = compendiumService_1.CompendiumService.getInstance();
        const info = compendium.getItemInfo(name);
        webviewPanel.webview.postMessage({
            type: 'itemInfo',
            requestId: requestId,
            name: name,
            found: !!info,
            info: info ? { ...info, isCustom: info.isCustom } : null
        });
    }
    async handleOpenItem(name, currentDoc) {
        if (!name.trim()) {
            return;
        }
        const compendium = compendiumService_1.CompendiumService.getInstance();
        const sanitizedName = name.replace(/[<>:"/\\|?*]/g, '_');
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(currentDoc.uri);
        const baseUri = workspaceFolder ? workspaceFolder.uri : vscode.Uri.joinPath(currentDoc.uri, '..');
        // Check if file already exists
        const existingFile = await (0, filePaths_1.findExistingCustomFile)(baseUri, sanitizedName, '.dnditem');
        if (existingFile) {
            await vscode.commands.executeCommand('vscode.open', existingFile);
            return;
        }
        // File doesn't exist - create from compendium or blank
        try {
            const item = compendium.getItem(name);
            let fileContent;
            if (item) {
                fileContent = {
                    name: item.name,
                    type: item.type,
                    subtype: item.subtype || '',
                    rarity: item.rarity,
                    magic: item.magic,
                    attunement: item.attunement,
                    attunementRequirement: item.attunementRequirement || '',
                    weight: item.weight,
                    value: item.value,
                    damage: item.damage,
                    armorClass: item.armorClass,
                    stealthDisadvantage: item.stealthDisadvantage || false,
                    strengthRequirement: item.strengthRequirement,
                    properties: item.properties,
                    range: item.range,
                    description: item.description
                };
            }
            else {
                fileContent = {
                    name: name,
                    type: 'Adventuring Gear',
                    subtype: '',
                    rarity: 'Common',
                    magic: false,
                    attunement: false,
                    attunementRequirement: '',
                    weight: 0,
                    value: '',
                    properties: [],
                    description: ''
                };
            }
            const content = JSON.stringify(fileContent, null, 2);
            const tempFileService = tempFileService_1.TempFileService.getInstance();
            await tempFileService.openTempFile(sanitizedName, '.dnditem', content);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open item: ${error}`);
        }
    }
    handleSpellSearch(webviewPanel, query, requestId) {
        const compendium = compendiumService_1.CompendiumService.getInstance();
        const results = compendium.searchSpells(query, 10);
        webviewPanel.webview.postMessage({
            type: 'spellSearchResults',
            requestId: requestId,
            results: results.map(s => ({
                name: s.name,
                level: s.level,
                school: s.school,
                compact: compendium.formatSpellCompact(s),
                isCustom: s.source === 'Custom'
            }))
        });
    }
    handleGetSpellInfo(webviewPanel, name, requestId) {
        const compendium = compendiumService_1.CompendiumService.getInstance();
        const info = compendium.getSpellInfo(name);
        webviewPanel.webview.postMessage({
            type: 'spellInfo',
            requestId: requestId,
            name: name,
            found: !!info,
            info: info
        });
    }
    async handleOpenSpell(name, level, currentDoc) {
        if (!name.trim()) {
            return;
        }
        const compendium = compendiumService_1.CompendiumService.getInstance();
        const sanitizedName = name.replace(/[<>:"/\\|?*]/g, '_');
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(currentDoc.uri);
        const baseUri = workspaceFolder ? workspaceFolder.uri : vscode.Uri.joinPath(currentDoc.uri, '..');
        // Check if file already exists
        const existingFile = await (0, filePaths_1.findExistingCustomFile)(baseUri, sanitizedName, '.dndspell');
        if (existingFile) {
            await vscode.commands.executeCommand('vscode.open', existingFile);
            return;
        }
        // File doesn't exist - create from compendium or blank
        try {
            const spell = compendium.getSpell(name);
            let fileContent;
            if (spell) {
                const components = [];
                if (spell.components?.includes('V')) {
                    components.push('V');
                }
                if (spell.components?.includes('S')) {
                    components.push('S');
                }
                if (spell.components?.includes('M')) {
                    components.push('M');
                }
                const matMatch = spell.components?.match(/M\s*\(([^)]+)\)/);
                const materials = matMatch ? matMatch[1] : '';
                fileContent = {
                    name: spell.name,
                    level: spell.level,
                    school: spell.school,
                    castingTime: spell.castingTime,
                    range: spell.range,
                    duration: spell.duration,
                    componentV: components.includes('V'),
                    componentS: components.includes('S'),
                    componentM: components.includes('M'),
                    materials: materials,
                    ritual: spell.ritual || false,
                    concentration: spell.concentration || false,
                    classes: spell.classes?.join(', ') || '',
                    description: spell.description || '',
                    higherLevels: spell.higherLevels || ''
                };
            }
            else {
                fileContent = {
                    name: name,
                    level: level,
                    school: '',
                    castingTime: '1 action',
                    range: '',
                    duration: '',
                    componentV: false,
                    componentS: false,
                    componentM: false,
                    materials: '',
                    ritual: false,
                    concentration: false,
                    classes: '',
                    description: '',
                    higherLevels: ''
                };
            }
            const content = JSON.stringify(fileContent, null, 2);
            const tempFileService = tempFileService_1.TempFileService.getInstance();
            await tempFileService.openTempFile(sanitizedName, '.dndspell', content);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open spell: ${error}`);
        }
    }
    getHtmlForWebview(webview) {
        const scriptUri = this.getMediaUri(webview, 'shopEditor.js');
        const styleUri = this.getMediaUri(webview, 'shopEditor.css');
        return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet" />
				<title>Shop Editor</title>
			</head>
			<body>
                <div class="container">
                    <div class="editor-pane">
                        <h2>Edit Shop</h2>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Shop Name</label>
                                <input type="text" id="name" placeholder="The Rusty Anvil" />
                            </div>
                            <div class="form-group form-group-small">
                                <label>Type</label>
                                <select id="type">
                                    <option value="General Store">General Store</option>
                                    <option value="Blacksmith">Blacksmith</option>
                                    <option value="Magic Shop">Magic Shop</option>
                                    <option value="Alchemist">Alchemist</option>
                                    <option value="Armorer">Armorer</option>
                                    <option value="Weaponsmith">Weaponsmith</option>
                                    <option value="Tavern">Tavern</option>
                                    <option value="Inn">Inn</option>
                                    <option value="Temple">Temple</option>
                                    <option value="Library">Library</option>
                                    <option value="Jeweler">Jeweler</option>
                                    <option value="Fletcher">Fletcher</option>
                                    <option value="Stable">Stable</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Owner/Proprietor</label>
                                <input type="text" id="owner" placeholder="Grimjaw Ironforge" />
                            </div>
                            <div class="form-group">
                                <label>Location</label>
                                <input type="text" id="location" placeholder="Market District, Waterdeep" />
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="description" rows="4" placeholder="A cozy smithy with the constant ring of hammer on steel..."></textarea>
                        </div>

                        <div class="form-section">
                            <h3>Inventory</h3>
                            <p class="section-hint">Search items from the compendium or type custom item names. Ctrl+Click to open item files.</p>
                            <div id="inventory-list">
                                <!-- Inventory items populated by JS -->
                            </div>
                            <button type="button" id="add-item-btn" class="btn btn-secondary">+ Add Item</button>
                        </div>

                        <div class="form-section">
                            <h3>Spellbooks & Scrolls</h3>
                            <div class="checkbox-row">
                                <label class="checkbox-label"><input type="checkbox" id="hasSpellbooks" /> Shop sells spellbooks or scrolls</label>
                            </div>
                            <div id="spellbooks-section" style="display: none;">
                                <p class="section-hint">Search spells from the compendium. Ctrl+Click to open spell files.</p>
                                <div id="spellbooks-list">
                                    <!-- Spells populated by JS -->
                                </div>
                                <button type="button" id="add-spell-btn" class="btn btn-secondary">+ Add Spell</button>
                            </div>
                        </div>
                    </div>

                    <div class="preview-pane">
                        <h2>Preview</h2>
                        <div class="shop-card">
                            <div class="card-header shop-header">
                                <span id="preview-name">Shop Name</span>
                                <span id="preview-type" class="shop-type">General Store</span>
                            </div>
                            <div class="card-subheader">
                                <span id="preview-owner">Owner unknown</span>
                                <span id="preview-location">Location unknown</span>
                            </div>
                            <div class="card-body">
                                <div class="shop-description">
                                    <p id="preview-desc">No description.</p>
                                </div>
                                <div class="shop-inventory" id="preview-inventory">
                                    <h4>Inventory</h4>
                                    <div class="inventory-table" id="preview-inventory-table">
                                        <!-- Populated by JS -->
                                    </div>
                                </div>
                                <div class="shop-spellbooks" id="preview-spellbooks" style="display: none;">
                                    <h4>Spellbooks & Scrolls</h4>
                                    <div class="spellbooks-table" id="preview-spellbooks-table">
                                        <!-- Populated by JS -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}
exports.ShopEditorProvider = ShopEditorProvider;
ShopEditorProvider.viewType = 'dnd.shopEditor';
//# sourceMappingURL=shopEditor.js.map