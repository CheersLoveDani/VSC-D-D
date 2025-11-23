import * as vscode from 'vscode';
import { MapEditorProvider } from './editors/mapEditor';
import { CharacterSheetProvider } from './editors/characterEditor';
import { ItemEditorProvider } from './editors/itemEditor';
import { DndHoverProvider } from './providers/hoverProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('D&D Campaign Manager is now active!');

	// Register Custom Editors
	context.subscriptions.push(MapEditorProvider.register(context));
	context.subscriptions.push(CharacterSheetProvider.register(context));
	context.subscriptions.push(ItemEditorProvider.register(context));

    // Register Hover Provider
    const hoverProvider = new DndHoverProvider();
    context.subscriptions.push(vscode.languages.registerHoverProvider(['markdown', 'dndnotes'], hoverProvider));

    
    // Register Commands
    context.subscriptions.push(vscode.commands.registerCommand('dnd-campaign-manager.createMap', () => {
        vscode.window.showInformationMessage('Create Map command triggered');
    }));
}

export function deactivate() {}
