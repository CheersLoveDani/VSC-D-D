import * as vscode from 'vscode';
import { CompendiumService } from '../services/compendiumService';

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

		// Handle messages from the webview
		webviewPanel.webview.onDidReceiveMessage(async e => {
			switch (e.type) {
				case 'ready':
					// Webview is ready, send initial data
					updateWebview();
					return;
				case 'updateData':
					this.updateDocument(document, e.data);
					return;
				case 'searchSpells':
					// Search for spells matching the query
					const compendium = CompendiumService.getInstance();
					const results = compendium.searchSpells(e.query, 10);
					webviewPanel.webview.postMessage({
						type: 'spellSearchResults',
						requestId: e.requestId,
						results: results.map(s => ({
							name: s.name,
							level: s.level,
							school: s.school,
							compact: compendium.formatSpellCompact(s)
						}))
					});
					return;
				case 'getSpellInfo':
					// Get detailed spell info for hover
					const spellCompendium = CompendiumService.getInstance();
					const spell = spellCompendium.getSpell(e.name);
					webviewPanel.webview.postMessage({
						type: 'spellInfo',
						requestId: e.requestId,
						name: e.name,
						found: !!spell,
						info: spell ? {
							name: spell.name,
							level: spell.level,
							school: spell.school,
							castingTime: spell.castingTime,
							range: spell.range,
							components: spell.components,
							duration: spell.duration,
							description: spell.description,
							higherLevels: spell.higherLevels,
							concentration: spell.concentration,
							ritual: spell.ritual,
							damage: spell.damage
						} : null
					});
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
                    <!-- PAGE 1: Main Character Sheet -->
                    <div class="page-section">
                        <h2 class="page-title">Character Sheet - Page 1</h2>

                        <!-- Header Info -->
                        <div class="stat-block-header">
                            <input type="text" id="name" class="char-name-input" placeholder="Character Name" />
                            <div class="char-meta-grid">
                                <div class="field-group">
                                    <label>Player Name</label>
                                    <input type="text" id="playerName" placeholder="Player Name" />
                                </div>
                                <div class="field-group">
                                    <label>Class & Level</label>
                                    <input type="text" id="class" placeholder="e.g., Fighter 3" />
                                </div>
                                <div class="field-group">
                                    <label>Level</label>
                                    <input type="number" id="level" min="1" max="20" value="1" />
                                </div>
                                <div class="field-group">
                                    <label>Background</label>
                                    <input type="text" id="background" placeholder="Background" />
                                </div>
                                <div class="field-group">
                                    <label>Race</label>
                                    <input type="text" id="race" placeholder="Race" />
                                </div>
                                <div class="field-group">
                                    <label>Alignment</label>
                                    <input type="text" id="alignment" placeholder="Alignment" />
                                </div>
                                <div class="field-group">
                                    <label>Experience Points</label>
                                    <input type="number" id="xp" placeholder="0" />
                                </div>
                            </div>
                        </div>

                        <div class="main-grid">
                            <!-- Left Column: Ability Scores & Related Stats -->
                            <div class="left-col">
                                <!-- Ability Scores -->
                                <div class="ability-scores">
                                    ${this.renderAbilityScore('STR', 'stats.str')}
                                    ${this.renderAbilityScore('DEX', 'stats.dex')}
                                    ${this.renderAbilityScore('CON', 'stats.con')}
                                    ${this.renderAbilityScore('INT', 'stats.int')}
                                    ${this.renderAbilityScore('WIS', 'stats.wis')}
                                    ${this.renderAbilityScore('CHA', 'stats.cha')}
                                </div>

                                <!-- Inspiration & Proficiency -->
                                <div class="section">
                                    <div class="field-group inline-field">
                                        <label>Inspiration</label>
                                        <input type="checkbox" id="inspiration" />
                                    </div>
                                    <div class="field-group">
                                        <label>Proficiency Bonus</label>
                                        <input type="text" id="proficiencyBonus" readonly />
                                    </div>
                                </div>

                                <!-- Saving Throws -->
                                <div class="section">
                                    <h3 class="section-title">Saving Throws</h3>
                                    <div class="saves-list">
                                        ${this.renderSave('Strength', 'saves.str', 'stats.str')}
                                        ${this.renderSave('Dexterity', 'saves.dex', 'stats.dex')}
                                        ${this.renderSave('Constitution', 'saves.con', 'stats.con')}
                                        ${this.renderSave('Intelligence', 'saves.int', 'stats.int')}
                                        ${this.renderSave('Wisdom', 'saves.wis', 'stats.wis')}
                                        ${this.renderSave('Charisma', 'saves.cha', 'stats.cha')}
                                    </div>
                                </div>

                                <!-- Skills -->
                                <div class="section">
                                    <h3 class="section-title">Skills</h3>
                                    <div class="skill-list">
                                        ${this.renderSkill('Acrobatics', 'skills.acrobatics', 'dex')}
                                        ${this.renderSkill('Animal Handling', 'skills.animal_handling', 'wis')}
                                        ${this.renderSkill('Arcana', 'skills.arcana', 'int')}
                                        ${this.renderSkill('Athletics', 'skills.athletics', 'str')}
                                        ${this.renderSkill('Deception', 'skills.deception', 'cha')}
                                        ${this.renderSkill('History', 'skills.history', 'int')}
                                        ${this.renderSkill('Insight', 'skills.insight', 'wis')}
                                        ${this.renderSkill('Intimidation', 'skills.intimidation', 'cha')}
                                        ${this.renderSkill('Investigation', 'skills.investigation', 'int')}
                                        ${this.renderSkill('Medicine', 'skills.medicine', 'wis')}
                                        ${this.renderSkill('Nature', 'skills.nature', 'int')}
                                        ${this.renderSkill('Perception', 'skills.perception', 'wis')}
                                        ${this.renderSkill('Performance', 'skills.performance', 'cha')}
                                        ${this.renderSkill('Persuasion', 'skills.persuasion', 'cha')}
                                        ${this.renderSkill('Religion', 'skills.religion', 'int')}
                                        ${this.renderSkill('Sleight of Hand', 'skills.sleight_of_hand', 'dex')}
                                        ${this.renderSkill('Stealth', 'skills.stealth', 'dex')}
                                        ${this.renderSkill('Survival', 'skills.survival', 'wis')}
                                    </div>
                                </div>

                                <!-- Passive Perception -->
                                <div class="section">
                                    <div class="field-group">
                                        <label>Passive Wisdom (Perception)</label>
                                        <input type="text" id="passivePerception" readonly />
                                    </div>
                                </div>


                            </div>

                            <!-- Right Column: Combat & Details -->
                            <div class="right-col">
                                <!-- Combat Stats -->
                                <div class="combat-stats">
                                    <div class="combat-stat">
                                        <label>Armor Class</label>
                                        <input type="number" id="ac" />
                                    </div>
                                    <div class="combat-stat">
                                        <label>Initiative</label>
                                        <input type="text" id="initiative" readonly />
                                    </div>
                                    <div class="combat-stat">
                                        <label>Speed</label>
                                        <input type="text" id="speed" placeholder="30 ft" />
                                    </div>
                                </div>

                                <!-- Hit Points -->
                                <div class="section">
                                    <h3 class="section-title">Hit Points</h3>
                                    <div class="hp-grid">
                                        <div class="field-group">
                                            <label>Maximum</label>
                                            <input type="number" id="hp.max" />
                                        </div>
                                        <div class="field-group">
                                            <label>Current</label>
                                            <input type="number" id="hp.current" />
                                        </div>
                                        <div class="field-group">
                                            <label>Temporary</label>
                                            <input type="number" id="hp.temp" placeholder="0" />
                                        </div>
                                    </div>
                                    <div class="hp-controls">
                                        <div class="hp-controls-grid">
                                            <input type="number" id="hp-adjust-amount" placeholder="Amount" min="0" />
                                            <button class="heal-btn" id="heal-btn">Heal</button>
                                            <button class="damage-btn" id="damage-btn">Damage</button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Hit Dice & Death Saves -->
                                <div class="section">
                                    <div class="field-group">
                                        <label>Hit Dice</label>
                                        <input type="text" id="hitDice" placeholder="e.g., 3d8" />
                                    </div>
                                    <h4>Death Saves</h4>
                                    <div class="death-saves">
                                        <div class="save-row">
                                            <label>Successes</label>
                                            <input type="checkbox" id="deathSaves.success1" />
                                            <input type="checkbox" id="deathSaves.success2" />
                                            <input type="checkbox" id="deathSaves.success3" />
                                        </div>
                                        <div class="save-row">
                                            <label>Failures</label>
                                            <input type="checkbox" id="deathSaves.failure1" />
                                            <input type="checkbox" id="deathSaves.failure2" />
                                            <input type="checkbox" id="deathSaves.failure3" />
                                        </div>
                                    </div>
                                </div>

                                <!-- Attacks & Spellcasting -->
                                <div class="section">
                                    <h3 class="section-title">Attacks & Spellcasting</h3>
                                    <div class="attacks-grid" id="attacks-container">
                                        <!-- Attacks will be added dynamically -->
                                    </div>
                                    <button class="add-attack-btn" id="add-attack-btn">+ Add Attack</button>
                                </div>

                                <!-- Grid Sections -->
                                <div class="grid-sections">
                                    <!-- Equipment -->
                                    <div class="section">
                                        <h3 class="section-title">Equipment</h3>
                                        <textarea id="equipment" rows="8" placeholder="List your equipment and gear..."></textarea>
                                    </div>

                                    <!-- Features & Traits -->
                                    <div class="section">
                                        <h3 class="section-title">Features & Traits</h3>
                                        <textarea id="traits" rows="6" placeholder="Class features, racial traits, feats..."></textarea>
                                    </div>

                                    <!-- Other Proficiencies & Languages -->
                                    <div class="section">
                                        <h3 class="section-title">Other Proficiencies & Languages</h3>
                                        <textarea id="proficienciesAndLanguages" rows="6" placeholder="Armor, weapons, tools, languages..."></textarea>
                                    </div>

                                    <!-- Money -->
                                    <div class="section">
                                        <h3 class="section-title">Money</h3>
                                        <div class="money-grid">
                                            <div class="money-item">
                                                <label>CP</label>
                                                <input type="number" id="money.cp" placeholder="0" />
                                            </div>
                                            <div class="money-item">
                                                <label>SP</label>
                                                <input type="number" id="money.sp" placeholder="0" />
                                            </div>
                                            <div class="money-item">
                                                <label>EP</label>
                                                <input type="number" id="money.ep" placeholder="0" />
                                            </div>
                                            <div class="money-item">
                                                <label>GP</label>
                                                <input type="number" id="money.gp" placeholder="0" />
                                            </div>
                                            <div class="money-item">
                                                <label>PP</label>
                                                <input type="number" id="money.pp" placeholder="0" />
                                            </div>
                                        </div>
                                        <div class="money-total">
                                            <label>Total (GP)</label>
                                            <input type="text" id="money.total" readonly />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PAGE 2: Character Details -->
                    <div class="page-section">
                        <h2 class="page-title">Character Sheet - Page 2</h2>

                        <div class="page2-grid">
                            <!-- Personality -->
                            <div class="section">
                                <h3 class="section-title">Personality Traits</h3>
                                <textarea id="personalityTraits" rows="3" placeholder="Describe your character's personality traits..."></textarea>
                            </div>

                            <div class="section">
                                <h3 class="section-title">Ideals</h3>
                                <textarea id="ideals" rows="3" placeholder="What beliefs drive your character?"></textarea>
                            </div>

                            <div class="section">
                                <h3 class="section-title">Bonds</h3>
                                <textarea id="bonds" rows="3" placeholder="What connections are most important?"></textarea>
                            </div>

                            <div class="section">
                                <h3 class="section-title">Flaws</h3>
                                <textarea id="flaws" rows="3" placeholder="What weaknesses does your character have?"></textarea>
                            </div>

                            <!-- Appearance & Backstory -->
                            <div class="section">
                                <h3 class="section-title">Appearance</h3>
                                <textarea id="appearance" rows="5" placeholder="Physical description: age, height, weight, eyes, hair, skin..."></textarea>
                            </div>

                            <div class="section">
                                <h3 class="section-title">Allies & Organizations</h3>
                                <textarea id="allies" rows="5" placeholder="Important NPCs, factions, organizations..."></textarea>
                            </div>

                            <div class="section full-width">
                                <h3 class="section-title">Backstory</h3>
                                <textarea id="backstory" rows="8" placeholder="Tell your character's story..."></textarea>
                            </div>

                            <!-- Additional Features & Traits -->
                            <div class="section">
                                <h3 class="section-title">Additional Features & Traits</h3>
                                <textarea id="additionalFeatures" rows="6" placeholder="Extra features, abilities, special traits..."></textarea>
                            </div>

                            <!-- Treasure -->
                            <div class="section">
                                <h3 class="section-title">Treasure</h3>
                                <textarea id="treasure" rows="6" placeholder="Magic items, special possessions, valuables..."></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- PAGE 3: Spellcasting -->
                    <div class="page-section">
                        <h2 class="page-title">Character Sheet - Page 3 (Spellcasting)</h2>

                        <div class="spellcasting-header">
                            <div class="field-group">
                                <label>Spellcasting Class</label>
                                <input type="text" id="spellcastingClass" placeholder="e.g., Wizard, Cleric" />
                            </div>
                            <div class="field-group">
                                <label>Spellcasting Ability</label>
                                <input type="text" id="spellcastingAbility" placeholder="e.g., INT, WIS, CHA" />
                            </div>
                            <div class="field-group">
                                <label>Spell Save DC</label>
                                <input type="text" id="spellSaveDC" readonly />
                            </div>
                            <div class="field-group">
                                <label>Spell Attack Bonus</label>
                                <input type="text" id="spellAttackBonus" readonly />
                            </div>
                        </div>

                        <!-- Spell Slots & Spells -->
                        <div class="section">
                            <h3 class="section-title">Spell Slots & Spells</h3>
                            <div class="spell-slots-grid" id="spell-slots-container">
                                ${this.renderSpellSlotLevel('Cantrips', '0')}
                                ${this.renderSpellSlotLevel('1st Level', '1')}
                                ${this.renderSpellSlotLevel('2nd Level', '2')}
                                ${this.renderSpellSlotLevel('3rd Level', '3')}
                                ${this.renderSpellSlotLevel('4th Level', '4')}
                                ${this.renderSpellSlotLevel('5th Level', '5')}
                                ${this.renderSpellSlotLevel('6th Level', '6')}
                                ${this.renderSpellSlotLevel('7th Level', '7')}
                                ${this.renderSpellSlotLevel('8th Level', '8')}
                                ${this.renderSpellSlotLevel('9th Level', '9')}
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
            <div class="modifier" id="${id}.modifier">+0</div>
        </div>`;
    }

    private renderSave(label: string, id: string, statId: string): string {
        return `
        <div class="save-row">
            <input type="checkbox" id="${id}.prof" />
            <span class="save-value" id="${id}.value">+0</span>
            <label>${label}</label>
        </div>`;
    }

    private renderSkill(label: string, id: string, stat: string): string {
        return `
        <div class="skill-row">
            <input type="checkbox" id="${id}.prof" />
            <span class="skill-value" id="${id}.value">+0</span>
            <label>${label} (${stat.toUpperCase()})</label>
        </div>`;
    }

    private renderSpellSlotLevel(label: string, level: string): string {
        return `
        <div class="spell-slot-container">
            <div class="spell-slot-row" data-level="${level}">
                <label>${label}</label>
                <input type="number" id="spellSlots.level${level}.total" min="0" placeholder="Total" />
                <input type="number" id="spellSlots.level${level}.expended" min="0" placeholder="Used" />
                <button type="button" class="add-spell-btn" data-level="${level}">+</button>
            </div>
            <div class="spells-for-level" id="spells-level${level}">
                <!-- Spells for this level will be added dynamically -->
            </div>
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
