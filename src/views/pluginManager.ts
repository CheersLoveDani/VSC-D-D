import * as vscode from 'vscode';

export class PluginManagerProvider implements vscode.TreeDataProvider<PluginItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PluginItem | undefined | void> = new vscode.EventEmitter<PluginItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<PluginItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: PluginItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PluginItem): Thenable<PluginItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        const isPlainText = this.context.globalState.get<boolean>('dnd-campaign-manager.plainTextMode', false);
        
        return Promise.resolve([
            new PluginItem(
                'Edit in Plain Text',
                isPlainText ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.None,
                isPlainText ? 'check' : 'circle-slash',
                {
                    command: 'dnd-campaign-manager.togglePlainText',
                    title: 'Toggle Plain Text Mode',
                    arguments: []
                },
                isPlainText ? 'Enabled: Files will open as JSON' : 'Disabled: Files will open with Custom Editors'
            ),
            new PluginItem(
                'Create Setup Files',
                vscode.TreeItemCollapsibleState.None,
                'file-add',
                {
                    command: 'dnd-campaign-manager.createSetupFiles',
                    title: 'Create Setup Files',
                    arguments: []
                },
                'Generate instructions and example files'
            )
        ]);
    }

    public async createSetupFiles() {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
                return;
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const examplesPath = vscode.Uri.file(`${rootPath}/examples`);

            // Create examples folder
            await vscode.workspace.fs.createDirectory(examplesPath);

            // Create example character file
            const exampleChar = {
                name: "Gandalf the Grey",
                class: "Wizard",
                race: "Maia",
                alignment: "Neutral Good",
                stats: { str: 10, dex: 11, con: 14, int: 18, wis: 17, cha: 15 },
                hp: { current: 38, max: 38, temp: 0 },
                ac: 13,
                initiative: 0,
                speed: "30 ft.",
                level: 10,
                playerName: "J.R.R. Tolkien",
                background: "Sage (Istari Order)",
                xp: 85000,
                hitDice: "10d6",
                proficienciesAndLanguages: "Common, Elvish, Dwarvish, Sindarin, Quenya, Black Speech",
                inspiration: true,
                skills: {
                    acrobatics: { prof: false },
                    animal_handling: { prof: false },
                    arcana: { prof: true },
                    athletics: { prof: false },
                    deception: { prof: false },
                    history: { prof: true },
                    insight: { prof: true },
                    intimidation: { prof: false },
                    investigation: { prof: true },
                    medicine: { prof: false },
                    nature: { prof: true },
                    perception: { prof: true },
                    performance: { prof: false },
                    persuasion: { prof: true },
                    religion: { prof: true },
                    sleight_of_hand: { prof: false },
                    stealth: { prof: false },
                    survival: { prof: false }
                },
                saves: {
                    str: { prof: false },
                    dex: { prof: false },
                    con: { prof: false },
                    int: { prof: true },
                    wis: { prof: true },
                    cha: { prof: false }
                },
                deathSaves: {
                    success1: false,
                    success2: false,
                    success3: false,
                    failure1: false,
                    failure2: false,
                    failure3: false
                },
                attacks: [
                    {
                        name: "Glamdring (Longsword)",
                        stat: "str",
                        bonusDamage: "+2",
                        dice: "1d8",
                        damage: "slashing"
                    },
                    {
                        name: "Staff",
                        stat: "str",
                        bonusDamage: "",
                        dice: "1d6",
                        damage: "bludgeoning"
                    }
                ],
                equipment: "Glamdring (Foe-hammer), Staff of Power, Grey robes, Wizard's hat, Pipe, Pipe-weed, Spell book, Component pouch",
                inventory: "Elven rope (50 ft.), Waybread (lembas), Map of Middle-earth, Letter from Saruman",
                traits: "Can speak with animals, Resistant to fire",
                personalityTraits: "I use polite speech and formal manners. I am patient and prefer to guide others to find their own answers rather than simply telling them what to do.",
                ideals: "Knowledge. The path to power and self-improvement is through knowledge and understanding of the world.",
                bonds: "I have sworn to protect the Free Peoples of Middle-earth from the forces of darkness.",
                flaws: "I can be overly cautious and secretive, sometimes withholding information that others need to know.",
                appearance: "Tall old man with a long grey beard and bushy eyebrows. Wears grey robes and a pointed hat. Carries a wooden staff and smokes a long pipe.",
                backstory: "One of the five Istari (wizards) sent to Middle-earth to contest the power of Sauron. Known as Mithrandir to the Elves and Gandalf to Men. Has wandered Middle-earth for thousands of years, guiding and advising the Free Peoples.",
                allies: "Elrond, Galadriel, Aragorn, Frodo Baggins, the Fellowship of the Ring",
                additionalFeatures: "Immortal spirit in mortal form, Cannot be permanently killed (will be reborn), Enhanced wisdom and magical abilities",
                treasure: "Ring of Fire (Narya) - grants resistance to fire and ability to inspire hope in others",
                notes: "Currently investigating rumors of the One Ring. Has a particular fondness for Hobbits and their simple wisdom.",
                spellcastingClass: "Wizard",
                spellcastingAbility: "INT",
                spellList: "Wizard spell list",
                spellSlots: {
                    level0: { total: 4, expended: 0 },
                    level1: { total: 4, expended: 1 },
                    level2: { total: 3, expended: 0 },
                    level3: { total: 3, expended: 1 },
                    level4: { total: 3, expended: 0 },
                    level5: { total: 2, expended: 1 },
                    level6: { total: 1, expended: 0 },
                    level7: { total: 1, expended: 0 },
                    level8: { total: 1, expended: 0 },
                    level9: { total: 1, expended: 0 }
                },
                spells: {
                    level0: [
                        { name: "Light", prepared: true },
                        { name: "Prestidigitation", prepared: true },
                        { name: "Mage Hand", prepared: true },
                        { name: "Message", prepared: true }
                    ],
                    level1: [
                        { name: "Shield", prepared: true },
                        { name: "Magic Missile", prepared: true },
                        { name: "Detect Magic", prepared: true },
                        { name: "Comprehend Languages", prepared: false }
                    ],
                    level2: [
                        { name: "Knock", prepared: true },
                        { name: "Invisibility", prepared: true },
                        { name: "Suggestion", prepared: false }
                    ],
                    level3: [
                        { name: "Fireball", prepared: true },
                        { name: "Counterspell", prepared: true },
                        { name: "Dispel Magic", prepared: true }
                    ],
                    level4: [
                        { name: "Greater Invisibility", prepared: true },
                        { name: "Polymorph", prepared: false }
                    ],
                    level5: [
                        { name: "Wall of Force", prepared: true },
                        { name: "Cone of Cold", prepared: false }
                    ]
                },
                money: {
                    cp: 0,
                    sp: 0,
                    ep: 0,
                    gp: 250,
                    pp: 10,
                    total: "350 GP"
                }
            };

            // Create example item file
            const exampleItem = {
                name: "Potion of Healing",
                type: "potion",
                value: 50,
                weight: 0.5,
                description: "Restores 2d4 + 2 hit points when consumed."
            };

            // Create example map file
            const exampleMap = {
                imagePath: "",
                pins: [
                    {
                        id: "1",
                        x: 100,
                        y: 100,
                        label: "Town Square",
                        icon: "🏛️",
                        link: "./examples/example.dndnotes"
                    }
                ]
            };

            // Create example notes file
            const exampleNotes = `# Campaign Notes: Example Adventure

Welcome to CritCode! This is an example notes file.

## Linking Files

You can link to other files in your campaign:

- [Character Sheet](./example.dndchar) - Link to a character
- [Item Database](./example.dnditem) - Link to an item
- [Map](./example.dndmap) - Link to a map
- [Stat Block](./example.dndstat) - Link to a creature stat block

## Formatting

You can use **bold**, *italic*, and other markdown formatting.

### Lists

- Item 1
- Item 2
- Item 3

### Tables

| Name | Level | Class |
|------|-------|-------|
| Gandalf | 10 | Wizard |
| Aragorn | 8 | Ranger |
`;

            // Create example stat block file
            const exampleStat = {
                name: "Goblin",
                size: "Small",
                type: "humanoid",
                subtype: "goblinoid",
                alignment: "neutral evil",
                armorClass: 15,
                armorType: "leather armor, shield",
                hitPoints: 7,
                hitDice: "2d6",
                speed: [{ name: "walk", description: "30 ft." }],
                abilityScores: {
                    strength: 8,
                    dexterity: 14,
                    constitution: 10,
                    intelligence: 10,
                    wisdom: 8,
                    charisma: 8
                },
                skills: [{ name: "Stealth", description: "+6" }],
                senses: [
                    { name: "darkvision", description: "60 ft." },
                    { name: "passive Perception", description: "9" }
                ],
                languages: ["Common", "Goblin"],
                challengeRating: "1/4",
                xp: 50,
                traits: [
                    {
                        name: "Nimble Escape",
                        description: "The goblin can take the Disengage or Hide action as a bonus action on each of its turns."
                    }
                ],
                actions: [
                    {
                        name: "Scimitar",
                        description: "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage."
                    }
                ]
            };

            // Write example files
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(`${rootPath}/examples/example.dndchar`),
                new TextEncoder().encode(JSON.stringify(exampleChar, null, 2))
            );

            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(`${rootPath}/examples/example.dnditem`),
                new TextEncoder().encode(JSON.stringify(exampleItem, null, 2))
            );

            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(`${rootPath}/examples/example.dndmap`),
                new TextEncoder().encode(JSON.stringify(exampleMap, null, 2))
            );

            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(`${rootPath}/examples/example.dndnotes`),
                new TextEncoder().encode(exampleNotes)
            );

            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(`${rootPath}/examples/example.dndstat`),
                new TextEncoder().encode(JSON.stringify(exampleStat, null, 2))
            );

            // Create instruction file
            const instructions = `# CritCode Instructions

Welcome to **CritCode**, your D&D campaign management extension for VS Code!

## Overview

CritCode provides custom editors for managing your D&D campaign files:

- **Character Sheets** (.dndchar) - Track player and NPC stats, inventory, and abilities
- **Item Database** (.dnditem) - Catalog weapons, armor, potions, and magical items
- **Maps** (.dndmap) - Visual maps with interactive pins linking to notes and locations
- **Notes** (.dndnotes) - Rich text campaign notes with markdown support and file linking
- **Stat Blocks** (.dndstat) - Monster and creature statistics

## Getting Started

### Creating Files

1. Right-click in the Explorer
2. Select "New File"
3. Name your file with the appropriate extension:
   - \`character.dndchar\` for character sheets
   - \`items.dnditem\` for item databases
   - \`worldmap.dndmap\` for maps
   - \`notes.dndnotes\` for campaign notes
   - \`goblin.dndstat\` for stat blocks

### Using the Editors

Each file type opens with a custom editor designed for that content:

#### Character Sheets (.dndchar)
- Fill in character details, stats, and abilities
- Track HP, AC, and other vital statistics
- Manage inventory and equipment
- Record spells and spell slots

#### Item Database (.dnditem)
- Add items with name, type, value, and weight
- Write detailed descriptions
- Perfect for tracking loot and treasure

#### Maps (.dndmap)
- Upload a map image
- Add interactive pins with labels and icons
- Link pins to notes, characters, or other files
- Toggle edit mode to add/remove pins

#### Notes (.dndnotes)
- Write campaign notes using markdown
- Link to other files: \`[Character Name](./path/to/character.dndchar)\`
- Format text with headers, lists, tables, and more
- Hover over links to preview the linked file

#### Stat Blocks (.dndstat)
- Create monster and creature stat blocks
- Track abilities, actions, and traits
- Set challenge rating and XP

## Linking Files

One of CritCode's most powerful features is file linking. In your notes, you can link to any other file:

\`\`\`markdown
Check out [Gandalf's character sheet](./examples/example.dndchar)!

The party found a [Potion of Healing](./examples/example.dnditem).

See the [town map](./examples/example.dndmap) for locations.
\`\`\`

Hover over any link to see a preview of the file!

## Plugin Manager

Access the D&D Manager panel (d20 icon in the activity bar) to:

- **Toggle Plain Text Mode** - Switch between custom editors and raw JSON editing
- **Create Setup Files** - Generate example files and this instruction document

## Example Files

Check the \`examples\` folder for sample files of each type to help you get started!

## Tips

1. **Organize Your Campaign** - Create folders for different aspects (characters, locations, items, etc.)
2. **Use Relative Links** - Link files using relative paths for portability
3. **Backup Your Work** - Use Git or another version control system
4. **Preview Links** - Hover over links in notes to quickly preview content
5. **Map Pins** - Use emoji icons for map pins (🏰, ⚔️, 🏛️, 🌲, etc.)

## Need Help?

- Check the example files in the \`examples\` folder
- Visit the extension repository for documentation
- Report issues or request features on GitHub

Happy adventuring! 🎲
`;

            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(`${rootPath}/CRITCODE_INSTRUCTIONS.md`),
                new TextEncoder().encode(instructions)
            );

            vscode.window.showInformationMessage('Setup files created successfully! Check the examples folder and CRITCODE_INSTRUCTIONS.md');

            // Open the instructions file
            const instructionsUri = vscode.Uri.file(`${rootPath}/CRITCODE_INSTRUCTIONS.md`);
            await vscode.window.showTextDocument(instructionsUri);

        } catch (error) {
            console.error('[PluginManager] Error creating setup files:', error);
            vscode.window.showErrorMessage(`Failed to create setup files: ${error}`);
        }
    }

    public async togglePlainTextMode() {
        try {
            const currentState = this.context.globalState.get<boolean>('dnd-campaign-manager.plainTextMode', false);
            const newState = !currentState;
            
            console.log(`[PluginManager] Starting toggle: ${currentState} -> ${newState}`);
            
            // Save currently open editors
            const openEditors = vscode.window.tabGroups.all.flatMap(group => 
                group.tabs.map(tab => (tab.input as any)?.uri).filter((uri: any) => uri)
            );
            console.log(`[PluginManager] Saved ${openEditors.length} open editors`);
            
            // Update global state
            await this.context.globalState.update('dnd-campaign-manager.plainTextMode', newState);
            console.log(`[PluginManager] Global state updated`);
            
            // Update workbench.editorAssociations
            const config = vscode.workspace.getConfiguration();
            const currentAssociations = config.get<{[key: string]: string}>('workbench.editorAssociations') || {};
            
            console.log('[PluginManager] Current associations before update:', JSON.stringify(currentAssociations));
            
            // Create a new object (shallow copy) to avoid proxy issues
            const associations: {[key: string]: string} = { ...currentAssociations };
            
            if (newState) {
                // Enable Plain Text Mode: Associate files with default text editor
                associations['*.dndchar'] = 'default';
                associations['*.dnditem'] = 'default';
                associations['*.dndmap'] = 'default';
                associations['*.dndnotes'] = 'default';
                console.log('[PluginManager] Setting associations to default');
            } else {
                // Disable Plain Text Mode: Remove associations to revert to custom editors
                delete associations['*.dndchar'];
                delete associations['*.dnditem'];
                delete associations['*.dndmap'];
                delete associations['*.dndnotes'];
                console.log('[PluginManager] Removing associations');
            }
            
            console.log('[PluginManager] New associations to save:', JSON.stringify(associations));
            
            await config.update('workbench.editorAssociations', associations, vscode.ConfigurationTarget.Global);
            console.log('[PluginManager] Configuration updated successfully');

            // Close all editors to force reload
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            console.log('[PluginManager] All editors closed');

            // Reopen the previously open editors
            for (const uri of openEditors) {
                try {
                    if (newState) {
                        // Opening in text mode - use default editor
                        await vscode.window.showTextDocument(uri as vscode.Uri, { preview: false, preserveFocus: true });
                    } else {
                        // Opening in custom editor mode - explicitly specify the editor based on file extension
                        const uriObj = uri as vscode.Uri;
                        const extension = uriObj.path.split('.').pop()?.toLowerCase();
                        let editorId: string | undefined;
                        
                        switch (extension) {
                            case 'dndchar':
                                editorId = 'dnd.characterEditor';
                                break;
                            case 'dnditem':
                                editorId = 'dnd.itemEditor';
                                break;
                            case 'dndmap':
                                editorId = 'dnd.mapEditor';
                                break;
                            case 'dndnotes':
                                editorId = 'dnd.notesEditor';
                                break;
                        }
                        
                        if (editorId) {
                            await vscode.commands.executeCommand('vscode.openWith', uriObj, editorId);
                        } else {
                            // Fallback to default for non-DND files
                            await vscode.window.showTextDocument(uriObj, { preview: false, preserveFocus: true });
                        }
                    }
                } catch (err) {
                    console.warn(`[PluginManager] Failed to reopen ${uri}:`, err);
                }
            }
            console.log('[PluginManager] Reopened editors');

            // Refresh the tree view
            this.refresh();
            console.log('[PluginManager] Tree view refreshed');
            
            const message = newState 
                ? "Plain Text Mode Enabled. Files reopened as text." 
                : "Plain Text Mode Disabled. Files reopened with Custom Editors.";
            vscode.window.showInformationMessage(message);
            console.log(`[PluginManager] Toggle complete: ${message}`);
        } catch (error) {
            console.error('[PluginManager] Error toggling plain text mode:', error);
            vscode.window.showErrorMessage(`Failed to toggle plain text mode: ${error}`);
        }
    }
}

class PluginItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        iconName: string,
        command?: vscode.Command,
        description?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`;
        this.description = description;
        this.iconPath = new vscode.ThemeIcon(iconName);
        this.command = command;
    }
}
