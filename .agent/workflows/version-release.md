---
description: Release a new version of the extension
---

# Version Release Workflow

Follow these steps when releasing a new version:

## 1. Review Unreleased Changes
- Open `CHANGELOG.md`
- Review all entries under `## [Unreleased]`
- Ensure all recent changes are documented

## 2. Determine Version Number
Use Semantic Versioning (MAJOR.MINOR.PATCH):
- **Patch (0.0.X)**: Bug fixes only, no new features
- **Minor (0.X.0)**: New features, backward compatible
- **Major (X.0.0)**: Breaking changes

## 3. Update CHANGELOG.md
- Change `## [Unreleased]` section to `## [0.0.X] - YYYY-MM-DD`
- Add a new empty `## [Unreleased]` section at the top
- Update version comparison links at the bottom:
  ```markdown
  [Unreleased]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.X...HEAD
  [0.0.X]: https://github.com/CheersLoveDani/VSC-D-D/compare/v0.0.Y...v0.0.X
  ```

## 4. Update package.json
- Change `"version"` field (line 5) to match new version
- Example: `"version": "0.0.4"`

// turbo
5. Compile the extension
```bash
cd "e:\development\VSC-D&D" && node "node_modules/typescript/bin/tsc" -p ./ && node build-webview.js
```

## 6. Test the Extension
- Press F5 to launch Extension Development Host
- Verify all features work correctly
- Test new features specifically

## 7. Commit and Tag
```bash
git add CHANGELOG.md package.json
git commit -m "chore: release v0.0.X"
git tag v0.0.X
git push origin main --tags
```

## 8. Package Extension (Optional)
If publishing to marketplace:
```bash
pnpm run package
```

---

## Quick Reference: What Goes in CHANGELOG

### Added
- New features, commands, editors, or functionality

### Improved
- Enhancements to existing features
- Performance improvements
- Better UX/UI

### Fixed
- Bug fixes
- Error corrections

### Changed
- Refactoring
- Breaking changes
- Architectural changes

### Deprecated
- Features being phased out

### Removed
- Deleted features or functionality

### Security
- Security patches or improvements
