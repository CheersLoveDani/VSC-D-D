// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const container = /** @type {HTMLElement} */ (document.getElementById('app'));
    const toggleBtn = /** @type {HTMLElement} */ (document.getElementById('toggle-mode-btn'));
    const popover = /** @type {HTMLElement} */ (document.getElementById('popover'));
    const toolbar = /** @type {HTMLElement} */ (document.querySelector('.toolbar'));

    /** @type {{ content: string, mode: 'read' | 'edit' }} */
    let state = {
        content: '',
        mode: 'read'
    };

    // Initialize
    vscode.postMessage({ type: 'ready' });

    // Add "Edit as Text" button
    if (toolbar) {
        const editTextBtn = document.createElement('button');
        editTextBtn.className = 'dnd-btn secondary';
        editTextBtn.textContent = 'Edit as Text';
        editTextBtn.onclick = showPlainTextWarning;
        toolbar.appendChild(editTextBtn);
    }

    function showPlainTextWarning() {
        const warning = document.createElement('div');
        warning.className = 'warning-popover';
        warning.innerHTML = `
            <h3>⚠️ Warning</h3>
            <p>Editing this file manually may corrupt the data. Are you sure?</p>
            <div class="buttons">
                <button id="warning-continue" class="dnd-btn danger">Continue</button>
                <button id="warning-cancel" class="dnd-btn secondary">Cancel</button>
            </div>
        `;
        document.body.appendChild(warning);

        const continueBtn = document.getElementById('warning-continue');
        if (continueBtn) {
            continueBtn.onclick = () => {
                vscode.postMessage({ type: 'editInPlainText' });
                warning.remove();
            };
        }

        const cancelBtn = document.getElementById('warning-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                warning.remove();
            };
        }
    }

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                state.content = message.text;
                render();
                return;
            case 'previewData':
                showPopover(message.data, message.x, message.y);
                return;
        }
    });

    toggleBtn.addEventListener('click', () => {
        state.mode = state.mode === 'read' ? 'edit' : 'read';
        toggleBtn.textContent = state.mode === 'read' ? 'Edit Note' : 'View Note';
        render();
    });

    function render() {
        container.innerHTML = '';

        if (state.mode === 'edit') {
            const textarea = document.createElement('textarea');
            textarea.id = 'editor-textarea';
            textarea.value = state.content;
            textarea.addEventListener('input', () => {
                state.content = textarea.value;
                vscode.postMessage({
                    type: 'updateData',
                    text: state.content
                });
            });
            container.appendChild(textarea);
        } else {
            const preview = document.createElement('div');
            preview.className = 'markdown-preview';
            preview.innerHTML = parseMarkdown(state.content);
            container.appendChild(preview);
            attachLinkListeners(preview);
        }
    }

    /**
     * Simple Markdown Parser
     * @param {string} text 
     */
    function parseMarkdown(text) {
        if (!text) return '';
        let html = text
            // Headers
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            // Bold
            .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
            // Italic
            .replace(/\*(.*)\*/gim, '<i>$1</i>')
            // Lists
            .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>') // Naive list
            .replace(/<\/ul>\s*<ul>/gim, '') // Merge adjacent lists
            // Links [text](url)
            .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="#" data-link="$2">$1</a>')
            // Newlines
            .replace(/\n/gim, '<br>');
        
        return html;
    }

    /**
     * @param {HTMLElement} container 
     */
    function attachLinkListeners(container) {
        const links = container.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('mouseenter', (e) => {
                const targetPath = link.getAttribute('data-link');
                if (targetPath) {
                    vscode.postMessage({
                        type: 'getPreview',
                        path: targetPath,
                        x: e.clientX,
                        y: e.clientY
                    });
                }
            });

            link.addEventListener('mouseleave', () => {
                popover.classList.remove('visible');
            });

            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPath = link.getAttribute('data-link');
                if (targetPath) {
                    vscode.postMessage({
                        type: 'openFile',
                        path: targetPath
                    });
                }
            });
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
