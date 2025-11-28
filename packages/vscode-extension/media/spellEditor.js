// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    /** @type {any} */
    let state = {};

    const textInputs = ['name', 'castingTime', 'range', 'duration', 'materials', 'classes', 'description', 'higherLevels'];
    const selectInputs = ['level', 'school'];
    const checkboxInputs = ['componentV', 'componentS', 'componentM', 'ritual', 'concentration'];

    // Initialize text and select inputs
    [...textInputs, ...selectInputs].forEach(id => {
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

    // Initialize checkbox inputs
    checkboxInputs.forEach(id => {
        const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
        if (el) {
            el.addEventListener('change', () => {
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
        // Text and select inputs
        [...textInputs, ...selectInputs].forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null} */ (document.getElementById(id));
            if (!el) return;

            // @ts-ignore
            const val = state[id];
            el.value = val !== undefined ? val : '';
        });

        // Checkbox inputs
        checkboxInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
            if (!el) return;
            // @ts-ignore
            el.checked = !!state[id];
        });
    }

    function updateStateFromUI() {
        // Text inputs
        textInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
            if (!el) return;
            // @ts-ignore
            state[id] = el.value;
        });

        // Select inputs
        selectInputs.forEach(id => {
            const el = /** @type {HTMLSelectElement | null} */ (document.getElementById(id));
            if (!el) return;
            // @ts-ignore
            state[id] = id === 'level' ? parseInt(el.value, 10) : el.value;
        });

        // Checkbox inputs
        checkboxInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
            if (!el) return;
            // @ts-ignore
            state[id] = el.checked;
        });
    }

    function updatePreview() {
        // Name
        setText('preview-name', state.name || 'Spell Name');

        // Level
        const level = state.level !== undefined ? state.level : 0;
        let levelText = level === 0 ? 'Cantrip' :
                       level === 1 ? '1st Level' :
                       level === 2 ? '2nd Level' :
                       level === 3 ? '3rd Level' :
                       `${level}th Level`;
        setText('preview-level', levelText);

        // School with italic
        setText('preview-school', state.school || 'Evocation');

        // Tags (ritual, concentration)
        const tags = [];
        if (state.ritual) tags.push('ritual');
        if (state.concentration) tags.push('concentration');
        const tagsEl = document.getElementById('preview-tags');
        if (tagsEl) {
            tagsEl.innerHTML = tags.map(t => `<span class="spell-tag">${t}</span>`).join('');
        }

        // Stats
        setText('preview-castingTime', state.castingTime || '1 action');
        setText('preview-range', state.range || 'Self');
        setText('preview-duration', state.duration || 'Instantaneous');

        // Components
        const components = [];
        if (state.componentV) components.push('V');
        if (state.componentS) components.push('S');
        if (state.componentM) {
            const matText = state.materials ? `M (${state.materials})` : 'M';
            components.push(matText);
        }
        setText('preview-components', components.length > 0 ? components.join(', ') : '-');

        // Description
        setText('preview-desc', state.description || 'No description.');

        // Higher levels
        const higherEl = document.getElementById('preview-higher');
        if (higherEl) {
            if (state.higherLevels) {
                higherEl.innerHTML = `<strong>At Higher Levels:</strong> ${state.higherLevels}`;
                higherEl.style.display = 'block';
            } else {
                higherEl.style.display = 'none';
            }
        }

        // Classes
        setText('preview-classes', state.classes || 'None');
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
