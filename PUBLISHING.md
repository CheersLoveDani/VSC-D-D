# Publishing Guide for CritCode

This guide will help you publish the CritCode extension to the VS Code Marketplace.

## Pre-Publishing Checklist

All items below have been completed and are ready for publishing:

- [x] README.md created with comprehensive documentation
- [x] LICENSE file added (CC BY 4.0 License)
- [x] CHANGELOG.md documenting the initial release
- [x] .vscodeignore file to exclude unnecessary files from package
- [x] package.json updated with required metadata
- [x] All media assets verified (d20-icon.svg exists)
- [x] Build scripts tested and working
- [x] TypeScript compilation successful

## Actions Required Before Publishing

You need to complete these manual steps before publishing:

### 1. Create Extension Icon (icon.png)

The package.json references `icon.png` but this file needs to be created:

- Create a 128x128 PNG image for the marketplace icon
- You can convert the existing [media/d20-icon.svg](media/d20-icon.svg) to PNG
- Save it as `icon.png` in the root directory
- **Online converters**: Use https://convertio.co/svg-png/ or similar
- **Alternative**: Use an image editor like GIMP, Photoshop, or Inkscape

### 2. Update package.json with Your Information

Edit [package.json](package.json) and replace these placeholders:

```json
"publisher": "your-publisher-name",  // Replace with your VS Code publisher ID
"author": {
  "name": "Your Name"  // Replace with your actual name
},
"repository": {
  "url": "https://github.com/yourusername/critcode"  // Update with actual repo
},
"bugs": {
  "url": "https://github.com/yourusername/critcode/issues"
},
"homepage": "https://github.com/yourusername/critcode#readme"
```

### 3. Create a Publisher Account

If you don't have a publisher account:

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft/GitHub account
3. Create a new publisher
4. Note your publisher ID and update package.json

### 4. Install vsce (VS Code Extension Manager)

```bash
npm install -g @vscode/vsce
```

### 5. Add Screenshots (Optional but Recommended)

Create a `screenshots` or `images` folder and add:
- Screenshots of the Map Editor
- Screenshots of the Character Sheet
- Screenshots of the Item Database
- Screenshots of the Notes Editor
- Screenshots of the Stat Block Editor

Then reference them in README.md to make the marketplace listing more attractive.

### 6. Set Up Git Repository (if not already done)

```bash
git init
git add .
git commit -m "Initial commit: CritCode v0.0.1"
git remote add origin https://github.com/yourusername/critcode.git
git push -u origin main
```

## Publishing Steps

Once all the above is complete:

### 1. Create a Personal Access Token

1. Go to https://dev.azure.com/
2. Create a new Personal Access Token with **Marketplace (Manage)** scope
3. Save the token securely

### 2. Login to vsce

```bash
vsce login <your-publisher-name>
```

Enter your Personal Access Token when prompted.

### 3. Package the Extension (Test)

```bash
npm run package
```

This creates a `.vsix` file you can test locally by:
- Opening VS Code
- Going to Extensions view
- Click "..." menu → "Install from VSIX..."
- Select the generated `.vsix` file

### 4. Publish to Marketplace

```bash
vsce publish
```

Or publish a specific version:

```bash
vsce publish minor  # Increments to 0.1.0
vsce publish patch  # Increments to 0.0.2
```

## Post-Publishing

After publishing:

1. Verify the extension appears at: https://marketplace.visualstudio.com/items?itemName=<publisher>.<extension-name>
2. Test installation from the marketplace
3. Monitor the issue tracker for user feedback
4. Update CHANGELOG.md for future releases

## Updating the Extension

For future updates:

1. Make your changes
2. Update version in package.json
3. Update CHANGELOG.md
4. Run `npm run vscode:prepublish` to test
5. Run `vsce publish` to publish the update

## Resources

- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Current Build Status

✅ TypeScript compilation: **PASSING**
✅ Webview build: **PASSING**
✅ All required files: **PRESENT**

The extension is ready for packaging once you complete the manual steps above!
