// TypeScript checking disabled for webview script

/**
 * @typedef {Object} TipTapEditor
 * @property {function} destroy
 * @property {function} getHTML
 * @property {Object} commands
 * @property {Object} chain
 * @property {function} isActive
 * @property {function} on
 * @property {Object} storage
 */

/**
 * @typedef {Object} TipTapStatic
 * @property {function} Editor
 * @property {Object} StarterKit
 * @property {Object} Table
 * @property {Object} TableRow
 * @property {Object} TableHeader
 * @property {Object} TableCell
 * @property {Object} TaskList
 * @property {Object} TaskItem
 * @property {Object} Highlight
 * @property {Object} Superscript
 * @property {Object} Subscript
 * @property {Object} Image
 * @property {Object} Link
 */

// Extend Window interface
/** @type {Window & { TipTap: TipTapStatic }} */
// @ts-ignore
const globalWindow = window;

(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const container = /** @type {HTMLElement} */ (document.getElementById('app'));
    const toggleBtn = /** @type {HTMLElement} */ (document.getElementById('toggle-mode-btn'));
    const rawToggleBtn = /** @type {HTMLElement} */ (document.getElementById('raw-toggle-btn'));
    const popover = /** @type {HTMLElement} */ (document.getElementById('popover'));
    const toolbar = /** @type {HTMLElement} */ (document.querySelector('.toolbar'));
    const editorToolbar = /** @type {HTMLElement} */ (document.querySelector('.editor-toolbar'));

    // Context menu elements - will be initialized later
    let contextMenu = /** @type {HTMLElement | null} */ (null);
    let ctxAddLink = /** @type {HTMLElement | null} */ (null);
    let ctxBold = /** @type {HTMLElement | null} */ (null);
    let ctxItalic = /** @type {HTMLElement | null} */ (null);

    // Dialog elements - will be initialized later
    let linkDialog = /** @type {HTMLElement | null} */ (null);
    let linkTextInput = /** @type {HTMLInputElement | null} */ (null);
    let linkUrlInput = /** @type {HTMLInputElement | null} */ (null);
    let linkInsertBtn = /** @type {HTMLElement | null} */ (null);
    let linkCancelBtn = /** @type {HTMLElement | null} */ (null);

    let imageDialog = /** @type {HTMLElement | null} */ (null);
    let imageUrlInput = /** @type {HTMLInputElement | null} */ (null);
    let imageAltInput = /** @type {HTMLInputElement | null} */ (null);
    let imageInsertBtn = /** @type {HTMLElement | null} */ (null);
    let imageCancelBtn = /** @type {HTMLElement | null} */ (null);

    // Initialize dialog elements once DOM is ready
    function initializeDialogElements() {
        contextMenu = document.getElementById('context-menu');
        ctxAddLink = document.getElementById('ctx-add-link');
        ctxBold = document.getElementById('ctx-bold');
        ctxItalic = document.getElementById('ctx-italic');

        linkDialog = document.getElementById('link-dialog');
        linkTextInput = /** @type {HTMLInputElement} */ (document.getElementById('link-text'));
        linkUrlInput = /** @type {HTMLInputElement} */ (document.getElementById('link-url'));
        linkInsertBtn = document.getElementById('link-insert');
        linkCancelBtn = document.getElementById('link-cancel');

        imageDialog = document.getElementById('image-dialog');
        imageUrlInput = /** @type {HTMLInputElement} */ (document.getElementById('image-url'));
        imageAltInput = /** @type {HTMLInputElement} */ (document.getElementById('image-alt'));
        imageInsertBtn = document.getElementById('image-insert');
        imageCancelBtn = document.getElementById('image-cancel');

        setupDialogListeners();
    }

    /** @type {{ content: string, mode: 'read' | 'edit', rawMode: boolean, lastSavedContent: string, pendingUpdate: boolean, isSettingContent: boolean }} */
    let state = {
        content: '',
        mode: 'read',
        rawMode: false,
        lastSavedContent: '',
        pendingUpdate: false,      // True when we've sent an update to VSCode and are waiting for confirmation
        isSettingContent: false    // True when we're programmatically setting editor content
    };

    /** @type {TipTapEditor | null} */
    let editor = null;
    /** @type {HTMLTextAreaElement | null} */
    let rawTextarea = null;
    let toolbarListenersSetup = false;
    /** @type {HTMLImageElement | null} */
    let selectedImage = null;
    /** @type {boolean} */
    let isImageContextMenu = false;
    let isLinkContextMenu = false;
    let selectedLink = null;

    // Initialize
    vscode.postMessage({ type: 'ready' });

    // Initialize dialog elements after DOM is loaded
    initializeDialogElements();

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                // Normalize strings for comparison (ignore whitespace differences)
                const normalize = (str) => (str || '').replace(/\r\n/g, '\n').trim();
                
                // IMPORTANT: Strip webview URIs before storing
                // This ensures state.content always has relative paths, never session-specific URIs
                const unconvertedContent = stripWebviewUris(message.text);
                
                const newContent = normalize(unconvertedContent);
                const currentContent = normalize(state.content);
                const lastSaved = normalize(state.lastSavedContent);

                // If we have a pending update, the editor is the source of truth
                // Only accept updates that match what we sent
                if (state.pendingUpdate) {
                    if (newContent === currentContent || newContent === lastSaved) {
                        state.pendingUpdate = false;
                        return;
                    }
                    // VSCode sent something different - it might be stale, ignore it
                    // The editor has the authoritative content
                    return;
                }

                // Ignore if content hasn't changed OR if it matches what we just saved (echo)
                if (newContent === currentContent || newContent === lastSaved) {
                    return;
                }

                // For the rich editor, check if TipTap already has the correct content
                // This prevents resetting the editor (and losing undo history) when
                // the document echoes back changes that originated from undo/redo
                if (editor && !state.rawMode) {
                    const editorContent = normalize(convertHTMLToMarkdown(editor.getHTML()));
                    if (newContent === editorContent) {
                        // TipTap already has this content (e.g., from undo/redo)
                        // Just update state without resetting the editor
                        state.content = unconvertedContent;  // Store unconverted (relative paths)
                        state.lastSavedContent = unconvertedContent;
                        return;
                    }
                }

                // Update state with unconverted content (relative paths)
                state.content = unconvertedContent;
                
                if (editor && !state.rawMode) {
                    // Only update if editor exists and we're in rich mode
                    // Use the CONVERTED content (with webview URIs) for display
                    trySetMarkdownContent(message.text);
                } else if (rawTextarea && state.rawMode) {
                    // For raw mode, use unconverted content
                    rawTextarea.value = unconvertedContent;
                }
                if (state.mode === 'read') {
                    // Re-render view mode with updated content
                    render();
                }
                return;
            case 'previewData':
                showPopover(message.data, message.x, message.y);
                return;
        }
    });

    toggleBtn.addEventListener('click', () => {
        // If switching FROM edit mode TO read mode, we need to save the content first
        if (state.mode === 'edit' && editor) {
            const html = editor.getHTML();
            // Use helper to convert and strip webview URIs
            const converted = htmlToStorageMarkdown(html);
            state.content = converted;
        }

        state.mode = state.mode === 'read' ? 'edit' : 'read';
        toggleBtn.textContent = state.mode === 'read' ? 'Edit Note' : 'View Note';
        editorToolbar.style.display = state.mode === 'edit' ? 'flex' : 'none';
        rawToggleBtn.style.display = state.mode === 'edit' ? 'inline-block' : 'none';
        render();
    });

    rawToggleBtn.addEventListener('click', () => {
        if (state.mode !== 'edit') return;

        state.rawMode = !state.rawMode;
        rawToggleBtn.textContent = state.rawMode ? 'Rich Editor' : 'Raw Markdown';
        rawToggleBtn.classList.toggle('active', state.rawMode);

        if (state.rawMode && editor) {
            // Switch to raw markdown
            const markdown = editor.storage.markdown?.getMarkdown() || convertHTMLToMarkdown(editor.getHTML());
            // Strip webview URIs before storing
            state.content = stripWebviewUris(markdown);
            editor.destroy();
            editor = null;
            container.innerHTML = '';
            renderRawEditor();
        } else if (!state.rawMode && rawTextarea) {
            // Switch to rich editor
            state.content = rawTextarea.value;
            rawTextarea = null;
            container.innerHTML = '';
            renderRichEditor();
        }
    });

    function render() {
        container.innerHTML = '';

        if (state.mode === 'edit') {
            if (state.rawMode) {
                renderRawEditor();
            } else {
                renderRichEditor();
            }
        } else {
            // For view mode, we need to convert relative paths to webview URIs for display
            // state.content has relative paths, but we need webview URIs for images to display
            const preview = document.createElement('div');
            preview.className = 'markdown-preview';
            const html = convertMarkdownToHTML(state.content);
            preview.innerHTML = html;
            container.appendChild(preview);
            attachLinkListeners(preview);
        }
    }

    function renderRawEditor() {
        const textarea = document.createElement('textarea');
        textarea.id = 'editor-textarea';
        textarea.className = 'raw-markdown-editor';
        textarea.value = state.content;
        textarea.addEventListener('input', (e) => {
            // @ts-ignore
            state.content = e.target.value;
            state.lastSavedContent = state.content;
            vscode.postMessage({
                type: 'updateData',
                text: state.content
            });
        });
        container.appendChild(textarea);
        rawTextarea = textarea;
    }

    function renderRichEditor() {
        const editorDiv = document.createElement('div');
        editorDiv.id = 'tiptap-editor';
        editorDiv.className = 'tiptap-container';
        container.appendChild(editorDiv);

        // Initialize TipTap editor
        editor = new globalWindow.TipTap.Editor({
            element: editorDiv,
            extensions: [
                globalWindow.TipTap.StarterKit.configure({
                    heading: {
                        levels: [1, 2, 3, 4, 5, 6]
                    }
                }),
                globalWindow.TipTap.Table.configure({
                    resizable: true,
                }),
                globalWindow.TipTap.TableRow,
                globalWindow.TipTap.TableHeader,
                globalWindow.TipTap.TableCell,
                globalWindow.TipTap.TaskList,
                globalWindow.TipTap.TaskItem.configure({
                    nested: true,
                }),
                globalWindow.TipTap.Highlight,
                globalWindow.TipTap.Superscript,
                globalWindow.TipTap.Subscript,
                globalWindow.TipTap.Image.configure({
                    inline: true,
                    allowBase64: true,
                }),
                // Link is already included in StarterKit or bundle, removing duplicate
            ],
            content: '', // Start empty to avoid conversion issues
            onUpdate: ({ editor }) => {
                // Skip if this update was triggered by us setting content externally
                if (state.isSettingContent) {
                    return;
                }
                const html = editor.getHTML();
                // Use helper to convert and strip webview URIs
                const newContent = htmlToStorageMarkdown(html);
                state.content = newContent;
                state.lastSavedContent = state.content;
                // Mark that we're the source of truth - ignore incoming updates until VSCode confirms
                state.pendingUpdate = true;
                vscode.postMessage({
                    type: 'updateData',
                    text: state.content
                });
            },
        });

        // Set content after initialization using commands
        // This is safer than setting in constructor
        if (state.content) {
            // Parse markdown line by line and build content
            trySetMarkdownContent(state.content);
        }

        // Listen to selection changes to update toolbar
        editor.on('selectionUpdate', () => {
            updateToolbarState();
        });

        // Add context menu and image selection handlers
        const editorElement = document.querySelector('.ProseMirror');
        if (editorElement) {
            // Handle image clicks for selection
            editorElement.addEventListener('click', (e) => {
                const target = /** @type {HTMLElement} */ (e.target);
                
                // Clear previous selection
                if (selectedImage) {
                    selectedImage.classList.remove('selected');
                    selectedImage = null;
                }
                
                // If clicked on an image, select it
                if (target.tagName === 'IMG') {
                    selectedImage = /** @type {HTMLImageElement} */ (target);
                    selectedImage.classList.add('selected');
                    e.stopPropagation();
                }
            });
            
            // Handle context menu
            editorElement.addEventListener('contextmenu', (e) => {
                const target = /** @type {HTMLElement} */ (e.target);
                
                // Check if right-clicked on an image
                if (target.tagName === 'IMG') {
                    e.preventDefault();
                    selectedImage = /** @type {HTMLImageElement} */ (target);
                    selectedImage.classList.add('selected');
                    
                    // Check if image is inside a link
                    const parentLink = target.closest('a');
                    if (parentLink) {
                        selectedLink = parentLink;
                        showLinkContextMenu(e.clientX, e.clientY);
                    } else {
                        selectedLink = null;
                        showImageContextMenu(e.clientX, e.clientY);
                    }
                    return;
                }
                
                // Check if right-clicked on a table cell
                const tableCell = target.closest('td, th');
                if (tableCell) {
                    e.preventDefault();
                    showTableContextMenu(e.clientX, e.clientY);
                    return;
                }
                
                // Check if right-clicked on a link (text)
                const link = target.closest('a');
                if (link) {
                    e.preventDefault();
                    selectedLink = link;
                    selectedImage = null; // Clear image selection if clicking text link
                    showLinkContextMenu(e.clientX, e.clientY);
                    return;
                }
                
                const selection = editor.state.selection;
                const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');

                // Only show custom context menu if text is selected
                if (selectedText && selectedText.trim()) {
                    e.preventDefault();
                    selectedLink = null;
                    showContextMenu(e.clientX, e.clientY);
                }
            });
            
            // Handle keyboard delete for selected images
            editorElement.addEventListener('keydown', (e) => {
                if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImage) {
                    e.preventDefault();
                    deleteSelectedImage();
                }
            });
        }

        updateToolbarState();
        if (!toolbarListenersSetup) {
            setupToolbarListeners();
            toolbarListenersSetup = true;
        }
    }

    /**
     * @param {string} markdown
     */
    function trySetMarkdownContent(markdown) {
        if (!editor || !markdown) return;

        // Set flag to prevent onUpdate from firing during programmatic content change
        state.isSettingContent = true;

        // First, try to set it as HTML if it looks like it might have been converted
        // Otherwise, TipTap will treat it as plain text which is fine
        try {
            const html = simpleMarkdownToHTML(markdown);
            editor.commands.setContent(html);
        } catch (e) {
            console.error('[trySetMarkdownContent] Error:', e);
            // Fallback: just set as plain text
            editor.commands.setContent(`<p>${markdown}</p>`);
        } finally {
            state.isSettingContent = false;
        }
    }

    /**
     * Simplified markdown to HTML that TipTap can understand
     * @param {string} markdown
     * @returns {string}
     */
    function simpleMarkdownToHTML(markdown) {
        if (!markdown) return '<p></p>';
        
        const lines = markdown.split('\n');
        let html = '';
        let inList = false;
        let inOrderedList = false;
        let inTaskList = false;
        let inCodeBlock = false;
        let codeBlockContent = '';
        let inTable = false;
        let tableRows = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Code blocks
            if (trimmed.startsWith('```')) {
                if (inCodeBlock) {
                    html += `<pre><code>${codeBlockContent}</code></pre>`;
                    codeBlockContent = '';
                    inCodeBlock = false;
                } else {
                    inCodeBlock = true;
                }
                continue;
            }
            
            if (inCodeBlock) {
                codeBlockContent += line + '\n';
                continue;
            }
            
            // Empty lines
            if (!trimmed) {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                if (inOrderedList) {
                    html += '</ol>';
                    inOrderedList = false;
                }
                if (inTaskList) {
                    html += '</ul>';
                    inTaskList = false;
                }
                // Don't add empty paragraphs - they create visible blank lines in edit mode
                continue;
            }
            
            // Headings
            if (trimmed.startsWith('######')) {
                html += `<h6>${trimmed.substring(7)}</h6>`;
            } else if (trimmed.startsWith('#####')) {
                html += `<h5>${trimmed.substring(6)}</h5>`;
            } else if (trimmed.startsWith('####')) {
                html += `<h4>${trimmed.substring(5)}</h4>`;
            } else if (trimmed.startsWith('###')) {
                html += `<h3>${trimmed.substring(4)}</h3>`;
            } else if (trimmed.startsWith('##')) {
                html += `<h2>${trimmed.substring(3)}</h2>`;
            } else if (trimmed.startsWith('#')) {
                html += `<h1>${trimmed.substring(2)}</h1>`;
            }
            // Task lists
            else if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
                const checked = trimmed.includes('[x]');
                const content = trimmed.substring(6);
                if (!inTaskList) {
                    html += '<ul data-type="taskList">';
                    inTaskList = true;
                }
                html += `<li data-type="taskItem" data-checked="${checked}">${processInlineMarkdown(content)}</li>`;
            }
            // Unordered lists
            else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                const content = trimmed.substring(2);
                if (inTaskList) {
                    html += '</ul>';
                    inTaskList = false;
                }
                if (!inList) {
                    html += '<ul>';
                    inList = true;
                }
                html += `<li>${processInlineMarkdown(content)}</li>`;
            }
            // Ordered lists
            else if (/^\d+\.\s/.test(trimmed)) {
                const content = trimmed.replace(/^\d+\.\s/, '');
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                if (inTaskList) {
                    html += '</ul>';
                    inTaskList = false;
                }
                if (!inOrderedList) {
                    html += '<ol>';
                    inOrderedList = true;
                }
                html += `<li>${processInlineMarkdown(content)}</li>`;
            }
            // Blockquotes
            else if (trimmed.startsWith('>')) {
                html += `<blockquote><p>${processInlineMarkdown(trimmed.substring(1).trim())}</p></blockquote>`;
            }
            // Tables - detect lines with pipe characters
            else if (trimmed.includes('|')) {
                // Start collecting table rows
                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                }
                tableRows.push(trimmed);
                
                // Check if next line exists and is not a table row
                const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
                const isNextLineTable = nextLine.includes('|');
                
                // If next line is not a table row, process the collected table
                if (!isNextLineTable) {
                    html += parseTable(tableRows);
                    inTable = false;
                    tableRows = [];
                }
            }
            // Horizontal rule
            else if (trimmed === '---' || trimmed === '***') {
                // Only treat as HR if not in a table context
                if (!inTable) {
                    html += '<hr>';
                }
            }
            // Regular paragraph
            else {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                if (inOrderedList) {
                    html += '</ol>';
                    inOrderedList = false;
                }
                if (inTaskList) {
                    html += '</ul>';
                    inTaskList = false;
                }
                html += `<p>${processInlineMarkdown(line)}</p>`;
            }
        }
        
        // Close any open lists
        if (inList) html += '</ul>';
        if (inOrderedList) html += '</ol>';
        if (inTaskList) html += '</ul>';
        if (inCodeBlock) html += `<pre><code>${codeBlockContent}</code></pre>`;
        
        return html || '<p></p>';
    }

    /**
     * Parse markdown table rows into HTML table
     * @param {string[]} rows
     * @returns {string}
     */
    function parseTable(rows) {
        if (rows.length === 0) return '';

        let tableHTML = '<table>';
        let hasHeader = false;
        let headerRow = '';
        let bodyRows = [];

        // Check if second row is a separator (|---|---|)
        if (rows.length > 1 && /^[\s|:-]+$/.test(rows[1].replace(/\|/g, ''))) {
            hasHeader = true;
            headerRow = rows[0];
            bodyRows = rows.slice(2); // Skip header and separator
        } else {
            bodyRows = rows;
        }

        // Parse header if present
        if (hasHeader && headerRow) {
            const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
            tableHTML += '<thead><tr>';
            headers.forEach(header => {
                const processed = processInlineMarkdown(header);
                tableHTML += `<th><p>${processed}</p></th>`;
            });
            tableHTML += '</tr></thead>';
        }

        // Parse body rows
        if (bodyRows.length > 0) {
            tableHTML += '<tbody>';
            bodyRows.forEach((row) => {
                const cells = row.split('|').map(c => c.trim()).filter(c => c);
                if (cells.length > 0) {
                    tableHTML += '<tr>';
                    cells.forEach((cell) => {
                        const processed = processInlineMarkdown(cell);
                        tableHTML += `<td><p>${processed}</p></td>`;
                    });
                    tableHTML += '</tr>';
                }
            });
            tableHTML += '</tbody>';
        }

        tableHTML += '</table>';
        return tableHTML;
    }

    /**
     * Convert webview URIs back to relative paths for storage
     * This ensures we never save session-specific URIs to the document
     * Handles all URL-encoded characters: spaces (%20), ampersands (%26), hashes (%23), 
     * parentheses (%28, %29), brackets (%5B, %5D), unicode characters, etc.
     * @param {string} markdown - Markdown that may contain webview URIs
     * @returns {string} - Markdown with relative paths
     */
    function stripWebviewUris(markdown) {
        if (!markdown) return '';
        
        // Match image syntax with webview URIs
        const result = markdown.replace(
            /!\[([^\]]*)\]\((vscode-webview:\/\/[^)]+)\)/g,
            (match, alt, fullUri) => {
                try {
                    // Extract the path from the webview URI
                    // Format: vscode-webview://authority/e%3A/development/VSC-D%26D/images/pic.png
                    const url = new URL(fullUri);
                    const pathname = url.pathname;
                    
                    // Decode URI components (handles %20, %26, %23, %28, %29, %5B, %5D, unicode, etc.)
                    // This is safe to call multiple times - it won't double-decode
                    let decodedPath = pathname;
                    try {
                        // Only decode if the path contains encoded characters
                        if (/%[0-9A-Fa-f]{2}/.test(pathname)) {
                            decodedPath = decodeURIComponent(pathname);
                        }
                    } catch (decodeError) {
                        // If decoding fails, the path might be malformed or already decoded
                        console.warn('[stripWebviewUris] Could not decode path:', pathname, decodeError);
                        decodedPath = pathname;
                    }
                    
                    // Find the last occurrence of a reasonable file path
                    // We're looking for patterns like: /folder/file.ext or folder/file.ext
                    // This regex now handles filenames with spaces and special characters
                    const pathMatch = decodedPath.match(/([^\/]+\/[^\/]+\.(png|jpg|jpeg|gif|svg|webp|bmp))$/i);
                    
                    if (pathMatch) {
                        const relativePath = pathMatch[1];
                        return `![${alt}](./${relativePath})`;
                    }
                    
                    // If no match, try to extract just the filename
                    const filenameMatch = decodedPath.match(/([^\/]+\.(png|jpg|jpeg|gif|svg|webp|bmp))$/i);
                    if (filenameMatch) {
                        const filename = filenameMatch[1];
                        return `![${alt}](./${filename})`;
                    }
                    
                    console.warn('[stripWebviewUris] Could not extract path from:', fullUri);
                    return match; // Return original if we can't parse
                } catch (error) {
                    console.error('[stripWebviewUris] Error processing:', fullUri, error);
                    return match; // On error, return original to avoid data loss
                }
            }
        );
        
        return result;
    }

    /**
     * Safely convert HTML to markdown and strip webview URIs for storage
     * This ensures we always store relative paths, never session-specific URIs
     * @param {string} html - HTML from TipTap editor
     * @returns {string} - Markdown with relative paths
     */
    function htmlToStorageMarkdown(html) {
        const markdown = convertHTMLToMarkdown(html);
        const stripped = stripWebviewUris(markdown);
        return stripped;
    }

    /**
     * Process inline markdown (bold, italic, links, etc.)
     * @param {string} text
     * @returns {string}
     */
    function processInlineMarkdown(text) {
        // console.log('[processInlineMarkdown] Input:', text);
        const result = text
            // Images (paths are already converted server-side)
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
            // Links - handles spaces, ampersands, hashes, brackets, unicode
            // Note: Does not support parentheses in filenames
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
                try {
                    console.log('[processInlineMarkdown] Processing link:', { text, url });
                    // Encode the URL to ensure spaces are %20, etc.
                    // We decode first to avoid double-encoding if it's already encoded
                    const decoded = decodeURI(url);
                    const encodedUrl = encodeURI(decoded);
                    console.log('[processInlineMarkdown] Link transformation:', { original: url, decoded, encoded: encodedUrl });
                    return `<a href="${encodedUrl}">${text}</a>`;
                } catch (e) {
                    console.warn('[processInlineMarkdown] Failed to encode url:', url, e);
                    return `<a href="${url}">${text}</a>`;
                }
            })

            // Bold + Italic
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Strikethrough
            .replace(/~~(.+?)~~/g, '<s>$1</s>')
            // Inline code
            .replace(/`(.+?)`/g, '<code>$1</code>');
            
        // console.log('[processInlineMarkdown] Output:', result);
        return result;
    }

    /**
     * Convert HTML back to Markdown
     * @param {string} html
     * @returns {string}
     */
    function convertHTMLToMarkdown(html) {
        if (!html) return '';

        console.log('[convertHTMLToMarkdown] Starting conversion, input HTML:', html);

        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        let markdown = '';

        // Process each child node
        for (const node of tempDiv.childNodes) {
            markdown += convertNodeToMarkdown(node);
        }

        // Clean up excessive newlines (more than 2 consecutive newlines)
        markdown = markdown.replace(/\n{3,}/g, '\n\n');

        console.log('[convertHTMLToMarkdown] Conversion complete, output markdown:', markdown.trim());
        return markdown.trim();
    }
    
    /**
     * Convert a DOM node to markdown
     * @param {Node} node
     * @returns {string}
     */
    function convertNodeToMarkdown(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || '';
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const element = /** @type {HTMLElement} */ (node);
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                const level = parseInt(tagName[1]);
                return '#'.repeat(level) + ' ' + element.textContent + '\n\n';

            case 'p':
                // Check if paragraph is empty or just whitespace
                if (!element.textContent?.trim() && element.children.length === 0) {
                    return '\n'; // Return single newline for empty paragraphs to maintain spacing
                }
                let pContent = '';
                for (const child of element.childNodes) {
                    pContent += convertNodeToMarkdown(child);
                }
                return pContent + '\n\n';
            
            case 'br':
                return '\n';
            
            case 'strong':
            case 'b':
                return '**' + element.textContent + '**';
            
            case 'em':
            case 'i':
                return '*' + element.textContent + '*';
            
            case 's':
            case 'strike':
            case 'del':
                return '~~' + element.textContent + '~~';
            
            case 'code':
                return '`' + element.textContent + '`';
            
            case 'pre':
                return '```\n' + element.textContent + '\n```\n\n';
            
            case 'blockquote':
                const lines = element.textContent?.split('\n') || [];
                return lines.map(line => '> ' + line).join('\n') + '\n\n';
            
            case 'ul':
                let ulMarkdown = '';
                for (const li of element.children) {
                    if (li.tagName.toLowerCase() === 'li') {
                        const hasCheckbox = li.querySelector('input[type="checkbox"]');
                        if (hasCheckbox) {
                            const checked = hasCheckbox.checked;
                            // Process child nodes to preserve links and other inline elements
                            let liContent = '';
                            for (const child of li.childNodes) {
                                liContent += convertNodeToMarkdown(child);
                            }
                            ulMarkdown += `- [${checked ? 'x' : ' '}] ${liContent}\n`;
                        } else {
                            // Process child nodes to preserve links and other inline elements
                            let liContent = '';
                            for (const child of li.childNodes) {
                                liContent += convertNodeToMarkdown(child);
                            }
                            ulMarkdown += '- ' + liContent + '\n';
                        }
                    }
                }
                return ulMarkdown + '\n';
            
            case 'ol':
                let olMarkdown = '';
                let index = 1;
                for (const li of element.children) {
                    if (li.tagName.toLowerCase() === 'li') {
                        // Process child nodes to preserve links and other inline elements
                        let liContent = '';
                        for (const child of li.childNodes) {
                            liContent += convertNodeToMarkdown(child);
                        }
                        olMarkdown += `${index}. ${liContent}\n`;
                        index++;
                    }
                }
                return olMarkdown + '\n';
            
            case 'a':
                let href = element.getAttribute('href') || '';
                console.log('[convertNodeToMarkdown] Processing link element:', { href, text: element.textContent });
                try {
                    // Ensure the URL is properly encoded for storage (e.g. spaces -> %20)
                    // Decode first to avoid double-encoding
                    const decoded = decodeURI(href);
                    href = encodeURI(decoded);
                    console.log('[convertNodeToMarkdown] Link encoding:', { original: element.getAttribute('href'), decoded, encoded: href });
                } catch (e) {
                    console.warn('[convertNodeToMarkdown] Failed to encode href:', href, e);
                }

                // Process child nodes to preserve images and other inline elements
                let linkContent = '';
                for (const child of element.childNodes) {
                    const childResult = convertNodeToMarkdown(child);
                    linkContent += childResult;
                }
                
                const result = `[${linkContent}](${href})`;
                console.log('[convertNodeToMarkdown] Final link markdown:', result);
                return result;
            
            case 'img':
                const src = element.getAttribute('src') || '';
                const alt = element.getAttribute('alt') || '';
                return `![${alt}](${src})`;
            
            case 'hr':
                return '---\n\n';
            
            case 'table':
                return convertTableToMarkdown(element);
            
            default:
                // For other elements, just return their text content
                let childMarkdown = '';
                for (const child of element.childNodes) {
                    childMarkdown += convertNodeToMarkdown(child);
                }
                return childMarkdown;
        }
    }
    
    /**
     * Convert HTML table to markdown table
     * @param {HTMLElement} table
     * @returns {string}
     */
    function convertTableToMarkdown(table) {
        let markdown = '\n';
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        /**
         * Process inline markdown within a cell
         * @param {HTMLElement} cell
         * @returns {string}
         */
        const processCellContent = (cell) => {
            let content = '';

            // Helper function to process inline elements within a paragraph
            const processInlineElements = (parentNode) => {
                let inlineContent = '';
                for (const node of parentNode.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        inlineContent += node.textContent || '';
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = /** @type {HTMLElement} */ (node);
                        switch (element.tagName.toLowerCase()) {
                            case 'strong':
                            case 'b':
                                inlineContent += '**' + (element.textContent || '') + '**';
                                break;
                            case 'em':
                            case 'i':
                                inlineContent += '*' + (element.textContent || '') + '*';
                                break;
                            case 'code':
                                inlineContent += '`' + (element.textContent || '') + '`';
                                break;
                            case 'a':
                                const href = element.getAttribute('href') || '';
                                inlineContent += '[' + (element.textContent || '') + '](' + href + ')';
                                break;
                            case 'br':
                                inlineContent += ' ';
                                break;
                            default:
                                inlineContent += element.textContent || '';
                        }
                    }
                }
                return inlineContent;
            };

            // Process each child node in the cell
            for (const node of cell.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent || '';
                    if (text.trim()) {
                        content += text;
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = /** @type {HTMLElement} */ (node);

                    // Handle paragraph tags specially - process their inline content
                    if (element.tagName.toLowerCase() === 'p') {
                        const pContent = processInlineElements(element);
                        content += pContent;
                    } else {
                        // For other elements, use the same inline processing
                        const otherContent = processInlineElements(element);
                        content += otherContent;
                    }
                }
            }

            const finalContent = content.trim().replace(/\s+/g, ' ');
            return finalContent;
        };

        // Process header
        let hasProcessedHeader = false;
        if (thead) {
            const headerRow = thead.querySelector('tr');
            if (headerRow) {
                const headers = Array.from(headerRow.querySelectorAll('th, td'));
                const headerContent = headers.map(th => processCellContent(th));
                markdown += '| ' + headerContent.join(' | ') + ' |\n';
                markdown += '|' + headers.map(() => '---').join('|') + '|\n';
                hasProcessedHeader = true;
            }
        }

        // Process body
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = Array.from(row.querySelectorAll('td, th'));

                // Check if this is a header row (contains th elements) and we haven't processed a header yet
                const hasThCells = cells.some(cell => cell.tagName.toLowerCase() === 'th');

                if (!hasProcessedHeader && hasThCells) {
                    const headerContent = cells.map(th => processCellContent(th));
                    markdown += '| ' + headerContent.join(' | ') + ' |\n';
                    markdown += '|' + cells.map(() => '---').join('|') + '|\n';
                    hasProcessedHeader = true;
                } else {
                    // Regular data row
                    const cellContent = cells.map(td => processCellContent(td));
                    markdown += '| ' + cellContent.join(' | ') + ' |\n';
                }
            }
        }

        return markdown + '\n';
    }

    function setupToolbarListeners() {
        // Text formatting
        document.getElementById('btn-bold')?.addEventListener('click', () => {
            if (editor) editor.chain().focus().toggleBold().run();
        });
        document.getElementById('btn-italic')?.addEventListener('click', () => {
            if (editor) editor.chain().focus().toggleItalic().run();
        });
        document.getElementById('btn-strike')?.addEventListener('click', () => {
            if (editor) editor.chain().focus().toggleStrike().run();
        });
        document.getElementById('btn-code')?.addEventListener('click', () => {
            if (editor) editor.chain().focus().toggleCode().run();
        });
        document.getElementById('btn-highlight')?.addEventListener('click', () => {
            if (editor) editor.chain().focus().toggleHighlight().run();
        });

        // Headings
        for (let i = 1; i <= 6; i++) {
            document.getElementById(`btn-h${i}`)?.addEventListener('click', () => {
                if (editor) editor.chain().focus().toggleHeading({ level: i }).run();
            });
        }

        // Lists
        document.getElementById('btn-bullet-list')?.addEventListener('click', () => {
            if (editor) editor.chain().focus().toggleBulletList().run();
        });
        document.getElementById('btn-ordered-list')?.addEventListener('click', () => {
            if (editor) editor.chain().focus().toggleOrderedList().run();
        });
        document.getElementById('btn-task-list')?.addEventListener('click', () => {
            if (editor) editor.chain().focus().toggleTaskList().run();
        });

        // Block elements
        document.getElementById('btn-blockquote')?.addEventListener('click', () => {
            if (editor) editor.chain().focus().toggleBlockquote().run();
        });
        document.getElementById('btn-code-block')?.addEventListener('click', () => {
            if (editor) editor.chain().focus().toggleCodeBlock().run();
        });
        document.getElementById('btn-hr')?.addEventListener('click', () => {
            if (editor) editor.chain().focus().setHorizontalRule().run();
        });

        // Tables - Size Picker
        const tableBtn = document.getElementById('btn-table');
        const tablePicker = document.getElementById('table-picker');
        const tablePickerGrid = document.getElementById('table-picker-grid');
        const tablePickerLabel = document.getElementById('table-picker-label');
        
        // Create 10x10 grid
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const cell = document.createElement('div');
                cell.className = 'table-picker-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                tablePickerGrid.appendChild(cell);
            }
        }
        
        // Toggle picker visibility
        tableBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            tablePicker.classList.toggle('visible');
        });
        
        // Handle cell hover
        tablePickerGrid?.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('table-picker-cell')) {
                const hoveredRow = parseInt(e.target.dataset.row);
                const hoveredCol = parseInt(e.target.dataset.col);
                
                // Highlight all cells up to hovered cell
                const cells = tablePickerGrid.querySelectorAll('.table-picker-cell');
                cells.forEach(cell => {
                    const cellRow = parseInt(cell.dataset.row);
                    const cellCol = parseInt(cell.dataset.col);
                    
                    if (cellRow <= hoveredRow && cellCol <= hoveredCol) {
                        cell.classList.add('highlighted');
                    } else {
                        cell.classList.remove('highlighted');
                    }
                });
                
                // Update label
                tablePickerLabel.textContent = `${hoveredCol + 1}x${hoveredRow + 1} Table`;
            }
        });
        
        // Handle cell click
        tablePickerGrid?.addEventListener('click', (e) => {
            if (e.target.classList.contains('table-picker-cell')) {
                const rows = parseInt(e.target.dataset.row) + 1;
                const cols = parseInt(e.target.dataset.col) + 1;
                
                if (editor) {
                    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                }
                
                // Hide picker
                tablePicker.classList.remove('visible');
                
                // Reset highlights
                const cells = tablePickerGrid.querySelectorAll('.table-picker-cell');
                cells.forEach(cell => cell.classList.remove('highlighted'));
                tablePickerLabel.textContent = '1x1 Table';
            }
        });
        
        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (tablePicker && !tablePicker.contains(e.target) && e.target !== tableBtn) {
                tablePicker.classList.remove('visible');
            }
        });


        // Link
        document.getElementById('btn-link')?.addEventListener('click', () => {
            if (!editor) return;
            if (selectedImage) {
                addLinkToImage();
            } else {
                showLinkDialog();
            }
        });

        // Image
        document.getElementById('btn-image')?.addEventListener('click', () => {
            if (!editor) return;
            showImageDialog();
        });
    }

    function showLinkDialog() {
        if (!editor || !linkTextInput || !linkUrlInput || !linkDialog) return;

        // Get current selection
        const { state } = editor;
        const { from, to } = state.selection;
        const selectedText = state.doc.textBetween(from, to, ' ');

        // Pre-fill text field if there's a selection
        if (selectedText) {
            linkTextInput.value = selectedText;
            linkTextInput.disabled = true;
        } else {
            linkTextInput.value = '';
            linkTextInput.disabled = false;
        }
        linkUrlInput.value = 'https://';

        linkDialog.classList.add('visible');
        linkUrlInput.focus();
        linkUrlInput.select();
    }

    function hideLinkDialog() {
        if (!linkDialog || !linkTextInput || !linkUrlInput) return;
        linkDialog.classList.remove('visible');
        linkTextInput.value = '';
        linkUrlInput.value = '';
        linkTextInput.disabled = false; // Re-enable in case it was disabled for image links
        
        // Restore normal insert behavior
        if (linkInsertBtn) {
            linkInsertBtn.onclick = insertLink;
        }
    }

    function insertLink() {
        if (!editor || !linkTextInput || !linkUrlInput) return;

        const text = linkTextInput.value.trim();
        const url = linkUrlInput.value.trim();

        if (!url) return;

        const { state } = editor;
        const { from, to } = state.selection;
        const selectedText = state.doc.textBetween(from, to, ' ');

        if (selectedText) {
            // If there was selected text, apply link to it
            editor.chain().focus().setLink({ href: url }).run();
        } else if (text) {
            // No selection, insert new link with text
            editor.chain().focus()
                .insertContent(`<a href="${url}">${text}</a>`)
                .run();
        }

        hideLinkDialog();
    }

    function showImageDialog() {
        if (!imageUrlInput || !imageAltInput || !imageDialog) return;
        imageUrlInput.value = 'https://';
        imageAltInput.value = '';
        imageDialog.classList.add('visible');
        imageUrlInput.focus();
        imageUrlInput.select();
    }

    function hideImageDialog() {
        if (!imageDialog || !imageUrlInput || !imageAltInput) return;
        imageDialog.classList.remove('visible');
        imageUrlInput.value = '';
        imageAltInput.value = '';
    }

    function insertImage() {
        if (!editor || !imageUrlInput || !imageAltInput) return;

        const url = imageUrlInput.value.trim();
        const alt = imageAltInput.value.trim();

        if (!url) return;

        editor.chain().focus().setImage({ src: url, alt: alt }).run();
        hideImageDialog();
    }

    // Setup all dialog and context menu event listeners
    function setupDialogListeners() {
        if (!linkCancelBtn || !linkInsertBtn || !linkUrlInput || !linkTextInput) return;
        if (!imageCancelBtn || !imageInsertBtn || !imageUrlInput || !imageAltInput) return;
        if (!ctxAddLink || !ctxBold || !ctxItalic) return;

        // Dialog event listeners
        linkCancelBtn.addEventListener('click', hideLinkDialog);
        linkInsertBtn.addEventListener('click', () => {
            console.log('linkInsertBtn clicked', { isImageContextMenu, isLinkContextMenu, selectedImage });
            
            const linkUrl = linkUrlInput.value.trim();
            console.log('Link URL:', linkUrl);
            
            if ((isImageContextMenu || (isLinkContextMenu && selectedImage)) && selectedImage) {
                // Wrap image in link using TipTap commands
                console.log('Link insert clicked for image');
                
                if (linkUrl && editor) {
                    console.log('Applying link to image via TipTap');
                    
                    // Find the position of the image in the editor
                    const pos = editor.view.posAtDOM(selectedImage, 0);
                    console.log('Image position found:', pos);
                    
                    if (pos > -1) {
                        // Select the image node
                        const tr = editor.state.tr.setSelection(
                            globalWindow.TipTap.TextSelection.create(editor.state.doc, pos, pos + 1)
                        );
                        editor.view.dispatch(tr);
                        
                        // Apply the link mark
                        editor.chain().focus().setLink({ href: linkUrl }).run();
                        console.log('Link mark applied to image');
                    }
                }
                hideLinkDialog();
            } else {
                // Normal link insertion/editing for text
                console.log('Calling insertLink for text');
                
                if (linkUrl) {
                    // If we're editing an existing link, setLink will update it
                    // If we're creating a new one, it will create it
                    editor.chain().focus().setLink({ href: linkUrl }).run();
                } else {
                    // If URL is empty, remove link
                    editor.chain().focus().unsetLink().run();
                }
                hideLinkDialog();
            }
        });
        linkUrlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                insertLink();
            } else if (e.key === 'Escape') {
                hideLinkDialog();
            }
        });
        linkTextInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (linkUrlInput) linkUrlInput.focus();
            } else if (e.key === 'Escape') {
                hideLinkDialog();
            }
        });

        imageCancelBtn.addEventListener('click', hideImageDialog);
        imageInsertBtn.addEventListener('click', insertImage);
        imageUrlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                insertImage();
            } else if (e.key === 'Escape') {
                hideImageDialog();
            }
        });
        imageAltInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                insertImage();
            } else if (e.key === 'Escape') {
                hideImageDialog();
            }
        });

        // Close dialogs when clicking outside
        if (linkDialog) {
            linkDialog.addEventListener('click', (e) => {
                if (e.target === linkDialog) {
                    hideLinkDialog();
                }
            });
        }
        if (imageDialog) {
            imageDialog.addEventListener('click', (e) => {
                if (e.target === imageDialog) {
                    hideImageDialog();
                }
            });
        }

        // Context menu event listeners
        ctxAddLink.addEventListener('click', () => {
            console.log('ctxAddLink clicked', { isImageContextMenu, isLinkContextMenu });
            // Check flags BEFORE hiding menu
            const wasImageContext = isImageContextMenu;
            const wasLinkContext = isLinkContextMenu;
            hideContextMenu();
            
            if (wasImageContext) {
                console.log('Calling editSelectedImage from ctxAddLink');
                editSelectedImage();
            } else if (wasLinkContext) {
                console.log('Calling editLink from ctxAddLink');
                editLink();
            } else {
                console.log('Calling showLinkDialog from ctxAddLink');
                showLinkDialog();
            }
        });

        ctxBold.addEventListener('click', () => {
            console.log('ctxBold clicked', { isImageContextMenu, isLinkContextMenu });
            // Check flags BEFORE hiding menu
            const wasImageContext = isImageContextMenu;
            hideContextMenu();
            
            if (wasImageContext) {
                console.log('Calling addLinkToImage from ctxBold');
                addLinkToImage();
            } else {
                console.log('Calling toggleBold from ctxBold');
                if (editor) editor.chain().focus().toggleBold().run();
            }
        });

        ctxItalic.addEventListener('click', () => {
            hideContextMenu();
            if (editor) editor.chain().focus().toggleItalic().run();
        });

        // Hide context menu on click anywhere else
        document.addEventListener('click', (e) => {
            if (contextMenu && !contextMenu.contains(e.target)) {
                hideContextMenu();
            }
        });

        // Hide context menu on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideContextMenu();
            }
        });
    }

    // Context menu functions
    function showContextMenu(x, y) {
        if (!contextMenu) return;
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.add('visible');
    }

    function hideContextMenu() {
        console.log('hideContextMenu called, resetting flags');
        if (!contextMenu) return;
        contextMenu.classList.remove('visible');
        
        // Reset flags
        isImageContextMenu = false;
        isLinkContextMenu = false;
        console.log('Flags reset');
        
        // Restore buttons to original state
        if (ctxBold) {
            ctxBold.style.display = 'flex';
            ctxBold.textContent = 'B';
        }
        if (ctxItalic) ctxItalic.style.display = 'flex';
        if (ctxAddLink) {
            ctxAddLink.textContent = '🔗 Add Link';
            ctxAddLink.style.display = 'flex';
        }
    }

    function showImageContextMenu(x, y) {
        console.log('showImageContextMenu called at', { x, y });
        if (!contextMenu) return;
        
        // Set flag to indicate image context menu
        isImageContextMenu = true;
        isLinkContextMenu = false;
        console.log('isImageContextMenu set to true');
        
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.add('visible');
        
        // Repurpose Bold button for "Add Link"
        if (ctxBold) {
            ctxBold.style.display = 'block';
            ctxBold.textContent = '🔗 Add Link';
            console.log('ctxBold updated to "Add Link"');
        }
        if (ctxItalic) ctxItalic.style.display = 'none';
        
        // Change "Add Link" to "Edit Image"
        if (ctxAddLink) {
            ctxAddLink.textContent = '🖼 Edit Image';
            ctxAddLink.style.display = 'block';
            console.log('ctxAddLink updated to "Edit Image"');
        }
    }

    function showLinkContextMenu(x, y) {
        console.log('showLinkContextMenu called at', { x, y, selectedImage });
        if (!contextMenu) return;
        
        // Set flag to indicate link context menu
        isLinkContextMenu = true;
        
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.add('visible');
        
        if (selectedImage) {
            // Linked Image: Show both options
            isImageContextMenu = true;
            console.log('isLinkContextMenu AND isImageContextMenu set to true');
            
            // ctxBold -> Edit Link (via addLinkToImage)
            if (ctxBold) {
                ctxBold.style.display = 'block';
                ctxBold.textContent = '🔗 Edit Link';
            }
            
            // ctxAddLink -> Edit Image (via editSelectedImage)
            if (ctxAddLink) {
                ctxAddLink.textContent = '🖼 Edit Image';
                ctxAddLink.style.display = 'block';
            }
            
            if (ctxItalic) ctxItalic.style.display = 'none';
            
        } else {
            // Text Link: Show only Edit Link
            isImageContextMenu = false;
            console.log('isLinkContextMenu set to true');
            
            // Hide formatting buttons
            if (ctxBold) ctxBold.style.display = 'none';
            if (ctxItalic) ctxItalic.style.display = 'none';
            
            // Change "Add Link" to "Edit Link"
            if (ctxAddLink) {
                ctxAddLink.textContent = '🔗 Edit Link';
                ctxAddLink.style.display = 'block';
                console.log('ctxAddLink updated to "Edit Link"');
            }
        }
    }

    // Table context menu functions
    function showTableContextMenu(x, y) {
        const tableContextMenu = document.getElementById('table-context-menu');
        if (!tableContextMenu) return;
        
        // Hide other context menus
        hideContextMenu();
        
        tableContextMenu.style.left = `${x}px`;
        tableContextMenu.style.top = `${y}px`;
        tableContextMenu.classList.add('visible');
        
        // Setup table context menu listeners if not already done
        if (!tableContextMenu.dataset.listenersSetup) {
            document.getElementById('ctx-table-insert-row-above')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().addRowBefore().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-insert-row-below')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().addRowAfter().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-insert-col-left')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().addColumnBefore().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-insert-col-right')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().addColumnAfter().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-delete-row')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().deleteRow().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-delete-col')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().deleteColumn().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-delete-table')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().deleteTable().run();
                hideTableContextMenu();
            });
            
            // Hide on click outside
            document.addEventListener('click', (e) => {
                if (tableContextMenu && !tableContextMenu.contains(e.target)) {
                    hideTableContextMenu();
                }
            });
            
            // Hide on escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    hideTableContextMenu();
                }
            });
            
            tableContextMenu.dataset.listenersSetup = 'true';
        }
    }
    
    function hideTableContextMenu() {
        const tableContextMenu = document.getElementById('table-context-menu');
        if (!tableContextMenu) return;
        tableContextMenu.classList.remove('visible');
    }

    // Table context menu functions
    function showTableContextMenu(x, y) {
        const tableContextMenu = document.getElementById('table-context-menu');
        if (!tableContextMenu) return;
        
        // Hide other context menus
        hideContextMenu();
        
        tableContextMenu.style.left = `${x}px`;
        tableContextMenu.style.top = `${y}px`;
        tableContextMenu.classList.add('visible');
        
        // Setup table context menu listeners if not already done
        if (!tableContextMenu.dataset.listenersSetup) {
            document.getElementById('ctx-table-insert-row-above')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().addRowBefore().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-insert-row-below')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().addRowAfter().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-insert-col-left')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().addColumnBefore().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-insert-col-right')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().addColumnAfter().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-delete-row')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().deleteRow().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-delete-col')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().deleteColumn().run();
                hideTableContextMenu();
            });
            
            document.getElementById('ctx-table-delete-table')?.addEventListener('click', () => {
                if (editor) editor.chain().focus().deleteTable().run();
                hideTableContextMenu();
            });
            
            // Hide on click outside
            document.addEventListener('click', (e) => {
                if (tableContextMenu && !tableContextMenu.contains(e.target)) {
                    hideTableContextMenu();
                }
            });
            
            // Hide on escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    hideTableContextMenu();
                }
            });
            
            tableContextMenu.dataset.listenersSetup = 'true';
        }
    }
    
    function hideTableContextMenu() {
        const tableContextMenu = document.getElementById('table-context-menu');
        if (!tableContextMenu) return;
        tableContextMenu.classList.remove('visible');
    }

    function editSelectedImage() {
        if (!selectedImage || !editor) return;
        
        // Get current image attributes
        const currentSrc = selectedImage.getAttribute('src') || '';
        const currentAlt = selectedImage.getAttribute('alt') || '';
        
        // Pre-fill the image dialog
        if (imageUrlInput && imageAltInput && imageDialog) {
            imageUrlInput.value = currentSrc;
            imageAltInput.value = currentAlt;
            imageDialog.classList.add('visible');
            imageUrlInput.focus();
            imageUrlInput.select();
            
            // Override the insert button to update instead
            if (imageInsertBtn) {
                imageInsertBtn.onclick = () => {
                    const newSrc = imageUrlInput.value.trim();
                    const newAlt = imageAltInput.value.trim();
                    
                    if (newSrc && selectedImage) {
                        selectedImage.setAttribute('src', newSrc);
                        selectedImage.setAttribute('alt', newAlt);
                        
                        // Trigger editor update
                        if (editor) {
                            const html = editor.getHTML();
                            state.content = convertHTMLToMarkdown(html);
                            state.lastSavedContent = state.content;
                            vscode.postMessage({
                                type: 'updateData',
                                text: state.content
                            });
                        }
                    }
                    
                    hideImageDialog();
                    // Restore normal insert behavior
                    if (imageInsertBtn) {
                        imageInsertBtn.onclick = insertImage;
                    }
                };
            }
        }
    }

    function deleteSelectedImage() {
        if (!selectedImage || !editor) return;
        
        // Remove the image from the DOM
        selectedImage.remove();
        selectedImage = null;
        
        // Trigger editor update
        const html = editor.getHTML();
        state.content = convertHTMLToMarkdown(html);
        state.lastSavedContent = state.content;
        vscode.postMessage({
            type: 'updateData',
            text: state.content
        });
    }

    function editLink() {
        console.log('editLink called', { selectedLink, editor });
        if (!selectedLink || !editor) return;
        
        const href = selectedLink.getAttribute('href');
        const text = selectedLink.textContent; // This might be empty for images, which is fine
        
        console.log('Link details:', { href, text });
        
        if (linkTextInput && linkUrlInput && linkDialog) {
            // If it's an image link, we want to show the image markdown
            if (selectedImage && selectedLink.contains(selectedImage)) {
                const imageSrc = selectedImage.getAttribute('src') || '';
                const imageAlt = selectedImage.getAttribute('alt') || '';
                linkTextInput.value = `![${imageAlt}](${imageSrc})`;
                linkTextInput.disabled = true;
            } else {
                linkTextInput.value = text || '';
                linkTextInput.disabled = false;
            }
            
            linkUrlInput.value = href || 'https://';
            
            linkDialog.classList.add('visible');
            linkUrlInput.focus();
            linkUrlInput.select();
        }
    }

    function addLinkToImage() {
        console.log('addLinkToImage called', { selectedImage, editor, linkDialog, linkTextInput, linkUrlInput });
        
        if (!selectedImage || !editor) {
            console.log('Early return: no selectedImage or editor');
            return;
        }
        
        // Get current image attributes
        const imageSrc = selectedImage.getAttribute('src') || '';
        const imageAlt = selectedImage.getAttribute('alt') || '';
        
        // Check if image is already linked
        const parentLink = selectedImage.closest('a');
        const currentHref = parentLink ? parentLink.getAttribute('href') : 'https://';
        
        console.log('Image details:', { imageSrc, imageAlt, currentHref });
        
        // Show link dialog to get the URL
        if (linkTextInput && linkUrlInput && linkDialog) {
            console.log('Showing link dialog');
            
            // Pre-fill with full image markdown syntax
            const imageMarkdown = `![${imageAlt}](${imageSrc})`;
            linkTextInput.value = imageMarkdown;
            linkTextInput.disabled = true;
            linkUrlInput.value = currentHref;
            
            linkDialog.classList.add('visible');
            linkUrlInput.focus();
            linkUrlInput.select();
            
            // We need to override the default insert behavior for images
            // The linkInsertBtn listener we added earlier handles the logic,
            // but we need to make sure it uses TipTap commands now.
        } else {
            console.log('Missing dialog elements:', { linkTextInput, linkUrlInput, linkDialog });
        }
    }

    function updateToolbarState() {
        if (!editor) return;

        // Update active states
        /**
         * @param {string} id
         * @param {boolean} isActive
         */
        const updateButton = (id, isActive) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.classList.toggle('active', isActive);
            }
        };

        updateButton('btn-bold', editor.isActive('bold'));
        updateButton('btn-italic', editor.isActive('italic'));
        updateButton('btn-strike', editor.isActive('strike'));
        updateButton('btn-code', editor.isActive('code'));
        updateButton('btn-highlight', editor.isActive('highlight'));
        updateButton('btn-blockquote', editor.isActive('blockquote'));
        updateButton('btn-code-block', editor.isActive('codeBlock'));
        updateButton('btn-bullet-list', editor.isActive('bulletList'));
        updateButton('btn-ordered-list', editor.isActive('orderedList'));
        updateButton('btn-task-list', editor.isActive('taskList'));

        for (let level = 1; level <= 6; level++) {
            updateButton(`btn-h${level}`, editor.isActive('heading', { level }));
        }
    }

    /**
     * Simple Markdown to HTML converter
     * @param {string} text 
     */
    function convertMarkdownToHTML(text) {
        if (!text) return '';
        
        let html = text
            // Escape HTML
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Headers
            .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
            .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Strikethrough
            .replace(/~~(.+?)~~/g, '<s>$1</s>')
            // Inline code
            .replace(/`(.+?)`/g, '<code>$1</code>')
            // Task lists
            .replace(/^- \[ \] (.*$)/gim, '<ul data-type="taskList"><li data-type="taskItem" data-checked="false">$1</li></ul>')
            .replace(/^- \[x\] (.*$)/gim, '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">$1</li></ul>')
            // Lists
            .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
            .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
            .replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
            // Merge adjacent lists
            .replace(/<\/ul>\s*<ul>/gim, '')
            .replace(/<\/ol>\s*<ol>/gim, '')
            // Blockquote
            .replace(/^&gt; (.*$)/gim, '<blockquote><p>$1</p></blockquote>')
            .replace(/<\/blockquote>\s*<blockquote>/gim, '')
            // Horizontal rule
            .replace(/^---$/gim, '<hr>')
            // Links [text](url)
            .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
            // Images ![alt](url)
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" />')
            // Paragraphs
            .replace(/\n\n/gim, '</p><p>')
            .replace(/\n/gim, '<br>');
        
        return '<p>' + html + '</p>';
    }


    /**
     * @param {HTMLElement} container 
     */
    function attachLinkListeners(container) {
        console.log('attachLinkListeners called');
        
        // Use event delegation for click handling to catch all links
        container.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // Prevent default browser navigation for ALL links in the webview
            e.preventDefault();
            e.stopPropagation();

            console.log('Intercepted click on:', href);

            // Check if it's an external link
            if (href.startsWith('http://') || href.startsWith('https://')) {
                vscode.postMessage({
                    type: 'openExternal',
                    url: href
                });
                return;
            }
            
            // Internal link - assume openFile
            vscode.postMessage({
                type: 'openFile',
                path: href
            });
        });

        // Keep mouseenter/mouseleave for preview popovers on specific file types
        const links = container.querySelectorAll('a');
        console.log('Found links count:', links.length);
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            // Check if it's a D&D file link (relative path)
            if (href.endsWith('.dndchar') || href.endsWith('.dnditem') ||
                href.endsWith('.dndmap') || href.endsWith('.dndnotes') || 
                href.endsWith('.dndstat') || href.endsWith('.dndspell')) {
                
                link.addEventListener('mouseenter', (e) => {
                    vscode.postMessage({
                        type: 'getPreview',
                        path: href,
                        x: e.clientX,
                        y: e.clientY
                    });
                });

                link.addEventListener('mouseleave', () => {
                    popover.classList.remove('visible');
                });
            }
        });
    }

    /**
     * @param {any} data 
     * @param {number} x 
     * @param {number} y 
     */
    function renderItemPreview(data) {
        let details = [];
        if (data.damage) {
            details.push(`<b>Damage:</b> ${data.damage.dice} ${data.damage.type}`);
        }
        if (data.armorClass) {
            let acText = `${data.armorClass.base}`;
            if (data.armorClass.dexBonus) acText += ' + Dex';
            if (data.armorClass.maxBonus) acText += ` (max ${data.armorClass.maxBonus})`;
            details.push(`<b>AC:</b> ${acText}`);
        }
        if (data.properties && data.properties.length > 0) {
            details.push(`<b>Properties:</b> ${data.properties.join(', ')}`);
        }
        
        let meta = [];
        if (data.weight) meta.push(`Weight: ${data.weight} lb.`);
        if (data.value) meta.push(`Value: ${data.value} gp`);

        let attunementText = '';
        if (data.attunement) {
            attunementText = ' (Requires Attunement';
            if (data.attunementRequirement) attunementText += ` by ${data.attunementRequirement}`;
            attunementText += ')';
        }

        return `
            <div class="popover-title">${data.name}</div>
            <div class="popover-detail" style="font-style: italic;">
                ${data.rarity || ''} ${data.itemType || ''} ${data.subtype ? `(${data.subtype})` : ''}${attunementText}
            </div>
            ${details.map(d => `<div class="popover-detail">${d}</div>`).join('')}
            ${meta.length ? `<div class="popover-detail">${meta.join(' | ')}</div>` : ''}
            <div class="popover-detail" style="margin-top: 8px; max-height: 100px; overflow-y: auto;">
                ${(data.description || '').substring(0, 300)}${data.description?.length > 300 ? '...' : ''}
            </div>
        `;
    }

    /**
     * @param {any} data
     */
    function renderCharacterPreview(data) {
        let statsHtml = '';
        if (data.stats) {
            const mod = (score) => {
                const m = Math.floor((score - 10) / 2);
                return m >= 0 ? `+${m}` : `${m}`;
            };
            statsHtml = `
                <div class="popover-detail" style="margin-top: 8px; display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; text-align: center; font-size: 11px;">
                    <div><b>STR</b><br>${data.stats.str} (${mod(data.stats.str)})</div>
                    <div><b>DEX</b><br>${data.stats.dex} (${mod(data.stats.dex)})</div>
                    <div><b>CON</b><br>${data.stats.con} (${mod(data.stats.con)})</div>
                    <div><b>INT</b><br>${data.stats.int} (${mod(data.stats.int)})</div>
                    <div><b>WIS</b><br>${data.stats.wis} (${mod(data.stats.wis)})</div>
                    <div><b>CHA</b><br>${data.stats.cha} (${mod(data.stats.cha)})</div>
                </div>
            `;
        }

        return `
            <div class="popover-title">${data.name}</div>
            <div class="popover-detail" style="font-style: italic;">
                ${data.race || ''} ${data.class || ''} ${data.level ? `Level ${data.level}` : ''}
            </div>
            <div class="popover-detail" style="font-style: italic; font-size: 12px; margin-bottom: 4px;">
                ${data.background || ''} • ${data.alignment || ''}
            </div>
            <div class="popover-detail">
                <b>AC:</b> ${data.ac || '?'} &nbsp;|&nbsp; <b>HP:</b> ${data.hp} &nbsp;|&nbsp; <b>Spd:</b> ${data.speed || '?'}
            </div>
            ${statsHtml}
        `;
    }

    function renderMonsterPreview(data) {
        const sizeMap = { 'T': 'Tiny', 'S': 'Small', 'M': 'Medium', 'L': 'Large', 'H': 'Huge', 'G': 'Gargantuan' };
        const size = sizeMap[data.size] || data.size;
        
        let statsHtml = '';
        if (data.stats) {
            const mod = (score) => {
                const m = Math.floor((score - 10) / 2);
                return m >= 0 ? `+${m}` : `${m}`;
            };
            statsHtml = `
                <div class="popover-detail" style="margin-top: 8px; display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; text-align: center; font-size: 11px;">
                    <div><b>STR</b><br>${data.stats.str} (${mod(data.stats.str)})</div>
                    <div><b>DEX</b><br>${data.stats.dex} (${mod(data.stats.dex)})</div>
                    <div><b>CON</b><br>${data.stats.con} (${mod(data.stats.con)})</div>
                    <div><b>INT</b><br>${data.stats.int} (${mod(data.stats.int)})</div>
                    <div><b>WIS</b><br>${data.stats.wis} (${mod(data.stats.wis)})</div>
                    <div><b>CHA</b><br>${data.stats.cha} (${mod(data.stats.cha)})</div>
                </div>
            `;
        }

        return `
            <div class="popover-title">${data.name}</div>
            <div class="popover-detail" style="font-style: italic;">${size} ${data.monsterType}, ${data.alignment || 'Unaligned'}</div>
            <div class="popover-detail">
                <b>AC:</b> ${data.ac} &nbsp;|&nbsp; <b>HP:</b> ${data.hp} &nbsp;|&nbsp; <b>Spd:</b> ${data.speed}
            </div>
            ${statsHtml}
            <div class="popover-detail" style="margin-top: 8px;"><b>CR:</b> ${data.cr}</div>
        `;
    }

    /**
     * @param {any} data 
     * @param {number} x 
     * @param {number} y 
     * @param {number} y 
     */
    function showPopover(data, x, y) {
        if (!data) return;

        let html = '';
        if (data.type === 'item') {
            html = renderItemPreview(data);
        } else if (data.type === 'character') {
            html = renderCharacterPreview(data);
        } else if (data.type === 'map') {
            html = `
                <div class="popover-title">Map</div>
                ${data.imageSrc ? `<img src="${data.imageSrc}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;">` : ''}
                <div class="popover-detail"><b>Pins:</b> ${data.pinCount}</div>
            `;
        } else if (data.type === 'notes') {
            html = `<div class="popover-title">${data.title || 'Note'}</div>`;
            if (data.headers && data.headers.length > 0) {
                html += '<div class="popover-detail" style="display: flex; flex-direction: column; gap: 4px;">';
                data.headers.forEach(header => {
                    const indent = (header.level - 1) * 12;
                    html += `<div style="padding-left: ${indent}px; font-size: 12px;">• ${header.text}</div>`;
                });
                html += '</div>';
            } else {
                html += '<div class="popover-detail"><i>No headers found</i></div>';
            }
        } else if (data.type === 'stat') {
            html = renderMonsterPreview(data);

        } else if (data.type === 'spell') {
            const levelText = data.level === 0 ? 'Cantrip' : `Level ${data.level}`;
            let tags = [];
            if (data.concentration) tags.push('Concentration');
            if (data.ritual) tags.push('Ritual');

            html = `
                <div class="popover-title">${data.name}</div>
                <div class="popover-detail" style="font-style: italic; margin-bottom: 8px;">
                    ${levelText} ${data.school}${tags.length ? ' (' + tags.join(', ') + ')' : ''}
                </div>
                <div class="popover-detail"><b>Casting Time:</b> ${data.castingTime}</div>
                <div class="popover-detail"><b>Range:</b> ${data.range}</div>
                <div class="popover-detail"><b>Components:</b> ${data.components}</div>
                <div class="popover-detail"><b>Duration:</b> ${data.duration}</div>
                <div class="popover-detail" style="margin-top: 8px; max-height: 100px; overflow-y: auto;">
                    ${(data.description || '').substring(0, 300)}${data.description?.length > 300 ? '...' : ''}
                </div>
            `;
        }

        popover.innerHTML = html;
        popover.style.left = `${x + 10}px`;
        popover.style.top = `${y + 10}px`;
        popover.classList.add('visible');
    }

    // ========== Compendium Integration ==========

    // Compendium dialog elements
    const compendiumDialog = document.getElementById('compendium-dialog');
    const compendiumTypeSelect = /** @type {HTMLSelectElement} */ (document.getElementById('compendium-type'));
    const compendiumSearchInput = /** @type {HTMLInputElement} */ (document.getElementById('compendium-search'));
    const compendiumResults = document.getElementById('compendium-results');
    const compendiumCancelBtn = document.getElementById('compendium-cancel');
    const compendiumTooltip = document.getElementById('compendium-tooltip');

    let compendiumRequestId = 0;
    /** @type {any} */
    let compendiumSearchTimeout;

    // Setup compendium button
    document.getElementById('btn-compendium')?.addEventListener('click', () => {
        showCompendiumDialog();
    });

    function showCompendiumDialog() {
        if (!compendiumDialog) return;
        compendiumSearchInput.value = '';
        compendiumResults.innerHTML = '';
        compendiumResults.style.display = 'none';
        compendiumDialog.classList.add('visible');
        compendiumSearchInput.focus();
    }

    function hideCompendiumDialog() {
        if (!compendiumDialog) return;
        compendiumDialog.classList.remove('visible');
    }

    compendiumCancelBtn?.addEventListener('click', hideCompendiumDialog);

    compendiumDialog?.addEventListener('click', (e) => {
        if (e.target === compendiumDialog) {
            hideCompendiumDialog();
        }
    });

    // Debounced compendium search
    compendiumSearchInput?.addEventListener('input', () => {
        clearTimeout(compendiumSearchTimeout);
        compendiumSearchTimeout = setTimeout(() => {
            const query = compendiumSearchInput.value.trim();
            if (query.length >= 2) {
                searchCompendium(query);
            } else {
                compendiumResults.innerHTML = '';
                compendiumResults.style.display = 'none';
            }
        }, 150);
    });

    compendiumSearchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideCompendiumDialog();
        }
    });

    /**
     * Search compendium
     * @param {string} query
     */
    function searchCompendium(query) {
        const requestId = ++compendiumRequestId;
        const searchType = compendiumTypeSelect?.value || 'all';

        vscode.postMessage({
            type: 'searchCompendium',
            requestId: requestId,
            query: query,
            searchType: searchType
        });
    }

    // Handle compendium search results
    window.addEventListener('message', event => {
        const message = event.data;

        if (message.type === 'compendiumSearchResults') {
            displayCompendiumResults(message.results);
        } else if (message.type === 'compendiumEntryData') {
            showCompendiumTooltip(message.data, message.x, message.y);
        }
    });

    /**
     * Display search results
     * @param {any[]} results
     */
    function displayCompendiumResults(results) {
        if (!compendiumResults) return;

        if (results.length === 0) {
            compendiumResults.innerHTML = '<div style="padding: 12px; color: var(--vscode-descriptionForeground);">No results found</div>';
            compendiumResults.style.display = 'block';
            return;
        }

        const typeIcons = { spell: '✨', monster: '👹', item: '⚔️' };

        compendiumResults.innerHTML = results.map(r => `
            <div class="compendium-result-item" data-type="${r.type}" data-name="${r.name}" style="
                padding: 10px 12px;
                cursor: pointer;
                border-bottom: 1px solid var(--vscode-panel-border);
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <span style="font-size: 16px;">${typeIcons[r.type] || '📄'}</span>
                <div>
                    <div style="font-weight: 500;">
                        ${r.name}
                        ${r.isCustom ? '<span style="color: var(--vscode-charts-purple, #b180d7); font-size: 10px; margin-left: 6px;">★ Custom</span>' : ''}
                    </div>
                    <div style="font-size: 11px; color: var(--vscode-descriptionForeground);">${r.subtitle}</div>
                </div>
            </div>
        `).join('');

        compendiumResults.style.display = 'block';

        // Add click handlers
        compendiumResults.querySelectorAll('.compendium-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.getAttribute('data-type');
                const name = item.getAttribute('data-name');
                insertCompendiumReference(type, name);
                hideCompendiumDialog();
            });

            item.addEventListener('mouseenter', () => {
                // @ts-ignore
                item.style.background = 'var(--vscode-list-hoverBackground, #2a2d2e)';
            });
            item.addEventListener('mouseleave', () => {
                // @ts-ignore
                item.style.background = 'transparent';
            });
        });
    }

    /**
     * Insert compendium reference at cursor
     * @param {string} type
     * @param {string} name
     */
    function insertCompendiumReference(type, name) {
        if (!editor) return;

        const reference = `@${type}[${name}]`;
        editor.chain().focus().insertContent(reference).run();
    }

    /**
     * Show compendium tooltip
     * @param {any} data
     * @param {number} x
     * @param {number} y
     */
    function showCompendiumTooltip(data, x, y) {
        if (!compendiumTooltip || !data) {
            if (compendiumTooltip) compendiumTooltip.style.display = 'none';
            return;
        }

        let html = '';

        if (data.type === 'spell') {
            const levelText = data.level === 0 ? 'Cantrip' : `Level ${data.level}`;
            let tags = [];
            if (data.concentration) tags.push('Concentration');
            if (data.ritual) tags.push('Ritual');

            html = `
                <div class="popover-title">${data.name}</div>
                <div class="popover-detail" style="font-style: italic; margin-bottom: 8px;">
                    ${levelText} ${data.school}${tags.length ? ' (' + tags.join(', ') + ')' : ''}
                </div>
                <div class="popover-detail"><b>Casting Time:</b> ${data.castingTime}</div>
                <div class="popover-detail"><b>Range:</b> ${data.range}</div>
                <div class="popover-detail"><b>Components:</b> ${data.components}</div>
                <div class="popover-detail"><b>Duration:</b> ${data.duration}</div>
                <div class="popover-detail" style="margin-top: 8px; max-height: 100px; overflow-y: auto;">
                    ${(data.description || '').substring(0, 300)}${data.description?.length > 300 ? '...' : ''}
                </div>
            `;
        } else if (data.type === 'monster') {
            html = renderMonsterPreview(data);
        } else if (data.type === 'item') {
            html = renderItemPreview(data);
        }

        compendiumTooltip.innerHTML = html;
        compendiumTooltip.style.display = 'block';
        compendiumTooltip.style.left = `${x + 10}px`;
        compendiumTooltip.style.top = `${y + 10}px`;
    }

    function hideCompendiumTooltip() {
        if (compendiumTooltip) {
            compendiumTooltip.style.display = 'none';
        }
    }

    /**
     * Attach compendium reference hover listeners to container
     * @param {HTMLElement} container
     */
    function attachCompendiumListeners(container) {
        // Find all compendium references in text
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];

        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        textNodes.forEach(node => {
            const text = node.textContent || '';
            const regex = /@(spell|monster|item)\[([^\]]+)\]/gi;

            if (regex.test(text)) {
                // Wrap matches in spans
                const parent = node.parentNode;
                if (!parent) return;

                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                regex.lastIndex = 0;

                let match;
                while ((match = regex.exec(text)) !== null) {
                    // Add text before match
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                    }

                    // Create span for match
                    const span = document.createElement('span');
                    span.className = 'compendium-ref';
                    span.dataset.type = match[1].toLowerCase();
                    span.dataset.name = match[2];
                    span.textContent = match[0];
                    span.style.cssText = 'color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: underline dotted;';

                    // Add hover listeners
                    span.addEventListener('mouseenter', (e) => {
                        const type = span.dataset.type;
                        const name = span.dataset.name;
                        requestCompendiumEntry(type, name, e.clientX, e.clientY);
                    });

                    span.addEventListener('mouseleave', () => {
                        hideCompendiumTooltip();
                    });

                    // Add click listener to open compendium entry as file
                    span.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const type = span.dataset.type;
                        const name = span.dataset.name;
                        openCompendiumEntry(type, name);
                    });

                    fragment.appendChild(span);
                    lastIndex = regex.lastIndex;
                }

                // Add remaining text
                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                }

                parent.replaceChild(fragment, node);
            }
        });
    }

    /**
     * Request compendium entry for hover
     * @param {string} type
     * @param {string} name
     * @param {number} x
     * @param {number} y
     */
    function requestCompendiumEntry(type, name, x, y) {
        const requestId = ++compendiumRequestId;

        vscode.postMessage({
            type: 'getCompendiumEntry',
            requestId: requestId,
            entryType: type,
            name: name,
            x: x,
            y: y
        });
    }

    /**
     * Open compendium entry as a file
     * @param {string} type
     * @param {string} name
     */
    function openCompendiumEntry(type, name) {
        vscode.postMessage({
            type: 'openCompendiumEntry',
            entryType: type,
            name: name
        });
    }

    // Override attachLinkListeners to also attach compendium listeners
    const originalAttachLinkListeners = attachLinkListeners;
    // @ts-ignore
    attachLinkListeners = function(container) {
        originalAttachLinkListeners(container);
        attachCompendiumListeners(container);
    };

}());
