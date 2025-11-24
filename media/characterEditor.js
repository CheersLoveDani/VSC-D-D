// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    /** @type {any} */
    let state = {};

    const inputs = [
        // Core Stats
        'name', 'class', 'level', 'background', 'race', 'alignment', 'xp',
        'str', 'dex', 'con', 'int', 'wis', 'cha',
        'hp.current', 'hp.max', 'ac', 'initiative', 'speed',
        'inventory', 'traits', 'notes',
        // Skills
        'skills.acrobatics.prof', 'skills.animal_handling.prof', 'skills.arcana.prof',
        'skills.athletics.prof', 'skills.deception.prof', 'skills.history.prof',
        'skills.insight.prof', 'skills.intimidation.prof', 'skills.investigation.prof',
        'skills.medicine.prof', 'skills.nature.prof', 'skills.perception.prof',
        'skills.performance.prof', 'skills.persuasion.prof', 'skills.religion.prof',
        'skills.sleight_of_hand.prof', 'skills.stealth.prof', 'skills.survival.prof'
    ];

    // Initialize inputs
    inputs.forEach(id => {
        const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
        if (el) {
            // Use 'input' for text/numbers, 'change' for checkboxes
            const eventType = el.type === 'checkbox' ? 'change' : 'input';
            
            el.addEventListener(eventType, () => {
                updateStateFromUI();
                debouncedUpdate();
            });
        }
    });

    // Toolbar buttons
    const editToggleBtn = document.getElementById('edit-toggle-btn'); // Not used here but good to have reference if needed
    
    // Create toolbar if not exists (though it should be in HTML)
    const toolbar = document.querySelector('.toolbar');
    // "Edit as Text" button removed in favor of Plugin Manager toggle

    // Debounce function to prevent too many updates
    /** @type {any} */
    let timeout;
    function debouncedUpdate() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            vscode.postMessage({
                type: 'updateData',
                data: state
            });
        }, 300); // 300ms delay
    }

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                const text = message.text;
                try {
                    // Only update state if it's different to avoid cursor jumping
                    const newState = JSON.parse(text);
                    state = newState;
                    
                    // Only update UI if we are NOT currently editing
                    if (!document.activeElement || !inputs.includes(document.activeElement.id)) {
                         updateUIFromState();
                    }
                } catch {
                    // ignore
                }
                return;
        }
    });

    function updateUIFromState() {
        inputs.forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
            if (!el) return;
            
            const val = getNestedValue(state, id);
            
            if (el.type === 'checkbox') {
                // @ts-ignore
                el.checked = !!val;
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = val !== undefined ? val : '';
            }
        });
    }

    function updateStateFromUI() {
        inputs.forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
            if (!el) return;

            let val;
            if (el.type === 'checkbox') {
                // @ts-ignore
                val = el.checked;
            } else {
                val = el.value;
                if (el.type === 'number') {
                    val = parseFloat(val);
                }
            }
            
            setNestedValue(state, id, val);
        });
    }

    /**
     * @param {any} obj
     * @param {string} path
     */
    function getNestedValue(obj, path) {
        return path.split('.').reduce((o, k) => (o || {})[k], obj);
    }

    /**
     * @param {any} obj
     * @param {string} path
     * @param {any} value
     */
    function setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        // @ts-ignore
        const lastObj = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
        if (lastKey) {
            lastObj[lastKey] = value;
        }
    }

    // Signal that the webview is ready to receive data
    vscode.postMessage({ type: 'ready' });

}());
