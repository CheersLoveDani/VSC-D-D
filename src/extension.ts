import * as vscode from 'vscode';
import { MapEditorProvider } from './editors/mapEditor';
import { CharacterSheetProvider } from './editors/characterEditor';
import { ItemEditorProvider } from './editors/itemEditor';
import { NotesEditorProvider } from './editors/notesEditor';
import { StatBlockEditorProvider } from './editors/statBlockEditor';
import { DndHoverProvider } from './providers/hoverProvider';
import { DndLinkProvider } from './providers/linkProvider';
import { PluginManagerProvider } from './views/pluginManager';
import { CompendiumService } from './services/compendiumService';

export function activate(context: vscode.ExtensionContext) {
	console.log('D&D Campaign Manager is now active!');

	// Initialize Compendium Service
	const compendium = CompendiumService.getInstance(context);
	compendium.initialize().then(() => {
		const stats = compendium.getStats();
		console.log(`Compendium loaded: ${stats.spells} spells, ${stats.monsters} monsters, ${stats.items} items`);
	});

	// Register Custom Editors
	context.subscriptions.push(MapEditorProvider.register(context));
	context.subscriptions.push(CharacterSheetProvider.register(context));
	context.subscriptions.push(ItemEditorProvider.register(context));
    context.subscriptions.push(NotesEditorProvider.register(context));
	context.subscriptions.push(StatBlockEditorProvider.register(context));

    // Register Hover Provider
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            [{ scheme: 'file', language: 'dndnotes' }, { scheme: 'file', language: 'markdown' }],
            new DndHoverProvider()
        )
    );

    // Register Document Link Provider
    context.subscriptions.push(
        vscode.languages.registerDocumentLinkProvider(
            [{ scheme: 'file', language: 'dndnotes' }, { scheme: 'file', language: 'markdown' }],
            new DndLinkProvider()
        )
    );

    // Register Plugin Manager
    const pluginManagerProvider = new PluginManagerProvider(context);
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
                vscode.window.showInformationMessage(
                    `Compendium imported: ${counts.spells} spells, ${counts.monsters} monsters, ${counts.items} items`
                );
            });
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('dnd-campaign-manager.compendiumStats', () => {
        const stats = compendium.getStats();
        vscode.window.showInformationMessage(
            `Compendium: ${stats.spells} spells, ${stats.monsters} monsters, ${stats.items} items`
        );
    }));
}

export function deactivate() {}
