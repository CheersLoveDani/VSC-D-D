"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const mapEditor_1 = require("./editors/mapEditor");
const characterEditor_1 = require("./editors/characterEditor");
const itemEditor_1 = require("./editors/itemEditor");
const spellEditor_1 = require("./editors/spellEditor");
const notesEditor_1 = require("./editors/notesEditor");
const statBlockEditor_1 = require("./editors/statBlockEditor");
const hoverProvider_1 = require("./providers/hoverProvider");
const linkProvider_1 = require("./providers/linkProvider");
const pluginManager_1 = require("./views/pluginManager");
const compendiumService_1 = require("./services/compendiumService");
function activate(context) {
    console.log('D&D Campaign Manager is now active!');
    // Initialize Compendium Service
    const compendium = compendiumService_1.CompendiumService.getInstance(context);
    compendium.initialize().then(() => {
        const stats = compendium.getStats();
        console.log(`Compendium loaded: ${stats.spells} spells, ${stats.monsters} monsters, ${stats.items} items`);
    });
    // Register Custom Editors
    context.subscriptions.push(mapEditor_1.MapEditorProvider.register(context));
    context.subscriptions.push(characterEditor_1.CharacterSheetProvider.register(context));
    context.subscriptions.push(itemEditor_1.ItemEditorProvider.register(context));
    context.subscriptions.push(spellEditor_1.SpellEditorProvider.register(context));
    context.subscriptions.push(notesEditor_1.NotesEditorProvider.register(context));
    context.subscriptions.push(statBlockEditor_1.StatBlockEditorProvider.register(context));
    // Register Hover Provider
    context.subscriptions.push(vscode.languages.registerHoverProvider([{ scheme: 'file', language: 'dndnotes' }, { scheme: 'file', language: 'markdown' }], new hoverProvider_1.DndHoverProvider()));
    // Register Document Link Provider
    context.subscriptions.push(vscode.languages.registerDocumentLinkProvider([{ scheme: 'file', language: 'dndnotes' }, { scheme: 'file', language: 'markdown' }], new linkProvider_1.DndLinkProvider()));
    // Register Plugin Manager
    const pluginManagerProvider = new pluginManager_1.PluginManagerProvider(context);
    vscode.window.registerTreeDataProvider('dnd-plugin-manager', pluginManagerProvider);
    // Register Commands
    context.subscriptions.push(vscode.commands.registerCommand('dnd-campaign-manager.createMap', () => {
        vscode.window.showInformationMessage('Create Map command triggered');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('dnd-campaign-manager.togglePlainText', () => {
        pluginManagerProvider.togglePlainTextMode();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('dnd-campaign-manager.createSetupFiles', () => {
        pluginManagerProvider.createSetupFiles();
    }));
    // Compendium Commands
    context.subscriptions.push(vscode.commands.registerCommand('dnd-campaign-manager.importCompendium', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'XML Compendium': ['xml'] },
            title: 'Select Compendium XML File'
        });
        if (fileUri && fileUri[0]) {
            const filePath = fileUri[0].fsPath;
            // Save path to settings
            const config = vscode.workspace.getConfiguration('dnd.compendium');
            await config.update('importedPath', filePath, vscode.ConfigurationTarget.Global);
            // Import the compendium
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Importing Compendium...',
                cancellable: false
            }, async () => {
                const counts = await compendium.importXmlCompendium(filePath);
                vscode.window.showInformationMessage(`Compendium imported: ${counts.spells} spells, ${counts.monsters} monsters, ${counts.items} items`);
            });
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('dnd-campaign-manager.compendiumStats', () => {
        const stats = compendium.getStats();
        vscode.window.showInformationMessage(`Compendium: ${stats.spells} spells, ${stats.monsters} monsters, ${stats.items} items`);
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map