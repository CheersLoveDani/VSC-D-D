---
description: Run the Tauri desktop app
---

# Running the Tauri Desktop App

Follow these steps to run the CritCode Tauri desktop application:

## Development Mode

// turbo
1. Navigate to the Tauri app directory and run:
```bash
cd packages/tauri-app
pnpm tauri dev
```

This will:
- Start the Vite dev server on http://localhost:1422
- Compile Rust code (first time takes 5-10 minutes)
- Launch the Tauri desktop app window
- Enable hot-reload for frontend changes

**Note**: The first build will take several minutes to download and compile Rust dependencies.

## Frontend Only (UI Development)

// turbo-all
If you only want to work on the UI without the Tauri window:

```bash
cd packages/tauri-app
pnpm dev
```

Then open http://localhost:1420 in your browser.

## Production Build

To create a production build:

```bash
cd packages/tauri-app
pnpm tauri build
```

The installer will be created in `packages/tauri-app/src-tauri/target/release/bundle/`

## Troubleshooting

### Plugin Initialization Errors

If you see errors about plugin initialization, check:
1. `src-tauri/tauri.conf.json` - ensure all plugins are properly configured
2. `src-tauri/Cargo.toml` - verify all plugin dependencies are listed
3. `src-tauri/src/lib.rs` - check plugin initialization order

### Rust Compilation Issues

- Make sure you have Rust installed: https://rustup.rs/
- On Windows, you may need Visual Studio Build Tools
- Clear the build cache: `cd packages/tauri-app/src-tauri && cargo clean`

### Port Already in Use

If port 1420 is already in use, kill the process or change the port in `tauri.conf.json`
