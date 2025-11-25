# Change Log

All notable changes to the "CritCode" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/yourusername/critcode/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/yourusername/critcode/releases/tag/v0.0.1
