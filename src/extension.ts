import * as vscode from 'vscode';
import { MapEditorProvider } from './editors/mapEditor';
import { CharacterSheetProvider } from './editors/characterEditor';
import { ItemEditorProvider } from './editors/itemEditor';
import { NotesEditorProvider } from './editors/notesEditor';
import { DndHoverProvider } from './providers/hoverProvider';
import { PluginManagerProvider } from './views/pluginManager';

export function activate(context: vscode.ExtensionContext) {
	console.log('D&D Campaign Manager is now active!');

	// Register Custom Editors
	context.subscriptions.push(MapEditorProvider.register(context));
	context.subscriptions.push(CharacterSheetProvider.register(context));
	context.subscriptions.push(ItemEditorProvider.register(context));
    context.subscriptions.push(NotesEditorProvider.register(context));

    // Register Hover Provider
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            [{ scheme: 'file', language: 'dndnotes' }, { scheme: 'file', language: 'markdown' }],
            new DndHoverProvider()
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
}

export function deactivate() {}
