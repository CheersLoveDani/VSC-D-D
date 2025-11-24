const esbuild = require('esbuild');
const path = require('path');

// Build TipTap bundle for webview
esbuild.build({
    entryPoints: [path.join(__dirname, 'src/webview/tiptap-bundle.js')],
    bundle: true,
    outfile: path.join(__dirname, 'media/tiptap-bundle.js'),
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    minify: false,
    sourcemap: true
}).then(() => {
    console.log('✓ TipTap bundle built successfully');
}).catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
});
