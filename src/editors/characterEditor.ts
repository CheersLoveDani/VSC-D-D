import * as vscode from 'vscode';

export class CharacterSheetProvider implements vscode.CustomTextEditorProvider {

	public static readonly viewType = 'dnd.characterEditor';

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new CharacterSheetProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(CharacterSheetProvider.viewType, provider);
		return providerRegistration;
	}

	constructor(
		private readonly context: vscode.ExtensionContext
	) { }

	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
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

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebview();
			}
		});
		updateWebview();
	}

	private getHtmlForWebview(webview: vscode.Webview): string {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'characterEditor.js'));
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'characterEditor.css'));

		return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet" />
				<title>Character Sheet</title>
			</head>
			<body>
                <div class="container">
                    <!-- Stat Block Header -->
                    <div class="stat-block-header">
                        <input type="text" id="name" class="char-name-input" placeholder="Character Name" />
                        <div class="char-meta">
                            <input type="text" id="race" placeholder="Race" />
                            <input type="text" id="class" placeholder="Class & Level" />
                            <input type="text" id="alignment" placeholder="Alignment" />
                        </div>
                    </div>

                    <div class="main-grid">
                        <!-- Left Column: Ability Scores -->
                        <div class="left-col">
                            <div class="ability-scores">
                                ${this.renderAbilityScore('STR', 'stats.str')}
                                ${this.renderAbilityScore('DEX', 'stats.dex')}
                                ${this.renderAbilityScore('CON', 'stats.con')}
                                ${this.renderAbilityScore('INT', 'stats.int')}
                                ${this.renderAbilityScore('WIS', 'stats.wis')}
                                ${this.renderAbilityScore('CHA', 'stats.cha')}
                            </div>
                        </div>

                        <!-- Right Column: Combat & Details -->
                        <div class="right-col">
                            <div class="combat-stats">
                                <div class="combat-stat">
                                    <label>Armor Class</label>
                                    <input type="number" id="ac" />
                                </div>
                                <div class="combat-stat">
                                    <label>Initiative</label>
                                    <input type="number" id="initiative" />
                                </div>
                                <div class="combat-stat">
                                    <label>Speed</label>
                                    <input type="text" id="speed" />
                                </div>
                                <div class="combat-stat">
                                    <label>Hit Points</label>
                                    <div style="display:flex; gap:5px;">
                                        <input type="number" id="hp.current" placeholder="Cur" />
                                        <span style="align-self:center">/</span>
                                        <input type="number" id="hp.max" placeholder="Max" />
                                    </div>
                                </div>
                            </div>

                            <div class="section">
                                <h3 class="section-title">Skills & Saves</h3>
                                <div class="skill-list">
                                    ${this.renderSkill('Acrobatics (Dex)', 'skills.acrobatics')}
                                    ${this.renderSkill('Animal Handling (Wis)', 'skills.animal_handling')}
                                    ${this.renderSkill('Arcana (Int)', 'skills.arcana')}
                                    ${this.renderSkill('Athletics (Str)', 'skills.athletics')}
                                    ${this.renderSkill('Deception (Cha)', 'skills.deception')}
                                    ${this.renderSkill('History (Int)', 'skills.history')}
                                    ${this.renderSkill('Insight (Wis)', 'skills.insight')}
                                    ${this.renderSkill('Intimidation (Cha)', 'skills.intimidation')}
                                    ${this.renderSkill('Investigation (Int)', 'skills.investigation')}
                                    ${this.renderSkill('Medicine (Wis)', 'skills.medicine')}
                                    ${this.renderSkill('Nature (Int)', 'skills.nature')}
                                    ${this.renderSkill('Perception (Wis)', 'skills.perception')}
                                    ${this.renderSkill('Performance (Cha)', 'skills.performance')}
                                    ${this.renderSkill('Persuasion (Cha)', 'skills.persuasion')}
                                    ${this.renderSkill('Religion (Int)', 'skills.religion')}
                                    ${this.renderSkill('Sleight of Hand (Dex)', 'skills.sleight_of_hand')}
                                    ${this.renderSkill('Stealth (Dex)', 'skills.stealth')}
                                    ${this.renderSkill('Survival (Wis)', 'skills.survival')}
                                </div>
                            </div>

                            <div class="section">
                                <h3 class="section-title">Inventory</h3>
                                <textarea id="inventory" rows="6"></textarea>
                            </div>

                            <div class="section">
                                <h3 class="section-title">Features & Traits</h3>
                                <textarea id="traits" rows="6"></textarea>
                            </div>
                            
                            <div class="section">
                                <h3 class="section-title">Notes</h3>
                                <textarea id="notes" rows="6"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
	}

    private renderAbilityScore(label: string, id: string): string {
        return `
        <div class="ability-score">
            <label>${label}</label>
            <input type="number" id="${id}" value="10" />
            <!-- Modifier could be calculated in JS -->
        </div>`;
    }

    private renderSkill(label: string, id: string): string {
        return `
        <div class="skill-row">
            <input type="checkbox" id="${id}.prof" />
            <label>${label}</label>
        </div>`;
    }

    private updateDocument(document: vscode.TextDocument, data: any) {
        const edit = new vscode.WorkspaceEdit();
        
        // Replace the entire document content
        // We use a large range to ensure we cover everything
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );

        edit.replace(
            document.uri,
            fullRange,
            JSON.stringify(data, null, 2)
        );

        return vscode.workspace.applyEdit(edit).then(success => {
            if (!success) {
                console.error('Failed to apply edit to character sheet');
                vscode.window.showErrorMessage('Failed to save character sheet changes.');
            }
        }, error => {
            console.error('Error applying edit:', error);
            vscode.window.showErrorMessage('Error saving character sheet: ' + error);
        });
    }
}
