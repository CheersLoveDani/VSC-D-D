# Planned Features

This document outlines planned features for VSC-D&D, organized by priority.

---

## Priority: Medium (Future Additions)

### Templates System
A system to quickly create new files based on user-defined templates.
- "Create NPC" fills in default fields automatically
- "Create Monster" with pre-populated stat block structure
- Custom template creation and management
- Template variables (e.g., `{{name}}`, `{{date}}`)

### Enhanced Linking & Backlinks
Robust wiki-link support across all custom editors.
- `[[Link]]` syntax support in all editor types
- **Backlinks View**: Sidebar panel showing what references the current file
- Auto-completion for link targets
- Broken link detection and warnings

### Graph View
Visual representation of campaign connections.
- Interactive node graph showing file relationships
- Library options: `force-graph` or `cytoscape.js` in a webview
- Filter by file type (NPCs, Locations, Items, etc.)
- Click-to-navigate functionality
- Zoom and pan controls

### Campaign Dashboard / "Dataview" Lite
Dynamic campaign overview page with filtering capabilities.
- GUI-based filters (no query language required)
- Example queries:
  - "All Level 5+ NPCs"
  - "All items of Rare or higher rarity"
  - "Locations in Region X"
- Sortable results
- Quick navigation to filtered results

### Shop File Type
~~New `.shop` file type for merchant inventories.~~ (Complete)
- ~~Item slots with gold amounts displayed~~ (Complete)
- ~~Spell book slots (for spell-selling merchants)~~ (Complete)
- ~~Hover previews for quick item/spell inspection~~ (Complete)
- **Stretch Goal**: Shop generator with options:
  - Item/spell type filters
  - Rarity/level range settings
  - Random inventory generation

### Change Extension Naming Conventions
- `.dndstat` -> `.ccstat`
- `.dnditem` -> `.ccitem`
- `.dndspell` -> `.ccspell`
- `.dndshop` -> `.ccshop`
- `.dndmap` -> `.ccmap`
- `.dndnote` -> `.ccnote`
- Keep the old extensions for now, but add a panel tool to convert them to the new extensions.
- Add warning that the old extensions will be removed in a future version.

---

## Priority: Low (Later Down the Line)

### Calendar System
Simple calendar view for tracking campaign time.
- Custom calendar support (fantasy calendars)
- Event tracking and notes per day
- Session date markers
- Time passage tracking between sessions

### Initiative Tracker
Combat management panel.
- Sidebar view or dedicated panel
- Integration with Stat Blocks for quick HP/AC reference
- Turn order management
- Condition tracking
- Round counter

### Additional File Types
Expand compendium coverage with new file types:
- **Class** (`.class`) - Character class definitions
- **Race** (`.race`) - Playable race definitions
- **Feat** (`.feat`) - Feat definitions
- Alignment with SRD/compendium data structure

---

## Priority: Back Burner

### Full Character Builder
Comprehensive character creation and management system.
- Integration with compendium/SRD data
- Support for custom homebrew content
- Automated character sheet generation
- Level-up management with:
  - Ability score improvements
  - Feature/spell selection
  - Hit point calculations
- Export to standard character sheet formats

---

## Notes

- Features may shift between priority tiers based on user feedback and development capacity
- Community contributions welcome for any feature tier
- See [CHANGELOG.md](CHANGELOG.md) for completed features
