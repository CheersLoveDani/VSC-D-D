"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const mapEditor_1 = require("./editors/mapEditor");
const characterEditor_1 = require("./editors/characterEditor");
const itemEditor_1 = require("./editors/itemEditor");
const hoverProvider_1 = require("./providers/hoverProvider");
function activate(context) {
    console.log('D&D Campaign Manager is now active!');
    // Register Custom Editors
    context.subscriptions.push(mapEditor_1.MapEditorProvider.register(context));
    context.subscriptions.push(characterEditor_1.CharacterSheetProvider.register(context));
    context.subscriptions.push(itemEditor_1.ItemEditorProvider.register(context));
    // Register Hover Provider
    const hoverProvider = new hoverProvider_1.DndHoverProvider();
    context.subscriptions.push(vscode.languages.registerHoverProvider(['markdown', 'dndnotes'], hoverProvider));
    // Register Commands
    context.subscriptions.push(vscode.commands.registerCommand('dnd-campaign-manager.createMap', () => {
        vscode.window.showInformationMessage('Create Map command triggered');
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map