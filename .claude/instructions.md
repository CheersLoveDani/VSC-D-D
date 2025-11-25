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

## Version Management & Changelog

### CRITICAL: Always Update CHANGELOG.md
**Every time you make a meaningful change to the codebase, you MUST update the CHANGELOG.md file.**

Follow these rules:
1. **Add entries under `## [Unreleased]`** section as you work
2. **Categorize changes** using these sections (in order):
   - `### Added` - New features
   - `### Improved` - Enhancements to existing features
   - `### Fixed` - Bug fixes
   - `### Changed` - Refactoring or breaking changes
   - `### Deprecated` - Features being phased out
   - `### Removed` - Removed features
   - `### Security` - Security-related changes

3. **Write clear, user-facing descriptions**:
   - ✅ Good: "Fixed map view jumping when placing new pins in edit mode"
   - ❌ Bad: "Updated handleMouseDown function"
   - Use bullet points with descriptive text
   - Mention file types in backticks (e.g., `.dndmap`, `.dndchar`)
   - Group related changes together

4. **Update immediately** - Don't wait until release time

### Version Numbering (Semantic Versioning)
Current version is in `package.json` line 5.

**When to increment versions:**
- **Patch (0.0.X)** - Bug fixes, minor improvements, no new features
- **Minor (0.X.0)** - New features, backward compatible
- **Major (X.0.0)** - Breaking changes, major overhaul

**Process for releasing a new version:**
1. Move all `[Unreleased]` entries to a new version section
2. Add date: `## [0.0.4] - YYYY-MM-DD`
3. Update version in `package.json`
4. Update version comparison links at bottom of CHANGELOG.md
5. Commit with message: `chore: release v0.0.X`

### Example Workflow
```markdown
# When adding a feature:
1. Implement the feature
2. Immediately add to CHANGELOG.md under [Unreleased] > ### Added
3. Continue working

# When ready to release:
1. Review all [Unreleased] changes
2. Decide version number (patch/minor/major)
3. Move [Unreleased] to new version section with date
4. Update package.json version
5. Update changelog version links
```

## Notes
- The webview build only processes `tiptap-bundle.js`
- Other webview JS/CSS files (mapEditor, characterEditor, etc.) are used directly without bundling
- Always compile both TypeScript and webview after making changes
- **ALWAYS update CHANGELOG.md when making changes** - this is not optional!
