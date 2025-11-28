// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    /** @type {any} */
    let state = {};

    // Input categories
    const textInputs = ['name', 'subtype', 'value', 'attunementRequirement', 'properties', 'damageDice', 'twoHandedDamage', 'range', 'description'];
    const numberInputs = ['weight', 'armorClassBase', 'armorClassMaxBonus', 'strengthRequirement'];
    const selectInputs = ['type', 'rarity', 'damageType'];
    const checkboxInputs = ['magic', 'attunement', 'armorClassDexBonus', 'stealthDisadvantage'];

    // Initialize text inputs
    textInputs.forEach(id => {
        const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
        if (el) {
            el.addEventListener('input', handleInputChange);
        }
    });

    // Initialize number inputs
    numberInputs.forEach(id => {
        const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
        if (el) {
            el.addEventListener('input', handleInputChange);
        }
    });

    // Initialize select inputs
    selectInputs.forEach(id => {
        const el = /** @type {HTMLSelectElement | null} */ (document.getElementById(id));
        if (el) {
            el.addEventListener('change', handleInputChange);
        }
    });

    // Initialize checkbox inputs
    checkboxInputs.forEach(id => {
        const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
        if (el) {
            el.addEventListener('change', handleInputChange);
        }
    });

    // Handle type changes to show/hide weapon/armor sections
    const typeSelect = document.getElementById('type');
    if (typeSelect) {
        typeSelect.addEventListener('change', updateSectionVisibility);
    }

    function handleInputChange() {
        updateStateFromUI();
        updatePreview();
        updateSectionVisibility();
        vscode.postMessage({
            type: 'updateData',
            data: state
        });
    }

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                const text = message.text;
                try {
                    state = JSON.parse(text);
                    updateUIFromState();
                    updatePreview();
                    updateSectionVisibility();
                } catch {
                    // ignore
                }
                return;
        }
    });

    function updateUIFromState() {
        // Text inputs
        textInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
            if (!el) return;

            // Handle nested properties
            let val;
            if (id === 'damageDice') {
                val = state.damage?.dice;
            } else if (id === 'twoHandedDamage') {
                val = state.damage?.twoHanded;
            } else if (id === 'range') {
                if (state.range) {
                    val = state.range.long ? `${state.range.normal}/${state.range.long}` : String(state.range.normal);
                }
            } else if (id === 'properties') {
                // Properties is stored as an array, display as comma-separated string
                val = Array.isArray(state.properties) ? state.properties.join(', ') : state.properties;
            } else {
                val = state[id];
            }
            el.value = val !== undefined ? val : '';
        });

        // Number inputs
        numberInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
            if (!el) return;

            let val;
            if (id === 'armorClassBase') {
                val = state.armorClass?.base;
            } else if (id === 'armorClassMaxBonus') {
                val = state.armorClass?.maxBonus;
            } else {
                val = state[id];
            }
            el.value = val !== undefined ? String(val) : '';
        });

        // Select inputs
        selectInputs.forEach(id => {
            const el = /** @type {HTMLSelectElement | null} */ (document.getElementById(id));
            if (!el) return;

            let val;
            if (id === 'damageType') {
                val = state.damage?.type;
            } else {
                val = state[id];
            }
            el.value = val !== undefined ? val : '';
        });

        // Checkbox inputs
        checkboxInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
            if (!el) return;

            let val;
            if (id === 'armorClassDexBonus') {
                val = state.armorClass?.dexBonus;
            } else {
                val = state[id];
            }
            el.checked = !!val;
        });
    }

    function updateStateFromUI() {
        // Text inputs
        textInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
            if (!el) return;

            const val = el.value;

            // Handle nested damage properties
            if (id === 'damageDice') {
                if (!state.damage) state.damage = {};
                state.damage.dice = val || undefined;
            } else if (id === 'twoHandedDamage') {
                if (!state.damage) state.damage = {};
                state.damage.twoHanded = val || undefined;
            } else if (id === 'range') {
                if (val) {
                    const parts = val.split('/');
                    state.range = {
                        normal: parseInt(parts[0]) || 0,
                        long: parts[1] ? parseInt(parts[1]) : undefined
                    };
                } else {
                    state.range = undefined;
                }
            } else {
                state[id] = val;
            }
        });

        // Number inputs
        numberInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
            if (!el) return;

            const val = el.value ? parseFloat(el.value) : undefined;

            if (id === 'armorClassBase') {
                if (!state.armorClass) state.armorClass = {};
                state.armorClass.base = val;
            } else if (id === 'armorClassMaxBonus') {
                if (!state.armorClass) state.armorClass = {};
                state.armorClass.maxBonus = val;
            } else {
                state[id] = val || 0;
            }
        });

        // Select inputs
        selectInputs.forEach(id => {
            const el = /** @type {HTMLSelectElement | null} */ (document.getElementById(id));
            if (!el) return;

            if (id === 'damageType') {
                if (!state.damage) state.damage = {};
                state.damage.type = el.value || undefined;
            } else {
                state[id] = el.value;
            }
        });

        // Checkbox inputs
        checkboxInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
            if (!el) return;

            if (id === 'armorClassDexBonus') {
                if (!state.armorClass) state.armorClass = {};
                state.armorClass.dexBonus = el.checked;
            } else {
                state[id] = el.checked;
            }
        });

        // Clean up empty damage object
        if (state.damage && !state.damage.dice && !state.damage.type && !state.damage.twoHanded) {
            state.damage = undefined;
        }

        // Clean up empty armorClass object
        if (state.armorClass && !state.armorClass.base) {
            state.armorClass = undefined;
        }

        // Convert properties string to array
        if (state.properties && typeof state.properties === 'string') {
            state.properties = state.properties.split(',').map(p => p.trim()).filter(p => p);
        }
    }

    function updateSectionVisibility() {
        const type = state.type || 'Weapon';
        const weaponSection = document.getElementById('weapon-section');
        const armorSection = document.getElementById('armor-section');

        if (weaponSection) {
            weaponSection.style.display = (type === 'Weapon' || type === 'Ammunition') ? 'block' : 'none';
        }
        if (armorSection) {
            armorSection.style.display = type === 'Armor' ? 'block' : 'none';
        }
    }

    function updatePreview() {
        // Name
        setText('preview-name', state.name || 'Item Name');

        // Rarity
        const rarity = state.rarity || 'Common';
        const rarityEl = document.getElementById('preview-rarity');
        if (rarityEl) {
            rarityEl.textContent = rarity;
            rarityEl.className = 'item-rarity rarity-' + rarity.toLowerCase().replace(' ', '-');
        }

        // Type with subtype
        const typeStr = state.subtype || state.type || 'Item';
        setText('preview-type', typeStr);

        // Tags (magic, attunement)
        const tags = [];
        if (state.magic) tags.push('magic');
        if (state.attunement) {
            const attReq = state.attunementRequirement ? `attunement (${state.attunementRequirement})` : 'attunement';
            tags.push(attReq);
        }
        const tagsEl = document.getElementById('preview-tags');
        if (tagsEl) {
            tagsEl.innerHTML = tags.map(t => `<span class="item-tag">${t}</span>`).join('');
        }

        // Stats section
        const statsEl = document.getElementById('preview-stats');
        if (statsEl) {
            let statsHtml = '';

            // Damage (for weapons)
            if (state.damage?.dice) {
                const dmgType = state.damage.type ? ` ${state.damage.type}` : '';
                statsHtml += `<div class="stat-row"><span class="stat-label">Damage:</span><span>${state.damage.dice}${dmgType}</span></div>`;

                if (state.damage.twoHanded) {
                    statsHtml += `<div class="stat-row"><span class="stat-label">Two-Handed:</span><span>${state.damage.twoHanded}${dmgType}</span></div>`;
                }
            }

            // Armor Class (for armor)
            if (state.armorClass?.base) {
                let acStr = String(state.armorClass.base);
                if (state.armorClass.dexBonus) {
                    acStr += state.armorClass.maxBonus ? ` + Dex (max ${state.armorClass.maxBonus})` : ' + Dex';
                }
                statsHtml += `<div class="stat-row"><span class="stat-label">Armor Class:</span><span>${acStr}</span></div>`;
            }

            // Strength requirement (for armor)
            if (state.strengthRequirement) {
                statsHtml += `<div class="stat-row"><span class="stat-label">Strength:</span><span>${state.strengthRequirement}</span></div>`;
            }

            // Stealth disadvantage (for armor)
            if (state.stealthDisadvantage) {
                statsHtml += `<div class="stat-row"><span class="stat-label">Stealth:</span><span>Disadvantage</span></div>`;
            }

            // Range
            if (state.range?.normal) {
                const rangeStr = state.range.long ? `${state.range.normal}/${state.range.long} ft.` : `${state.range.normal} ft.`;
                statsHtml += `<div class="stat-row"><span class="stat-label">Range:</span><span>${rangeStr}</span></div>`;
            }

            // Properties
            const props = Array.isArray(state.properties) ? state.properties :
                         (state.properties ? state.properties.split(',').map(p => p.trim()).filter(p => p) : []);
            if (props.length > 0) {
                statsHtml += `<div class="stat-row"><span class="stat-label">Properties:</span><span>${props.join(', ')}</span></div>`;
            }

            statsEl.innerHTML = statsHtml;
            statsEl.style.display = statsHtml ? 'block' : 'none';
        }

        // Description
        setText('preview-desc', state.description || 'No description.');

        // Value and Weight in footer
        setText('preview-value', state.value || '—');
        setText('preview-weight', state.weight ? `${state.weight} lb` : '—');
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
