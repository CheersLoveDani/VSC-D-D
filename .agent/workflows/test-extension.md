---
description: Test the VS Code extension
---

# Testing the VS Code Extension

Follow these steps to test the extension in Visual Studio Code:

## Option 1: Using F5 (Recommended)

1. Open VS Code with this workspace
2. Press **F5** or go to Run → Start Debugging
3. Select "Run Extension" from the dropdown
4. A new Extension Development Host window will open with the extension loaded
5. Test the extension features:
   - Create a `.dndchar` file to test Character Editor
   - Create a `.dndmap` file to test Map Editor
   - Create a `.dnditem` file to test Item Database
   - Create a `.dndnotes` file to test Notes Editor
   - Create a `.dndstat` file to test Stat Block Editor
   - Create a `.dndspell` file to test Spell Editor

## Option 2: Compile and Watch

// turbo
1. Compile the extension:
```bash
cd packages/vscode-extension
pnpm compile
```

// turbo
2. Watch for changes (keeps running):
```bash
cd packages/vscode-extension
pnpm watch
```

3. Then press F5 to launch the Extension Development Host

## Creating Test Files

You can use the command palette (Ctrl+Shift+P) and search for "D&D" to see available commands, or create the "Create Setup Files" command to generate example files.

## Debugging

- View extension logs in the Debug Console
- Reload the Extension Development Host with **Ctrl+R** after making changes
- Check for errors in the Developer Tools (Help → Toggle Developer Tools)
