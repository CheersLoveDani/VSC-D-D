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

    /** @type {{ content: string, mode: 'read' | 'edit', rawMode: boolean, lastSavedContent: string }} */
    let state = {
        content: '',
        mode: 'read',
        rawMode: false,
        lastSavedContent: ''
    };

    /** @type {TipTapEditor | null} */
    let editor = null;
    /** @type {HTMLTextAreaElement | null} */
    let rawTextarea = null;

    // Initialize
    vscode.postMessage({ type: 'ready' });

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                // Normalize strings for comparison (ignore whitespace differences)
                const normalize = (str) => (str || '').replace(/\r\n/g, '\n').trim();
                const newContent = normalize(message.text);
                const currentContent = normalize(state.content);
                const lastSaved = normalize(state.lastSavedContent);

                // Ignore if content hasn't changed OR if it matches what we just saved (echo)
                if (newContent === currentContent || newContent === lastSaved) return;
                
                state.content = message.text;
                if (editor && !state.rawMode) {
                    // Only update if editor exists and we're in rich mode
                    // Use trySetMarkdownContent to handle conversion safely
                    trySetMarkdownContent(state.content);
                } else if (rawTextarea && state.rawMode) {
                    rawTextarea.value = state.content;
                }
                if (state.mode === 'read') {
                    render();
                }
                return;
            case 'previewData':
                showPopover(message.data, message.x, message.y);
                return;
        }
    });

    toggleBtn.addEventListener('click', () => {
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
            state.content = editor.storage.markdown?.getMarkdown() || convertHTMLToMarkdown(editor.getHTML());
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
            const preview = document.createElement('div');
            preview.className = 'markdown-preview';
            preview.innerHTML = simpleMarkdownToHTML(state.content);
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
                globalWindow.TipTap.Image,
                // Link is already included in StarterKit or bundle, removing duplicate
            ],
            content: '', // Start empty to avoid conversion issues
            onUpdate: ({ editor }) => {
                const html = editor.getHTML();
                state.content = convertHTMLToMarkdown(html);
                state.lastSavedContent = state.content;
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

        updateToolbarState();
        setupToolbarListeners();
    }

    /**
     * @param {string} markdown
     */
    function trySetMarkdownContent(markdown) {
        if (!editor || !markdown) return;
        
        // First, try to set it as HTML if it looks like it might have been converted
        // Otherwise, TipTap will treat it as plain text which is fine
        try {
            const html = simpleMarkdownToHTML(markdown);
            editor.commands.setContent(html);
        } catch (e) {
            console.error('Error setting content:', e);
            // Fallback: just set as plain text
            editor.commands.setContent(`<p>${markdown}</p>`);
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
                html += '<p></p>';
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
            // Horizontal rule
            else if (trimmed === '---' || trimmed === '***') {
                html += '<hr>';
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
     * Process inline markdown (bold, italic, links, etc.)
     * @param {string} text
     * @returns {string}
     */
    function processInlineMarkdown(text) {
        return text
            // Images
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
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
    }

    function setupToolbarListeners() {
        // Text formatting
        document.getElementById('btn-bold')?.addEventListener('click', () => {
            editor.chain().focus().toggleBold().run();
        });
        document.getElementById('btn-italic')?.addEventListener('click', () => {
            editor.chain().focus().toggleItalic().run();
        });
        document.getElementById('btn-strike')?.addEventListener('click', () => {
            editor.chain().focus().toggleStrike().run();
        });
        document.getElementById('btn-code')?.addEventListener('click', () => {
            editor.chain().focus().toggleCode().run();
        });
        document.getElementById('btn-highlight')?.addEventListener('click', () => {
            editor.chain().focus().toggleHighlight().run();
        });

        // Headings
        for (let i = 1; i <= 6; i++) {
            document.getElementById(`btn-h${i}`)?.addEventListener('click', () => {
                editor.chain().focus().toggleHeading({ level: i }).run();
            });
        }

        // Lists
        document.getElementById('btn-bullet-list')?.addEventListener('click', () => {
            editor.chain().focus().toggleBulletList().run();
        });
        document.getElementById('btn-ordered-list')?.addEventListener('click', () => {
            editor.chain().focus().toggleOrderedList().run();
        });
        document.getElementById('btn-task-list')?.addEventListener('click', () => {
            editor.chain().focus().toggleTaskList().run();
        });

        // Block elements
        document.getElementById('btn-blockquote')?.addEventListener('click', () => {
            editor.chain().focus().toggleBlockquote().run();
        });
        document.getElementById('btn-code-block')?.addEventListener('click', () => {
            editor.chain().focus().toggleCodeBlock().run();
        });
        document.getElementById('btn-hr')?.addEventListener('click', () => {
            editor.chain().focus().setHorizontalRule().run();
        });

        // Tables
        document.getElementById('btn-table')?.addEventListener('click', () => {
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        });

        // Link
        document.getElementById('btn-link')?.addEventListener('click', () => {
            const url = prompt('Enter URL:');
            if (url) {
                editor.chain().focus().setLink({ href: url }).run();
            }
        });

        // Image
        document.getElementById('btn-image')?.addEventListener('click', () => {
            const url = prompt('Enter image URL:');
            if (url) {
                editor.chain().focus().setImage({ src: url }).run();
            }
        });

        // Listen to selection changes to update toolbar
        editor.on('selectionUpdate', () => {
            updateToolbarState();
        });
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
     * Simple HTML to Markdown converter
     * @param {string} html 
     */
    function convertHTMLToMarkdown(html) {
        if (!html) return '';
        
        let markdown = html
            // Headers
            .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n')
            .replace(/<h5>(.*?)<\/h5>/gi, '##### $1\n\n')
            .replace(/<h6>(.*?)<\/h6>/gi, '###### $1\n\n')
            // Bold and italic
            .replace(/<strong><em>(.*?)<\/em><\/strong>/gi, '***$1***')
            .replace(/<em><strong>(.*?)<\/strong><\/em>/gi, '***$1***')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i>(.*?)<\/i>/gi, '*$1*')
            // Strikethrough
            .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
            // Code
            .replace(/<code>(.*?)<\/code>/gi, '`$1`')
            // Code blocks
            .replace(/<pre><code>(.*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
            // Lists
            .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
            .replace(/<ul[^>]*>/gi, '')
            .replace(/<\/ul>/gi, '\n')
            .replace(/<ol[^>]*>/gi, '')
            .replace(/<\/ol>/gi, '\n')
            // Blockquote
            .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
                return content.replace(/<p>/gi, '> ').replace(/<\/p>/gi, '\n');
            })
            // Horizontal rule
            .replace(/<hr\s*\/?>/gi, '---\n\n')
            // Links
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            // Images
            .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
            .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
            // Paragraphs and breaks
            .replace(/<p[^>]*>/gi, '')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            // Remove remaining HTML tags
            .replace(/<[^>]+>/g, '')
            // Clean up extra newlines
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        return markdown;
    }

    /**
     * @param {HTMLElement} container 
     */
    function attachLinkListeners(container) {
        const links = container.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            
            // Check if it's a D&D file link (relative path)
            if (href && (href.endsWith('.dndchar') || href.endsWith('.dnditem') || 
                        href.endsWith('.dndmap') || href.endsWith('.dndnotes'))) {
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

                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    vscode.postMessage({
                        type: 'openFile',
                        path: href
                    });
                });
            }
        });
    }

    /**
     * @param {any} data 
     * @param {number} x 
     * @param {number} y 
     */
    function showPopover(data, x, y) {
        if (!data) return;

        let html = '';
        if (data.type === 'item') {
            html = `
                <div class="popover-title">${data.name}</div>
                <div class="popover-detail"><b>Type:</b> ${data.itemType}</div>
                <div class="popover-detail"><b>Value:</b> ${data.value} gp</div>
                <div class="popover-detail"><i>${data.description}</i></div>
            `;
        } else if (data.type === 'character') {
            html = `
                <div class="popover-title">${data.name}</div>
                <div class="popover-detail"><b>Class:</b> ${data.class}</div>
                <div class="popover-detail"><b>HP:</b> ${data.hp}</div>
            `;
        } else if (data.type === 'map') {
            html = `
                <div class="popover-title">Map</div>
                <div class="popover-detail"><b>Pins:</b> ${data.pinCount}</div>
            `;
        }

        popover.innerHTML = html;
        popover.style.left = `${x + 10}px`;
        popover.style.top = `${y + 10}px`;
        popover.classList.add('visible');
    }

}());
