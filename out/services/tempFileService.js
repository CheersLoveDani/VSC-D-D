"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TempFileService = void 0;
const vscode = require("vscode");
const os = require("os");
const path = require("path");
/**
 * Service to manage temporary D&D compendium files.
 * These files are created in a temp directory and deleted when closed without saving.
 */
class TempFileService {
    constructor() {
        this.tempFiles = new Map();
        this.disposables = [];
        // Create a temp directory for our extension
        this.tempDir = vscode.Uri.file(path.join(os.tmpdir(), 'vscode-dnd-compendium'));
        this.ensureTempDir();
        // Listen for document close events to clean up temp files
        this.disposables.push(vscode.workspace.onDidCloseTextDocument(doc => {
            this.onDocumentClosed(doc);
        }));
        // Listen for document save events - if saved elsewhere, remove from tracking
        this.disposables.push(vscode.workspace.onDidSaveTextDocument(doc => {
            this.onDocumentSaved(doc);
        }));
    }
    static getInstance() {
        if (!TempFileService.instance) {
            TempFileService.instance = new TempFileService();
        }
        return TempFileService.instance;
    }
    async ensureTempDir() {
        try {
            await vscode.workspace.fs.stat(this.tempDir);
        }
        catch {
            await vscode.workspace.fs.createDirectory(this.tempDir);
        }
    }
    /**
     * Creates a temporary file with the given content and opens it.
     * The file will be deleted when closed unless saved to a different location.
     */
    async openTempFile(name, extension, content) {
        await this.ensureTempDir();
        // Create a unique filename using timestamp
        const timestamp = Date.now();
        const sanitizedName = name.replace(/[<>:"/\\|?*]/g, '_');
        const fileName = `${sanitizedName}_${timestamp}${extension}`;
        const fileUri = vscode.Uri.joinPath(this.tempDir, fileName);
        // Write the content to the temp file
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(fileUri, encoder.encode(content));
        // Track this temp file
        this.tempFiles.set(fileUri.toString(), fileUri);
        // Open the file - this will trigger our custom editor
        await vscode.commands.executeCommand('vscode.open', fileUri);
        return fileUri;
    }
    async onDocumentClosed(doc) {
        const uriString = doc.uri.toString();
        // Check if this is one of our temp files
        if (this.tempFiles.has(uriString)) {
            // Delete the temp file
            try {
                await vscode.workspace.fs.delete(doc.uri);
            }
            catch {
                // File might already be deleted or moved
            }
            this.tempFiles.delete(uriString);
        }
    }
    onDocumentSaved(doc) {
        // If a temp file was saved (possibly to a new location via Save As),
        // we should check if it's still in our temp directory
        const uriString = doc.uri.toString();
        if (this.tempFiles.has(uriString)) {
            // The file was saved in place (still in temp dir)
            // This shouldn't happen normally since our custom editors
            // should prompt for a new location, but handle it anyway
        }
    }
    /**
     * Cleans up all temp files. Call this on extension deactivation.
     */
    async cleanup() {
        for (const [, uri] of this.tempFiles) {
            try {
                await vscode.workspace.fs.delete(uri);
            }
            catch {
                // Ignore errors during cleanup
            }
        }
        this.tempFiles.clear();
        // Try to clean up the temp directory if empty
        try {
            const entries = await vscode.workspace.fs.readDirectory(this.tempDir);
            if (entries.length === 0) {
                await vscode.workspace.fs.delete(this.tempDir);
            }
        }
        catch {
            // Ignore errors
        }
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.cleanup();
    }
}
exports.TempFileService = TempFileService;
//# sourceMappingURL=tempFileService.js.map