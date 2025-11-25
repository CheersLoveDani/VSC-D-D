---
description: Update changelog when making changes
---

# Changelog Update Workflow

**CRITICAL: Run this workflow EVERY TIME you make a meaningful change to the codebase.**

## Quick Steps

// turbo-all
1. **Open CHANGELOG.md**
   - File location: `e:\development\VSC-D&D\CHANGELOG.md`

2. **Add your change under `## [Unreleased]`**
   - Choose the appropriate category:
     - `### Added` - New features
     - `### Improved` - Enhancements
     - `### Fixed` - Bug fixes
     - `### Changed` - Refactoring/breaking changes
     - `### Deprecated` - Features being phased out
     - `### Removed` - Deleted features
     - `### Security` - Security updates

3. **Write a clear, user-facing description**
   - ✅ Good: "Added hover previews for map pins showing linked file content"
   - ❌ Bad: "Updated mapEditor.js handleMouseOver function"
   - Use bullet points
   - Mention file types in backticks (`.dndmap`, `.dndchar`, etc.)

## Examples

### Adding a Feature
```markdown
### Added
- **Map Pin Tooltips**: Hovering over pins now shows a preview of linked files
- Support for `.dndquest` files for tracking campaign quests
```

### Fixing a Bug
```markdown
### Fixed
- Map editor no longer crashes when selecting images larger than 10MB
- Character sheet HP calculation now correctly applies constitution modifier
```

### Improving Existing Features
```markdown
### Improved
- Notes editor now auto-saves every 30 seconds instead of 60
- Reduced memory usage in map editor by 40%
```

## When NOT to Update Changelog
- Typo fixes in comments
- Code formatting changes
- Internal refactoring with no user-facing impact
- Documentation updates (unless it's user-facing docs)

## Remember
- Update IMMEDIATELY after making the change
- Don't wait until release time
- Keep descriptions concise but informative
- Group related changes together
