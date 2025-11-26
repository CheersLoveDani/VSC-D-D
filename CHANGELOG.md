# Change Log

All notable changes to the "CritCode" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


<!-- 
IMPORTANT: Always update this changelog when making changes!
Add entries under [Unreleased] section as you work.
Categories: Added, Improved, Fixed, Changed, Deprecated, Removed, Security
-->

## [Unreleased]

### Added

### Improved

### Fixed

### Changed


## [0.0.7] - 2025-11-26

### Added
- **Spell File Link Support**: `.dndspell` files are now fully supported in markdown links
  - Clickable links to spell files in notes and markdown documents
  - Hover previews showing spell details (name, level, school, components, duration, description)

### Improved
- **Editor Architecture Consolidation**: Refactored editors to share common functionality via base class
  - Moved `openFile()` method to `BaseCustomTextEditorProvider` for reuse across editors
  - Extracted duplicate `calcMod()` function in hover provider to single class method
  - Reduced code duplication between `MapEditorProvider` and `NotesEditorProvider`

### Fixed
- **Example Files**: Fixed incorrect relative path in example map pin link
  - Map pin link now correctly points to `./example.dndnotes` instead of `./examples/example.dndnotes`
- **Notes Link Persistence**: Fixed bugs with link persistence when switching between view and edit modes

### Removed
- **Dead Code Cleanup**: Removed unused code to reduce extension size and improve maintainability
  - Removed unimplemented `createCharacter` command from package.json
  - Removed unused `enableHoverPreviews` and `enableAutocomplete` configuration settings
  - Removed unused `getSpellsByLevel()`, `getSpellsByClass()`, `getAllSpellNames()` methods from CompendiumService
  - Removed unused `formatSpellForHover()` method (hover provider has its own implementation)
  - Made `safeParseJSON()` private (was exported but only used internally)

### Changed
- **License**: Updated from CC BY 4.0 to GPLv3

## [0.0.6] - 2025-11-26

### Added
- **Spell Editor (.dndspell)**: New custom editor for creating and editing spell cards
  - Full spell details: name, level, school, casting time, range, duration
  - Component tracking with material component descriptions
  - Ritual and concentration tags
  - Classes and "At Higher Levels" fields
  - Live preview card with D&D-styled formatting
- **Clickable Compendium References**: Click on `@spell[Name]`, `@monster[Name]`, or `@item[Name]` in notes to open as editable files
  - Clicking creates a new file with the compendium entry data
  - Spells open as `.dndspell`, monsters as `.dndstat`, items as `.dnditem`
  - Files are created in the workspace root for easy access
  - If the file already exists, it opens instead of creating a duplicate

### Improved
- **Example Files**: Setup files now include spell example (`example.dndspell`)
- **Instructions**: CRITCODE_INSTRUCTIONS.md updated with compendium documentation
- **Notes Example**: Example notes file demonstrates compendium reference syntax

## [0.0.5] - 2025-11-26

### Added
- **Compendium System**: Integrated D&D 5e spell, monster, and item database
  - Bundled SRD 5.1 data with 319 spells included out-of-the-box (free to distribute)
  - Import additional content from Fight Club 5e XML compendium files
  - New commands: `Import Compendium (XML)` and `Show Compendium Stats`
  - Compendium data persists across sessions via VSCode settings
- **Spell Autocomplete in Character Sheets**: Type in spell name fields to search and select from the compendium
  - Fuzzy search matching as you type
  - Dropdown shows spell name, level, and school
  - Keyboard navigation (Arrow keys, Enter, Escape)
- **Spell Tooltips in Character Sheets**: Hover over any spell name to see full details
  - Displays level, school, casting time, range, components, duration
  - Shows spell description with truncation for long text
  - Includes "At Higher Levels" information when available
  - Shows concentration and ritual tags
- **Compendium References in Notes**: Reference spells, monsters, and items in `.dndnotes` files
  - Syntax: `@spell[Fireball]`, `@monster[Goblin]`, `@item[Longsword]`
  - Hover over references in View mode to see full compendium entry details
  - New toolbar button "📖 Compendium" to search and insert references
  - Search dialog with type filter (All/Spells/Monsters/Items)
  - Works with both SRD data and imported compendium content
- **Compendium Settings**: New configuration options under `D&D Campaign Manager`
  - `dnd.compendium.enableHoverPreviews`: Toggle hover tooltips (default: true)
  - `dnd.compendium.enableAutocomplete`: Toggle autocomplete suggestions (default: true)
  - `dnd.compendium.importedPath`: Path to user's imported XML compendium

