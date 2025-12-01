# Claude Notes

Project-specific notes and conventions for Claude Code.

## Versioning Convention

This project uses **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

- **PATCH (0.0.X)** — Bug fixes, small tweaks that don't change the API
  - Fix a typo, patch a bug, performance improvement
  - Backward compatible

- **MINOR (0.X.0)** — New features that are backward compatible
  - Add a new function, new optional parameter, new command
  - Existing code still works

- **MAJOR (X.0.0)** — Breaking changes
  - Rename a function, remove a feature, change how something fundamentally works
  - Existing code may break
