# Change Log

All notable changes to the "CritCode" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


<!-- 
IMPORTANT: Always update this changelog when making changes!
Add entries under [Unreleased] section as you work.
Categories: Added, Improved, Fixed, Changed, Deprecated, Removed, Security
-->

## [0.1.1] - 2025-11-30

### Improved
- **Item Previews**: Enhanced `.dnditem` hover previews to show comprehensive details
  - Displays Rarity, Weight, Value, and Properties
  - Shows Damage dice and type for weapons
  - Shows AC and Dex bonus for armor
  - Includes Attunement requirements
- **Character Previews**: Enhanced `.dndchar` hover previews to show key character stats
  - Displays Race, Class, Level, Background, and Alignment
  - Shows AC, HP, Speed, and full Ability Scores (STR/DEX/etc.) with modifiers
- **Example Files**: Cleaned up `example.dndstat` to use the simplified string format for speed and standard stats object, matching the compendium format

## [0.1.0] - 2025-11-30

### Added
- **Web Extension Support**: Full support for running the extension in VS Code for Web
  - Added `package-web` and `run-web` scripts for building and testing web version
  - Configured webpack for webworker target with necessary polyfills
  - Added "Run Web Extension" launch configuration
- **Spell Previews**: Hover over `.dndspell` links to see spell details
  - Shows Level, School, Casting Time, Range, Components, Duration, and Description
  - Consistent styling with character sheet previews
- **Stat Block Previews**: Hover over `.dndstat` links to see monster stats
  - Shows AC, HP, Speed, Stats (STR/DEX/etc.), Alignment, and CR
  - Unified rendering for both linked files and compendium entries
- **Link Handling**: Improved link behavior in webviews
  - External links (http/https) now open in VS Code's Simple Browser (web) or default browser (desktop)
  - Internal D&D file links open in new VS Code editor tabs instead of replacing the current one

### Improved
- **Preview System**: Unified `preview.ts` utility to handle data extraction for all file types
- **Stat Block Data**: Normalized data handling for `.dndstat` files
  - Supports both string and object formats for `speed`
  - Supports both `stats` (short keys) and `abilityScores` (long keys) objects
  - Handles `ac` vs `armorClass` aliases

### Fixed
- **Webview Links**: Fixed links opening in new browser tabs instead of VS Code tabs in web version
- **Stat Previews**: Fixed blank previews for linked `.dndstat` files
- **Stat Schema**: Fixed "object Object" display for speed and missing stats in some monster files


## [0.0.11] - 2025-11-27

### Added
- **Weapons Section in Character Sheet**: New dedicated section for tracking equipped weapons
  - Weapon name input with autocomplete from SRD compendium (37 weapons) and custom `.dnditem` files
  - Auto-calculated attack bonus (Ability Modifier + Proficiency Bonus)
  - Auto-calculated damage bonus (Ability Modifier + Bonus Damage)
  - Damage dice and damage type fields auto-populate from compendium data
  - Stat selector (STR/DEX) with smart defaults for finesse and ranged weapons
  - Hover tooltip showing weapon details (damage, properties, range, description)
  - Open/Create button: blue arrow (→) to open existing weapon, green plus (+) to create new
  - Ctrl+Click on weapon name to open weapon file
  - Custom weapons marked with "★ Custom" badge in search results
- **Custom Weapon Support**: `.dnditem` weapon files in workspace integrated into weapon search
  - Weapon files with `type: "Weapon"` automatically loaded into compendium
  - Real-time file watching for weapon file changes
  - Custom weapons prioritized over SRD weapons in search results
- **Temporary Compendium Preview**: Clicking compendium entries now opens them as temporary files
  - Opens in custom editors (spell editor, stat block editor, item editor) with full UI
  - Temp files are automatically deleted when closed without saving
  - Use "Save As" to keep the file permanently in your workspace
  - Existing custom files still open normally (no temp file created)
- **TempFileService**: New service to manage temporary compendium file lifecycle
  - Creates temp files in system temp directory (`%TEMP%/vscode-dnd-compendium/`)
  - Automatic cleanup on file close and extension deactivation

### Improved

### Fixed

### Changed


## [0.0.10] - 2025-11-26

### Added
- **Custom Spell Support**: `.dndspell` files in workspace are now integrated into the compendium system
  - Custom spells appear in spell search autocomplete alongside SRD spells
  - Custom spells show "★ Custom" badge in search results to distinguish from compendium entries
  - Hover tooltips display "★ Custom Spell" indicator for user-created spells
  - Custom spells take priority over SRD spells with the same name (user data wins)
- **Real-time Spell File Watching**: Custom spells automatically reload when files change
  - File watcher monitors `.dndspell` files for create/modify/delete events
  - Changes to spell files immediately reflect in search and hover previews
  - No extension restart required when adding or editing custom spells
- **Spell File Navigation**: Click-to-open functionality for spell entries in character sheets
  - Ctrl+Click (Cmd+Click on Mac) on any spell name to open its `.dndspell` file
  - Dynamic button next to each spell entry with contextual icons:
    - Blue arrow (→) for spells that exist in compendium or custom files (opens file)
    - Green plus (+) for new spells not in compendium (creates new file)
    - Disabled state when no spell name is entered
  - If the spell file doesn't exist, it's automatically created with compendium data or a blank template
  - New spells are created with the correct level pre-filled

