# VSC-D&D Project Instructions

## Project Overview
This is a VS Code extension for managing D&D campaigns with custom editors for:
- Maps (`.dndmap`)
- Character Sheets (`.dndchar`)
- Items (`.dnditem`)
- Notes (`.dndnotes`)
- Stat Blocks (`.dndstat`) - Monster Manual style stat blocks

## How to Compile

Due to PATH configuration issues, use the following commands:

### Compile TypeScript
```bash
cd "e:\development\VSC-D&D"
node "node_modules/typescript/bin/tsc" -p ./
```

### Build Webview Bundle
```bash
cd "e:\development\VSC-D&D"
node build-webview.js
```

### Full Build (Both Steps)
```bash
cd "e:\development\VSC-D&D" && node "node_modules/typescript/bin/tsc" -p ./ && node build-webview.js
```

## Project Structure

```
e:\development\VSC-D&D\
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── editors/              # Custom editor providers
│   │   ├── mapEditor.ts
│   │   ├── characterEditor.ts
│   │   ├── itemEditor.ts
│   │   ├── notesEditor.ts
│   │   └── statBlockEditor.ts
│   ├── providers/            # Language providers
│   │   └── hoverProvider.ts
│   └── views/                # Tree view providers
│       └── pluginManager.ts
├── media/                    # Webview assets (JS/CSS)
│   ├── mapEditor.js/css
│   ├── characterEditor.js/css
│   ├── itemEditor.js/css
│   ├── notesEditor.js/css
│   ├── statBlockEditor.js/css
│   └── tiptap-bundle.js
├── out/                      # Compiled TypeScript output
├── package.json              # Extension manifest
└── tsconfig.json            # TypeScript config
```

## Development Workflow

1. Make changes to TypeScript files in `src/`
2. Make changes to webview files in `media/`
3. Run compilation commands above
4. Press F5 in VS Code to launch Extension Development Host
5. Test changes in the new window

## Custom Editors

### Stat Block Editor (`.dndstat`)
- JSON-based storage
- Classic D&D Monster Manual styling
- Inline editing for all fields
- Automatic ability modifier calculation
- Add/edit traits, actions, reactions, legendary actions

## Notes
- The webview build only processes `tiptap-bundle.js`
- Other webview JS/CSS files (mapEditor, characterEditor, etc.) are used directly without bundling
- Always compile both TypeScript and webview after making changes
