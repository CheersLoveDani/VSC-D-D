---
description: Compile TypeScript after making changes
---

# Compile Extension

After making changes to TypeScript files in `src/`, you need to compile them to JavaScript.

## Steps

// turbo
1. Run the TypeScript compiler:
```
node node_modules/typescript/bin/tsc -p .
```

// turbo
2. Reload the VS Code window to load the new code:
   - Press `Ctrl+Shift+P`
   - Type "Developer: Reload Window"
   - Press Enter

## Notes

- The `pnpm run watch` task should auto-compile, but if it's not working, use the manual compile command above
- Always reload the VS Code window after compiling to load the new extension code
- The compiled JavaScript files are in the `out/` directory