### Improved
- **Extension Architecture**: Added CompendiumService singleton for centralized data management
- **Hover Provider**: Extended to support compendium references alongside existing file link hovers

## [0.0.4] - 2025-11-25

### Added
- **Notes Editor Table Support**: Full table editing capabilities in the notes editor
  - Interactive table size picker in toolbar (up to 10x10 grid)
  - Table context menu with row/column operations (insert above/below, insert left/right, delete row/column/table)
  - D&D-styled tables with header styling, alternating row colors, and hover effects
  - Markdown table parsing and rendering in preview mode
  - Tables properly convert to/from markdown format

### Fixed
- **Notes Editor Undo/Redo**: Fixed issue where Ctrl+Z would only work once before "jittering" and getting stuck
  - Resolved feedback loop between TipTap editor and VSCode document sync that was resetting undo history
  - Added proper state tracking to prevent stale document updates from overwriting editor content during undo/redo operations

## [0.0.3] - 2025-11-25

### Added
- **Setup Files Command**: New "Create Setup Files" button in D&D Manager panel
  - Automatically generates example files for all D&D file types (`.dndchar`, `.dnditem`, `.dndmap`, `.dndnotes`, `.dndstat`)
  - Creates comprehensive `CRITCODE_INSTRUCTIONS.md` guide in workspace root
  - Generates examples in dedicated `examples` folder
- **Preview System**: Unified preview functionality across all editors
  - Hover over map pins to see linked file previews (characters, items, notes, maps)
  - Hover over links in notes editor to preview linked content
  - Smart preview extraction using first H1 header for notes files
  - Consistent preview styling and HTML structure across all file types
- **Map Editor Pin Interactions**:
  - Pin hover effects with smooth transitions in viewing mode
  - Pin enlargement on hover for better visibility
  - Preview popovers when hovering over pins

### Improved
- **Map Editor Stability**:
  - Fixed map view jumping when placing new pins in edit mode
  - Enabled left-click panning in edit mode
  - Improved popover positioning to prevent unexpected view shifts
  - Enhanced pin placement workflow
- **Notes Editor**:
  - Fixed image linking via context menu
  - Improved link persistence when switching between editor and view modes
  - Better handling of image markdown syntax in link dialog
- **UI/UX Redesign**:
  - Modernized extension UI with clean, premium aesthetic
  - Improved spacing, alignment, and visual hierarchy
  - Enhanced readability with crisp typography and soft shadows
  - Harmonious color palette for both light and dark themes
  - High contrast for better accessibility
  - Rounded geometry and smooth transitions throughout

### Fixed
- Map editor image loading and "Select Image" button functionality
- Plugin Manager toggle reliability for switching between plain text and custom editor modes
- `TypeError: 'isExtensible' on proxy` error when toggling plain text mode
- Image context menu "Add Link" option now correctly displays link dialog
- Map pin preview now correctly displays linked `.dndnotes` file content

### Changed
- Refactored preview system with shared backend utility (`src/utils/preview.ts`)
- Consolidated "Edit in Plain Text" functionality into centralized Plugin Manager panel
- Removed individual "Edit in text" options from editor pages
- Updated Plugin Manager with global toggle for plain text editing mode

## [0.0.1] - 2025-11-25

### Added
- Initial release of CritCode extension
- Map Editor (`.dndmap`) for creating and managing campaign maps
- Character Sheet Editor (`.dndchar`) for tracking character stats, inventory, and progression
- Item Database Editor (`.dnditem`) for cataloging items, weapons, and magical artifacts
- Campaign Notes Editor (`.dndnotes`) with rich text editing powered by TipTap
  - Markdown support
  - Tables, task lists, and typography enhancements
  - Image and link support
  - Highlighting, subscript, and superscript
- Stat Block Editor (`.dndstat`) for creating creature and NPC stat blocks
- Custom D&D theme for immersive editing experience
- D&D Manager view in activity bar with plugin manager
- Commands:
  - `D&D: Create New Map`
  - `D&D: Create New Character`
  - `Toggle Plain Text Mode` for direct JSON/text editing
- Custom file associations and syntax highlighting for `.dndnotes` files

### Features
- Custom editors for each D&D file type with tailored interfaces
- Integration with VS Code's activity bar for quick access
- Support for toggling between custom editor and plain text modes
- Rich text editing capabilities with TipTap extensions

[Unreleased]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.7...HEAD
[0.0.7]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.1...v0.0.3
[0.0.1]: https://github.com/CheersLoveDani/VSC-D-D/releases/tag/v0.0.1
