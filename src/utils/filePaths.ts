import * as vscode from 'vscode';

/**
 * Maps file extensions to their custom folder names
 */
const CUSTOM_FOLDER_NAMES: Record<string, string> = {
    '.dndspell': 'custom spells',
    '.dnditem': 'custom items',
    '.dndstat': 'custom monsters',
    '.dndchar': 'custom characters',
    '.dndmap': 'custom maps',
    '.dndnotes': 'custom notes',
    '.dndshop': 'custom shops'
};

/**
 * Gets the appropriate custom folder URI for a given file extension.
 * Creates the folder if it doesn't exist.
 *
 * @param baseUri The workspace or document base URI
 * @param fileExtension The file extension (e.g., '.dndspell')
 * @returns The folder URI for the custom file type
 */
export async function getCustomFolderUri(baseUri: vscode.Uri, fileExtension: string): Promise<vscode.Uri> {
    const folderName = CUSTOM_FOLDER_NAMES[fileExtension];
    if (!folderName) {
        // If no custom folder mapping, use base directory
        return baseUri;
    }

    const folderUri = vscode.Uri.joinPath(baseUri, folderName);

    // Create the folder if it doesn't exist
    try {
        await vscode.workspace.fs.stat(folderUri);
    } catch {
        // Folder doesn't exist, create it
        await vscode.workspace.fs.createDirectory(folderUri);
    }

    return folderUri;
}

/**
 * Gets the full file URI for a custom D&D file, placing it in the appropriate custom folder.
 *
 * @param baseUri The workspace or document base URI
 * @param fileName The file name (without extension)
 * @param fileExtension The file extension (e.g., '.dndspell')
 * @returns The full file URI within the custom folder
 */
export async function getCustomFileUri(baseUri: vscode.Uri, fileName: string, fileExtension: string): Promise<vscode.Uri> {
    const folderUri = await getCustomFolderUri(baseUri, fileExtension);
    return vscode.Uri.joinPath(folderUri, `${fileName}${fileExtension}`);
}

/**
 * Searches for an existing custom file in both the custom folder and the base directory.
 * This ensures backwards compatibility with files created before folder organization.
 *
 * @param baseUri The workspace or document base URI
 * @param fileName The file name (without extension)
 * @param fileExtension The file extension (e.g., '.dndspell')
 * @returns The URI of the existing file if found, null otherwise
 */
export async function findExistingCustomFile(baseUri: vscode.Uri, fileName: string, fileExtension: string): Promise<vscode.Uri | null> {
    const fullFileName = `${fileName}${fileExtension}`;

    // First check the custom folder
    const folderName = CUSTOM_FOLDER_NAMES[fileExtension];
    if (folderName) {
        const customFolderUri = vscode.Uri.joinPath(baseUri, folderName, fullFileName);
        try {
            await vscode.workspace.fs.stat(customFolderUri);
            return customFolderUri;
        } catch {
            // File not in custom folder
        }
    }

    // Then check the base directory (for backwards compatibility)
    const baseFileUri = vscode.Uri.joinPath(baseUri, fullFileName);
    try {
        await vscode.workspace.fs.stat(baseFileUri);
        return baseFileUri;
    } catch {
        // File doesn't exist
    }

    return null;
}
