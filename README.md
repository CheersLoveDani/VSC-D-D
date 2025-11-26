# CritCode

A comprehensive Visual Studio Code extension for planning and managing your Dungeons & Dragons campaigns. Create interactive maps, character sheets, item databases, campaign notes, and stat blocks all within your favorite code editor.

## Features

### Custom File Types and Editors

This extension provides specialized editors for different aspects of your D&D campaign:

- **Map Editor (`.dndmap`)** - Create and manage campaign maps with interactive elements
- **Character Sheet (`.dndchar`)** - Track character stats, inventory, abilities, and progression
- **Item Database (`.dnditem`)** - Organize and catalog items, weapons, and magical artifacts
- **Campaign Notes (`.dndnotes`)** - Rich text editor for campaign notes with markdown support
- **Stat Blocks (`.dndstat`)** - Create and manage creature and NPC stat blocks
- **Spell Editor (`.dndspell`)** - Create custom spell cards with full D&D spell details

### Rich Text Editing

The notes editor is powered by TipTap and includes:

- Full markdown support
- Tables, task lists, and typography enhancements
- Images and links
- Highlighting, subscript, and superscript
- Custom D&D theme for immersive editing

### D&D 5e Compendium Integration

CritCode includes a built-in compendium system with 319 SRD 5.1 spells:

- **Spell Autocomplete**: Type in spell fields on character sheets to search and select spells
- **Spell Tooltips**: Hover over spell names to see full details (level, school, components, description, etc.)
- **Import Additional Content**: Import Fight Club 5e XML compendium files for monsters, items, and non-SRD spells
- **Reference in Notes**: Use `@spell[Fireball]`, `@monster[Goblin]`, or `@item[Longsword]` syntax in notes to create hoverable references

### Activity Bar Integration

Access all your D&D campaign files quickly through the dedicated D&D Manager view in the activity bar.

## Installation

### From VS Code Marketplace

1. Open Visual Studio Code
2. Go to the Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "CritCode"
4. Click Install

### From VSIX

1. Download the `.vsix` file from the releases page
2. Open VS Code
3. Go to Extensions view
4. Click the `...` menu at the top of the Extensions view
5. Select "Install from VSIX..."
6. Choose the downloaded `.vsix` file

## Usage

### Creating New Files

Use the command palette (Ctrl+Shift+P / Cmd+Shift+P) to create new files:

- `D&D: Create New Map` - Create a new `.dndmap` file
- `D&D: Create New Character` - Create a new `.dndchar` file

Or simply create files with the appropriate extensions:
- `.dndmap` for maps
- `.dndchar` for character sheets
- `.dnditem` for item databases
- `.dndnotes` for campaign notes
- `.dndstat` for stat blocks

### Working with the Editors

Each custom editor provides an intuitive interface tailored for its specific purpose:

- **Maps**: Add locations, NPCs, and story elements to your campaign world
- **Characters**: Track stats, inventory, spells, and character progression
- **Items**: Catalog weapons, armor, magical items with full descriptions
- **Notes**: Write campaign narratives, session recaps, and world-building details
- **Stat Blocks**: Create creature and NPC statistics in the classic D&D format

### Plain Text Mode

You can toggle between the custom editor and plain text mode using:
- Command: `Toggle Plain Text Mode` (from D&D Manager category)

This allows you to edit the underlying JSON/text directly if needed.

## Requirements

- Visual Studio Code version 1.80.0 or higher

## Extension Settings

This extension contributes the following settings:

- Custom file associations for `.dndmap`, `.dndchar`, `.dnditem`, `.dndnotes`, and `.dndstat` files
- D&D Manager view in the activity bar

### Compendium Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `dnd.compendium.enableHoverPreviews` | `true` | Show spell/item details when hovering over names |
| `dnd.compendium.enableAutocomplete` | `true` | Enable autocomplete suggestions for spells and items |
| `dnd.compendium.importedPath` | `""` | Path to an imported XML compendium file (Fight Club 5e format) |

### Importing a Compendium

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run `D&D Manager: Import Compendium (XML)`
3. Select your Fight Club 5e XML compendium file
4. The extension will import all spells, monsters, and items

To check your compendium stats, run `D&D Manager: Show Compendium Stats`

## Known Issues

Please report issues on the [GitHub repository](https://github.com/yourusername/critcode/issues).

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

### 0.0.6

- New Spell Editor (`.dndspell`) for creating custom spell cards
- Clickable compendium references - click to open as editable files
- Updated example files with spell demonstration

### 0.0.5

- D&D 5e Compendium integration with 319 bundled SRD spells
- Spell autocomplete and tooltips in character sheets
- Compendium references in notes (`@spell[Name]`, `@monster[Name]`, `@item[Name]`)
- Import Fight Club 5e XML compendium files

### 0.0.4

- Table support in notes editor
- Fixed undo/redo in notes editor

### 0.0.3

- Setup files command for quick start
- Preview system for linked files
- UI/UX improvements

### 0.0.1

Initial release with support for:
- Map Editor
- Character Sheet Editor
- Item Database Editor
- Campaign Notes Editor with rich text support
- Stat Block Editor
- D&D themed syntax and styling

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the Creative Commons Attribution 4.0 International License (CC BY 4.0). See [LICENSE](LICENSE) for details.

This means you are free to use, share, and adapt this extension, even commercially, as long as you give appropriate credit.

## Acknowledgments

- Built with [TipTap](https://tiptap.dev/) for rich text editing
- D&D is a trademark of Wizards of the Coast

---

**Enjoy planning your epic D&D campaigns!**
