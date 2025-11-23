// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    /** @type {{name?: string, type?: string, value?: number, weight?: number, description?: string}} */
    let state = {};

    const inputs = ['name', 'type', 'value', 'weight', 'description'];

    // Initialize inputs
    inputs.forEach(id => {
        const el = /** @type {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null} */ (document.getElementById(id));
        if (el) {
            el.addEventListener('input', () => {
                updateStateFromUI();
                updatePreview();
                vscode.postMessage({
                    type: 'updateData',
                    data: state
                });
            });
        }
    });

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                const text = message.text;
                try {
                    state = JSON.parse(text);
                    updateUIFromState();
                    updatePreview();
                } catch {
                    // ignore
                }
                return;
        }
    });

    function updateUIFromState() {
        inputs.forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null} */ (document.getElementById(id));
            if (!el) return;
            
            // @ts-ignore
            const val = state[id];
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                el.value = val !== undefined ? val : '';
            }
        });
    }

    function updateStateFromUI() {
        inputs.forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null} */ (document.getElementById(id));
            if (!el) return;

            let val = /** @type {string | number} */ (el.value);
            if (el.type === 'number') {
                val = parseFloat(String(val));
            }
            // @ts-ignore
            state[id] = val;
        });
    }

    function updatePreview() {
        setText('preview-name', state.name || 'Item Name');
        setText('preview-value', (state.value || 0) + ' gp');
        setText('preview-type', state.type || 'Misc');
        setText('preview-desc', state.description || 'No description.');
        setText('preview-weight', (state.weight || 0) + ' lb');
    }

    /**
     * @param {string} id
     * @param {string} text
     */
    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    // Signal that the webview is ready to receive data
    vscode.postMessage({ type: 'ready' });

}());
