import * as vscode from 'vscode';
import { BaseCustomTextEditorProvider } from './baseEditor';
import { getPreviewData } from '../utils/preview';
import { CompendiumService } from '../services/compendiumService';
import { TempFileService } from '../services/tempFileService';
import { findExistingCustomFile } from '../utils/filePaths';

export class NotesEditorProvider extends BaseCustomTextEditorProvider {

    public static readonly viewType = 'dnd.notesEditor';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new NotesEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(NotesEditorProvider.viewType, provider);
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const localResourceRoots = [
            vscode.Uri.joinPath(this.context.extensionUri, 'media')
        ];

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

        webviewPanel.webview.onDidReceiveMessage(async (message: unknown) => {
            const msg = message as {
                type: string;
                text?: string;
                path?: string;
                x?: number;
                y?: number;
                query?: string;
                searchType?: string;
                requestId?: string;
                entryType?: string;
                name?: string;
                url?: string;
            };

            switch (msg.type) {
                case 'ready':
                    updateWebview();
                    return;

                case 'updateData':
                    this.updateDocumentText(document, msg.text ?? '');
                    return;

                case 'openFile':
                    this.openFile(document, msg.path ?? '');
                    return;

                case 'openExternal':
                    this.openExternal(msg.path ?? msg.text ?? (msg as any).url ?? '');
                    return;

                case 'getPreview':
                    const data = await getPreviewData(document, msg.path ?? '', webviewPanel.webview);
                    webviewPanel.webview.postMessage({
                        type: 'previewData',
                        data: data,
                        x: msg.x,
                        y: msg.y
                    });
                    return;

                case 'searchCompendium':
                    this.handleSearchCompendium(webviewPanel, msg.query ?? '', msg.searchType ?? 'all', msg.requestId ?? '');
                    return;

                case 'getCompendiumEntry':
                    this.handleGetCompendiumEntry(webviewPanel, msg.entryType ?? '', msg.name ?? '', msg.requestId ?? '', msg.x, msg.y);
                    return;

                case 'openCompendiumEntry':
                    this.openCompendiumEntry(msg.entryType ?? '', msg.name ?? '', document);
                    return;
            }
        });
    }

    private handleSearchCompendium(webviewPanel: vscode.WebviewPanel, query: string, searchType: string, requestId: string): void {
        const compendium = CompendiumService.getInstance();
        const validSearchType = searchType as 'spell' | 'monster' | 'item' | 'all';
        const searchResults = compendium.searchAll(query, validSearchType, 5);

        webviewPanel.webview.postMessage({
            type: 'compendiumSearchResults',
            requestId: requestId,
            results: searchResults
        });
    }

    private handleGetCompendiumEntry(
        webviewPanel: vscode.WebviewPanel,
        entryType: string,
        name: string,
        requestId: string,
        x?: number,
        y?: number
    ): void {
        const comp = CompendiumService.getInstance();
        let entryData: unknown = null;

        if (entryType === 'spell') {
            const spellInfo = comp.getSpellInfo(name);
            if (spellInfo) {
                entryData = { type: 'spell', ...spellInfo };
            }
        } else if (entryType === 'monster') {
            const monster = comp.getMonster(name);
            if (monster) {
                entryData = {
                    type: 'monster',
                    name: monster.name,
                    size: monster.size,
                    monsterType: monster.type,
                    subtype: monster.subtype,
                    alignment: monster.alignment,
                    ac: monster.ac,
                    acType: monster.acType,
                    hp: monster.hp,
                    hitDice: monster.hitDice,
                    speed: monster.speed,
                    stats: monster.stats,
                    saves: monster.saves,
                    skills: monster.skills,
                    damageVulnerabilities: monster.damageVulnerabilities,
                    damageResistances: monster.damageResistances,
                    damageImmunities: monster.damageImmunities,
                    conditionImmunities: monster.conditionImmunities,
                    senses: monster.senses,
                    languages: monster.languages,
                    cr: monster.cr,
                    xp: monster.xp,
                    proficiencyBonus: monster.proficiencyBonus,
                    traits: monster.traits,
                    actions: monster.actions,
                    reactions: monster.reactions,
                    legendaryActions: monster.legendaryActions,
                    legendaryDescription: monster.legendaryDescription
                };
            }
        } else if (entryType === 'item') {
            const item = comp.getItem(name);
            if (item) {
                entryData = {
                    type: 'item',
                    name: item.name,
                    itemType: item.type,
                    subtype: item.subtype,
                    rarity: item.rarity,
                    weight: item.weight,
                    value: item.value,
                    attunement: item.attunement,
                    attunementRequirement: item.attunementRequirement,
                    properties: item.properties,
                    damage: item.damage,
                    armorClass: item.armorClass,
                    description: item.description
                };
            }
        }

        webviewPanel.webview.postMessage({
            type: 'compendiumEntryData',
            requestId: requestId,
            data: entryData,
            x: x,
            y: y
        });
    }

    private async openCompendiumEntry(entryType: string, name: string, currentDoc: vscode.TextDocument): Promise<void> {
        const compendium = CompendiumService.getInstance();
        let fileContent: unknown = null;
        let fileExtension = '';
        const sanitizedName = name.replace(/[<>:"/\\|?*]/g, '_');

        if (entryType === 'spell') {
            const spell = compendium.getSpell(name);
            if (spell) {
                fileExtension = '.dndspell';
                const components: string[] = [];
                if (spell.components?.includes('V')) { components.push('V'); }
                if (spell.components?.includes('S')) { components.push('S'); }
                if (spell.components?.includes('M')) { components.push('M'); }

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
        } else if (entryType === 'monster') {
            const monster = compendium.getMonster(name);
            if (monster) {
                fileExtension = '.dndstat';
                fileContent = {
                    name: monster.name,
                    size: monster.size,
                    type: monster.type,
                    subtype: monster.subtype,
                    alignment: monster.alignment,
                    ac: monster.ac,
                    acType: monster.acType,
                    hp: monster.hp,
                    hitDice: monster.hitDice,
                    speed: monster.speed,
                    stats: monster.stats,
                    saves: monster.saves,
                    skills: monster.skills,
                    damageVulnerabilities: monster.damageVulnerabilities,
                    damageResistances: monster.damageResistances,
                    damageImmunities: monster.damageImmunities,
                    conditionImmunities: monster.conditionImmunities,
                    senses: monster.senses,
                    languages: monster.languages,
                    cr: monster.cr,
                    xp: monster.xp,
                    proficiencyBonus: monster.proficiencyBonus,
                    traits: monster.traits,
                    actions: monster.actions,
                    reactions: monster.reactions,
                    legendaryActions: monster.legendaryActions,
                    legendaryDescription: monster.legendaryDescription,
                    description: monster.description,
                    source: monster.source
                };
            }
        } else if (entryType === 'item') {
            const item = compendium.getItem(name);
            if (item) {
                fileExtension = '.dnditem';
                fileContent = {
                    name: item.name,
                    type: item.type,
                    subtype: item.subtype || '',
                    rarity: item.rarity || 'Common',
                    magic: item.magic || false,
                    attunement: item.attunement || false,
                    attunementRequirement: item.attunementRequirement || '',
                    weight: item.weight || 0,
                    value: item.value || '',
                    damage: item.damage,
                    armorClass: item.armorClass,
                    stealthDisadvantage: item.stealthDisadvantage || false,
                    strengthRequirement: item.strengthRequirement,
                    properties: item.properties || [],
                    range: item.range,
                    description: item.description || ''
                };
            }
        }

        if (!fileContent) {
            vscode.window.showWarningMessage(`Could not find ${entryType}: ${name}`);
            return;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(currentDoc.uri);
        const baseUri = workspaceFolder ? workspaceFolder.uri : vscode.Uri.joinPath(currentDoc.uri, '..');

        // Check if file already exists (in custom folder or base directory)
        const existingFile = await findExistingCustomFile(baseUri, sanitizedName, fileExtension);
        if (existingFile) {
            await vscode.commands.executeCommand('vscode.open', existingFile);
            return;
        }

        // File doesn't exist - open as temp file (deleted when closed, unless saved elsewhere)
        try {
            const content = JSON.stringify(fileContent, null, 2);
            const tempFileService = TempFileService.getInstance();
            await tempFileService.openTempFile(sanitizedName, fileExtension, content);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open ${entryType}: ${error}`);
        }
    }

    private convertImagePaths(markdown: string, documentUri: vscode.Uri, webview: vscode.Webview): string {
        return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, imagePath) => {
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
                return match;
            }

            try {
                const imageUri = vscode.Uri.joinPath(documentUri, '..', imagePath);
                const webviewUri = webview.asWebviewUri(imageUri);
                return `![${alt}](${webviewUri.toString()})`;
            } catch (error) {
                console.error(`Error converting image path: ${imagePath}`, error);
                return match;
            }
        });
    }

    protected getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = this.getMediaUri(webview, 'notesEditor.js');
        const tiptapBundleUri = this.getMediaUri(webview, 'tiptap-bundle.js');
        const styleUri = this.getMediaUri(webview, 'notesEditor.css');
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

                    <!-- Compendium -->
                    <div class="toolbar-group">
                        <button id="btn-compendium" class="toolbar-btn" title="Insert Compendium Reference">📖 Compendium</button>
                    </div>

                    <!-- Tables -->
                    <div class="toolbar-group">
                        <div class="table-picker-container">
                            <button id="btn-table" class="toolbar-btn" title="Insert Table">📊 Table</button>
                            <div id="table-picker" class="table-picker">
                                <div class="table-picker-grid" id="table-picker-grid"></div>
                                <div class="table-picker-label" id="table-picker-label">1x1 Table</div>
                            </div>
                        </div>
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

                <!-- Table Context Menu -->
                <div id="table-context-menu" class="context-menu">
                    <button id="ctx-table-insert-row-above" class="context-menu-item">⬆ Insert Row Above</button>
                    <button id="ctx-table-insert-row-below" class="context-menu-item">⬇ Insert Row Below</button>
                    <button id="ctx-table-insert-col-left" class="context-menu-item">⬅ Insert Column Left</button>
                    <button id="ctx-table-insert-col-right" class="context-menu-item">➡ Insert Column Right</button>
                    <button id="ctx-table-delete-row" class="context-menu-item">❌ Delete Row</button>
                    <button id="ctx-table-delete-col" class="context-menu-item">❌ Delete Column</button>
                    <button id="ctx-table-delete-table" class="context-menu-item">🗑 Delete Table</button>
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

                <!-- Compendium Search Dialog -->
                <div id="compendium-dialog" class="input-dialog">
                    <div class="input-dialog-content" style="width: 450px;">
                        <h3 class="input-dialog-title">📖 Insert Compendium Reference</h3>
                        <div class="input-dialog-field">
                            <label for="compendium-type">Type:</label>
                            <select id="compendium-type" class="dnd-select">
                                <option value="all">All</option>
                                <option value="spell">Spells</option>
                                <option value="monster">Monsters</option>
                                <option value="item">Items</option>
                            </select>
                        </div>
                        <div class="input-dialog-field">
                            <label for="compendium-search">Search:</label>
                            <input type="text" id="compendium-search" placeholder="Search spells, monsters, items..." autocomplete="off" />
                        </div>
                        <div id="compendium-results" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--vscode-input-border); border-radius: 4px; margin-bottom: 12px; display: none;"></div>
                        <div class="input-dialog-buttons">
                            <button id="compendium-cancel" class="dnd-btn">Cancel</button>
                        </div>
                    </div>
                </div>

                <!-- Compendium Tooltip -->
                <div id="compendium-tooltip" class="popover" style="max-width: 400px; display: none;"></div>

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
}
