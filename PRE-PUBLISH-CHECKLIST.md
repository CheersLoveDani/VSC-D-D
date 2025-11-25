# Pre-Publish Checklist for CritCode

Quick checklist before publishing to VS Code Marketplace.

## ✅ Completed Items

- [x] README.md with features, installation, and usage instructions
- [x] LICENSE file (CC BY 4.0)
- [x] CHANGELOG.md documenting v0.0.1
- [x] .vscodeignore to exclude dev files
- [x] package.json metadata (keywords, categories, etc.)
- [x] Build scripts working (TypeScript + webview)
- [x] All source files compiled successfully
- [x] Media assets present (d20-icon.svg)

## ⚠️ Manual Steps Required

### CRITICAL - Must Do Before Publishing:

1. **Create icon.png**
   - [ ] Convert [media/d20-icon.svg](media/d20-icon.svg) to 128x128 PNG
   - [ ] Save as `icon.png` in root directory
   - Use: https://convertio.co/svg-png/ or image editor

2. **Update package.json**
   - [ ] Replace `"publisher": "your-publisher-name"` with actual publisher ID
   - [ ] Replace `"name": "Your Name"` in author section
   - [ ] Update repository URLs (replace `yourusername`)
   - [ ] Update bugs and homepage URLs

3. **Create Publisher Account** (if needed)
   - [ ] Go to https://marketplace.visualstudio.com/manage
   - [ ] Sign in and create publisher
   - [ ] Note your publisher ID

4. **Install vsce**
   ```bash
   npm install -g @vscode/vsce
   ```

### OPTIONAL - Recommended for Better Marketplace Presence:

5. **Add Screenshots**
   - [ ] Create screenshots folder
   - [ ] Capture Map Editor screenshot
   - [ ] Capture Character Sheet screenshot
   - [ ] Capture Item Database screenshot
   - [ ] Capture Notes Editor screenshot
   - [ ] Capture Stat Block Editor screenshot
   - [ ] Add to README.md

6. **Set Up Git Repository**
   - [ ] Initialize git if not already done
   - [ ] Push to GitHub/GitLab
   - [ ] Update URLs in package.json

## 🚀 Publishing Commands

After completing the above:

```bash
# Test package locally
npm run package

# Publish to marketplace
vsce publish
```

See [PUBLISHING.md](PUBLISHING.md) for detailed instructions.
