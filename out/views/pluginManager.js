"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManagerProvider = void 0;
const vscode = require("vscode");
class PluginManagerProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        const isPlainText = this.context.globalState.get('dnd-campaign-manager.plainTextMode', false);
        return Promise.resolve([
            new PluginItem('Edit in Plain Text', isPlainText ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.None, isPlainText ? 'check' : 'circle-slash', {
                command: 'dnd-campaign-manager.togglePlainText',
                title: 'Toggle Plain Text Mode',
                arguments: []
            }, isPlainText ? 'Enabled: Files will open as JSON' : 'Disabled: Files will open with Custom Editors')
        ]);
    }
    async togglePlainTextMode() {
        try {
            const currentState = this.context.globalState.get('dnd-campaign-manager.plainTextMode', false);
            const newState = !currentState;
            console.log(`[PluginManager] Starting toggle: ${currentState} -> ${newState}`);
            // Save currently open editors
            const openEditors = vscode.window.tabGroups.all.flatMap(group => group.tabs.map(tab => tab.input?.uri).filter((uri) => uri));
            console.log(`[PluginManager] Saved ${openEditors.length} open editors`);
            // Update global state
            await this.context.globalState.update('dnd-campaign-manager.plainTextMode', newState);
            console.log(`[PluginManager] Global state updated`);
            // Update workbench.editorAssociations
            const config = vscode.workspace.getConfiguration();
            const currentAssociations = config.get('workbench.editorAssociations') || {};
            console.log('[PluginManager] Current associations before update:', JSON.stringify(currentAssociations));
            // Create a new object (shallow copy) to avoid proxy issues
            const associations = { ...currentAssociations };
            if (newState) {
                // Enable Plain Text Mode: Associate files with default text editor
                associations['*.dndchar'] = 'default';
                associations['*.dnditem'] = 'default';
                associations['*.dndmap'] = 'default';
                associations['*.dndnotes'] = 'default';
                console.log('[PluginManager] Setting associations to default');
            }
            else {
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
                        await vscode.window.showTextDocument(uri, { preview: false, preserveFocus: true });
                    }
                    else {
                        // Opening in custom editor mode - explicitly specify the editor based on file extension
                        const uriObj = uri;
                        const extension = uriObj.path.split('.').pop()?.toLowerCase();
                        let editorId;
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
                        }
                        else {
                            // Fallback to default for non-DND files
                            await vscode.window.showTextDocument(uriObj, { preview: false, preserveFocus: true });
                        }
                    }
                }
                catch (err) {
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
        }
        catch (error) {
            console.error('[PluginManager] Error toggling plain text mode:', error);
            vscode.window.showErrorMessage(`Failed to toggle plain text mode: ${error}`);
        }
    }
}
exports.PluginManagerProvider = PluginManagerProvider;
class PluginItem extends vscode.TreeItem {
    constructor(label, collapsibleState, iconName, command, description) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.tooltip = `${this.label}`;
        this.description = description;
        this.iconPath = new vscode.ThemeIcon(iconName);
        this.command = command;
    }
}
//# sourceMappingURL=pluginManager.js.map