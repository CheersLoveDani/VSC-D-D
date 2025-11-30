import * as vscode from 'vscode';
// Removed os and path imports for web compatibility

/**
 * Service to manage temporary D&D compendium files.
 * These files are created in a temp directory and deleted when closed without saving.
 */
export class TempFileService {
    private static instance: TempFileService;
    private tempFiles: Map<string, vscode.Uri> = new Map();
    private disposables: vscode.Disposable[] = [];
    private tempDir: vscode.Uri;

    private constructor(context: vscode.ExtensionContext) {
        // Create a temp directory for our extension in the workspace storage
        // Fallback to global storage if workspace storage is not available
        const storageRoot = context.storageUri || context.globalStorageUri;
        this.tempDir = vscode.Uri.joinPath(storageRoot, 'temp');
        this.ensureTempDir();

        // Listen for document close events to clean up temp files
        this.disposables.push(
            vscode.workspace.onDidCloseTextDocument(doc => {
                this.onDocumentClosed(doc);
            })
        );

        // Listen for document save events - if saved elsewhere, remove from tracking
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(doc => {
                this.onDocumentSaved(doc);
            })
        );
    }

    public static getInstance(context?: vscode.ExtensionContext): TempFileService {
        if (!TempFileService.instance) {
            if (!context) {
                throw new Error('TempFileService must be initialized with context first');
            }
            TempFileService.instance = new TempFileService(context);
        }
        return TempFileService.instance;
    }

    private async ensureTempDir(): Promise<void> {
        try {
            await vscode.workspace.fs.stat(this.tempDir);
        } catch {
            await vscode.workspace.fs.createDirectory(this.tempDir);
        }
    }

    /**
     * Creates a temporary file with the given content and opens it.
     * The file will be deleted when closed unless saved to a different location.
     */
    public async openTempFile(
        name: string,
        extension: string,
        content: string
    ): Promise<vscode.Uri> {
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

    private async onDocumentClosed(doc: vscode.TextDocument): Promise<void> {
        const uriString = doc.uri.toString();

        // Check if this is one of our temp files
        if (this.tempFiles.has(uriString)) {
            // Delete the temp file
            try {
                await vscode.workspace.fs.delete(doc.uri);
            } catch {
                // File might already be deleted or moved
            }
            this.tempFiles.delete(uriString);
        }
    }

    private onDocumentSaved(doc: vscode.TextDocument): void {
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
    public async cleanup(): Promise<void> {
        for (const [, uri] of this.tempFiles) {
            try {
                await vscode.workspace.fs.delete(uri);
            } catch {
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
        } catch {
            // Ignore errors
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.cleanup();
    }
}