### Improved
- **Spell Search**: Enhanced to include both SRD compendium and custom workspace spells
  - Custom spells appear first in search results
  - Unified search experience across all spell sources
- **Character Editor Spell Fields**: Now supports custom spells with full hover previews
  - Autocomplete shows custom spells with visual indicator
  - Hover over spell names to see full details including custom spell indicator
  - Spell input fields highlight on hover to indicate click-to-open functionality
- **Notes Editor Compendium Search**: Custom spells now appear with "★ Custom" badge
- **Compendium Stats**: `getStats()` now reports custom spell count separately

### Fixed
- **Spell Button Icon**: Fixed contextual spell button not showing green "+" for non-compendium spells
  - `requestSpellInfo` callback now properly returns `null` for spells not in compendium
  - Button correctly updates to show create icon when typing a new spell name

## [0.0.9] - 2025-11-26

### Added
- **SRD Monsters Database**: Bundled 328 SRD 5e monsters for compendium
  - Monsters fetched from D&D 5e API and normalized to consistent format
  - Includes full stat blocks: ability scores, saves, skills, traits, actions, reactions, legendary actions
  - Auto-calculated XP and proficiency bonus from CR

### Improved
- **Monster Interface**: Unified Monster interface for cross-compatibility between SRD, XML compendium, and custom `.dndstat` files
  - All monster data now uses the same comprehensive interface
  - Fields: `ac`, `hp`, `hitDice`, `speed`, `stats`, `saves`, `skills`, damage/condition immunities
  - Traits, actions, reactions, and legendary actions with name/description structure
  - Removed separate `StatBlockData` interface to eliminate data conversion
- **Stat Block Editor**: Completely rewritten to use Monster interface directly
  - Displays all D&D 5e monster fields: saves, skills, damage vulnerabilities/resistances/immunities, condition immunities
  - Traits, actions, reactions, and legendary actions sections with add/remove functionality
  - Auto-migration from old editor format (abilityScores, armorClass, hitPoints) to new format
  - Auto-calculates XP when CR changes
- **XML Compendium Import**: Enhanced Fight Club 5e XML parsing for monsters
  - Parses all monster fields including saves, skills, damage/condition immunities
  - Extracts traits, actions, reactions, and legendary actions from XML
  - SRD monsters now take priority over XML imports to preserve higher-quality data
- **Compendium Click-to-Open**: Monster files created from compendium now include all monster properties

### Fixed
- **Newline Preservation**: Fixed trait/action descriptions losing newlines when displayed
  - Newlines in descriptions (like numbered lists in Beholder's Eye Rays) now render properly with `<br>` tags
  - Editing descriptions preserves newlines when saving back to file

## [0.0.8] - 2025-11-26

### Added
- **Enhanced Item Editor**: Completely redesigned item editor with comprehensive D&D item support
  - Full weapon stats: damage dice, damage type, two-handed damage, range, properties
  - Full armor stats: base AC, Dex bonus, max Dex bonus, strength requirement, stealth disadvantage
  - Item properties: magic item flag, attunement requirement, rarity, weight, value
  - Live preview card with D&D-styled formatting
  - Dynamic form sections that show/hide based on item type
- **SRD Items Database**: Bundled 599 SRD 5e items (equipment + magic items) for compendium
  - Items fetched from D&D 5e API and normalized to consistent format
  - Includes weapons, armor, adventuring gear, and magic items

### Improved
- **Item Interface**: Expanded Item interface with full D&D 5e item properties
  - Added: `subtype`, `magic`, `attunement`, `attunementRequirement`, `weight`, `value`
  - Added: `damage` object (dice, type, twoHanded)
  - Added: `armorClass` object (base, dexBonus, maxBonus)
  - Added: `stealthDisadvantage`, `strengthRequirement`
  - Added: `properties` array, `range` object (normal, long)
- **XML Compendium Import**: Enhanced Fight Club 5e XML parsing for items
  - Added comprehensive item type mapping (M, R, A, LA, MA, HA, S, W, WD, RD, ST, RG, P, SC, G)
  - Added damage type abbreviation mapping (S, P, B, F, C, L, N, R, T, A, FC, PS, PY)
  - Added weapon property abbreviation mapping (A, F, H, L, LD, R, S, T, 2H, V, M)
  - Added stealth disadvantage and strength requirement parsing from XML
  - SRD items now take priority over XML imports to preserve higher-quality data
  - Fallback damage extraction from `<roll>` tags when `<dmg1>` is not present
- **Compendium Click-to-Open**: Item files created from compendium now include all item properties

### Fixed
- **Item Properties Display**: Fixed properties array displaying incorrectly in editor (now shows as comma-separated string)
- **XML Type Mapping**: Fixed XML items showing abbreviated types (e.g., "M" instead of "Weapon")

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

[Unreleased]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.11...HEAD
[0.0.11]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.10...v0.0.11
[0.0.10]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.9...v0.0.10
[0.0.9]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.8...v0.0.9
[0.0.8]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.7...v0.0.8
[0.0.7]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.1...v0.0.3
[0.0.1]: https://github.com/CheersLoveDani/VSC-D-D/releases/tag/v0.0.1
