// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    /** @type {any} */
    let state = {
        inventory: [],
        spellbooks: []
    };

    // Track if we're the source of the update to avoid re-rendering
    let isLocalUpdate = false;

    // Input categories
    const textInputs = ['name', 'owner', 'location', 'description'];
    const selectInputs = ['type'];
    const checkboxInputs = ['hasSpellbooks'];

    // ========== Tooltips and Autocomplete Elements ==========

    // Item tooltip
    const itemTooltip = document.createElement('div');
    itemTooltip.className = 'item-tooltip';
    itemTooltip.style.cssText = `
        position: fixed;
        background: var(--vscode-editor-background, #1e1e1e);
        border: 1px solid var(--vscode-panel-border, #454545);
        border-radius: 4px;
        padding: 12px;
        max-width: 400px;
        z-index: 10000;
        display: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        font-size: 12px;
        line-height: 1.4;
    `;
    document.body.appendChild(itemTooltip);

    // Item autocomplete dropdown
    const itemAutocomplete = document.createElement('div');
    itemAutocomplete.className = 'item-autocomplete';
    itemAutocomplete.style.cssText = `
        position: fixed;
        background: var(--vscode-dropdown-background, #3c3c3c);
        border: 1px solid var(--vscode-dropdown-border, #454545);
        border-radius: 4px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 10001;
        display: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(itemAutocomplete);

    // Spell tooltip
    const spellTooltip = document.createElement('div');
    spellTooltip.className = 'spell-tooltip';
    spellTooltip.style.cssText = `
        position: fixed;
        background: var(--vscode-editor-background, #1e1e1e);
        border: 1px solid var(--vscode-panel-border, #454545);
        border-radius: 4px;
        padding: 12px;
        max-width: 400px;
        z-index: 10000;
        display: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        font-size: 12px;
        line-height: 1.4;
    `;
    document.body.appendChild(spellTooltip);

    // Spell autocomplete dropdown
    const spellAutocomplete = document.createElement('div');
    spellAutocomplete.className = 'spell-autocomplete';
    spellAutocomplete.style.cssText = `
        position: fixed;
        background: var(--vscode-dropdown-background, #3c3c3c);
        border: 1px solid var(--vscode-dropdown-border, #454545);
        border-radius: 4px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 10001;
        display: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(spellAutocomplete);

    // ========== Request tracking ==========
    let requestId = 0;
    /** @type {Record<string, any>} */
    const itemInfoCache = {};
    /** @type {Record<string, any>} */
    const spellInfoCache = {};
    /** @type {HTMLInputElement | null} */
    let activeItemInput = null;
    /** @type {HTMLInputElement | null} */
    let activeSpellInput = null;

    // ========== Initialize Inputs ==========
    textInputs.forEach(id => {
        const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
        if (el) {
            el.addEventListener('input', handleInputChange);
        }
    });

    selectInputs.forEach(id => {
        const el = /** @type {HTMLSelectElement | null} */ (document.getElementById(id));
        if (el) {
            el.addEventListener('change', handleInputChange);
        }
    });

    checkboxInputs.forEach(id => {
        const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
        if (el) {
            el.addEventListener('change', handleInputChange);
        }
    });

    // Add item button
    const addItemBtn = document.getElementById('add-item-btn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', addInventoryItem);
    }

    // Add spell button
    const addSpellBtn = document.getElementById('add-spell-btn');
    if (addSpellBtn) {
        addSpellBtn.addEventListener('click', addSpellbookItem);
    }

    function handleInputChange() {
        updateStateFromUI();
        updatePreview();
        updateSpellbooksVisibility();
        isLocalUpdate = true;
        vscode.postMessage({
            type: 'updateData',
            data: state
        });
    }

    // ========== Message Handler ==========
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                // Skip re-rendering if this update was triggered by our own changes
                if (isLocalUpdate) {
                    isLocalUpdate = false;
                    return;
                }
                try {
                    state = JSON.parse(message.text);
                    if (!state.inventory) state.inventory = [];
                    if (!state.spellbooks) state.spellbooks = [];
                    updateUIFromState();
                    updatePreview();
                    updateSpellbooksVisibility();
                } catch {
                    // ignore
                }
                return;
            case 'itemSearchResults':
                handleItemSearchResults(message);
                return;
            case 'itemInfo':
                handleItemInfo(message);
                return;
            case 'spellSearchResults':
                handleSpellSearchResults(message);
                return;
            case 'spellInfo':
                handleSpellInfo(message);
                return;
        }
    });

    // ========== Item Search & Info ==========
    /** @type {Record<number, function>} */
    const pendingItemCallbacks = {};
    /** @type {Record<number, function>} */
    const pendingSpellCallbacks = {};

    function handleItemSearchResults(message) {
        if (activeItemInput && document.activeElement === activeItemInput) {
            showItemAutocomplete(activeItemInput, message.results || []);
        }
    }

    function handleItemInfo(message) {
        const callback = pendingItemCallbacks[message.requestId];
        if (callback) {
            delete pendingItemCallbacks[message.requestId];
            if (message.found) {
                itemInfoCache[message.name.toLowerCase()] = message.info;
            }
            callback(message.found ? message.info : null);
        }
    }

    function handleSpellSearchResults(message) {
        if (activeSpellInput && document.activeElement === activeSpellInput) {
            showSpellAutocomplete(activeSpellInput, message.results || []);
        }
    }

    function handleSpellInfo(message) {
        const callback = pendingSpellCallbacks[message.requestId];
        if (callback) {
            delete pendingSpellCallbacks[message.requestId];
            if (message.found) {
                spellInfoCache[message.name.toLowerCase()] = message.info;
            }
            callback(message.found ? message.info : null);
        }
    }

    /**
     * @param {string} name
     * @param {function} callback
     */
    function requestItemInfo(name, callback) {
        if (!name || !name.trim()) {
            callback(null);
            return;
        }
        const cacheKey = name.toLowerCase();
        if (itemInfoCache[cacheKey]) {
            callback(itemInfoCache[cacheKey]);
            return;
        }
        const id = ++requestId;
        pendingItemCallbacks[id] = callback;
        vscode.postMessage({ type: 'getItemInfo', requestId: id, name: name });
    }

    /**
     * @param {string} name
     * @param {function} callback
     */
    function requestSpellInfo(name, callback) {
        if (!name || !name.trim()) {
            callback(null);
            return;
        }
        const cacheKey = name.toLowerCase();
        if (spellInfoCache[cacheKey]) {
            callback(spellInfoCache[cacheKey]);
            return;
        }
        const id = ++requestId;
        pendingSpellCallbacks[id] = callback;
        vscode.postMessage({ type: 'getSpellInfo', requestId: id, name: name });
    }

    // ========== Item Autocomplete ==========
    /** @type {any} */
    let itemSearchTimeout;

    function debouncedItemSearch(/** @type {HTMLInputElement} */ input) {
        clearTimeout(itemSearchTimeout);
        itemSearchTimeout = setTimeout(() => {
            const query = input.value.trim();
            if (query.length >= 2) {
                vscode.postMessage({ type: 'searchItems', requestId: ++requestId, query: query });
            } else {
                hideItemAutocomplete();
            }
        }, 150);
    }

    /**
     * @param {HTMLInputElement} input
     * @param {any[]} results
     */
    function showItemAutocomplete(input, results) {
        if (results.length === 0) {
            hideItemAutocomplete();
            return;
        }
        const rect = input.getBoundingClientRect();
        itemAutocomplete.innerHTML = results.map((item, index) => `
            <div class="autocomplete-item" data-index="${index}" data-name="${escapeHtml(item.name)}" style="
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid var(--vscode-panel-border, #333);
            ">
                <div style="font-weight: 500;">
                    ${escapeHtml(item.name)}
                    ${item.isCustom ? '<span style="color: var(--vscode-charts-purple, #b180d7); font-size: 10px; margin-left: 6px;">★ Custom</span>' : ''}
                </div>
                <div style="font-size: 11px; color: var(--vscode-descriptionForeground, #999);">
                    ${escapeHtml(item.subtype || item.type)} ${item.rarity !== 'Common' ? '• ' + escapeHtml(item.rarity) : ''} ${item.value ? '• ' + escapeHtml(item.value) : ''}
                </div>
            </div>
        `).join('');

        itemAutocomplete.style.display = 'block';
        itemAutocomplete.style.left = rect.left + 'px';
        itemAutocomplete.style.top = rect.bottom + 2 + 'px';
        itemAutocomplete.style.width = Math.max(rect.width, 280) + 'px';

        itemAutocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.getAttribute('data-name');
                if (name && activeItemInput) {
                    activeItemInput.value = name;
                    activeItemInput.dispatchEvent(new Event('input', { bubbles: true }));
                    hideItemAutocomplete();
                    saveInventory();
                    // Also fetch item info and update price
                    const row = activeItemInput.closest('.inventory-row');
                    if (row) {
                        updateItemFromCompendium(/** @type {HTMLElement} */ (row), name);
                    }
                }
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

    function hideItemAutocomplete() {
        itemAutocomplete.style.display = 'none';
    }

    /**
     * @param {HTMLElement} element
     * @param {any} itemInfo
     */
    function showItemTooltip(element, itemInfo) {
        const rect = element.getBoundingClientRect();
        let html = `
            <div style="font-weight: bold; font-size: 14px; color: var(--vscode-textLink-foreground, #3794ff); margin-bottom: 8px;">
                ${escapeHtml(itemInfo.name)}
                ${itemInfo.isCustom ? '<span style="color: var(--vscode-charts-purple, #b180d7); font-size: 11px; margin-left: 8px;">★ Custom</span>' : ''}
            </div>
            <div style="font-style: italic; color: var(--vscode-descriptionForeground, #999); margin-bottom: 8px;">
                ${escapeHtml(itemInfo.subtype || itemInfo.type)}${itemInfo.magic ? ' (Magic)' : ''} • ${escapeHtml(itemInfo.rarity)}
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin-bottom: 8px;">
                ${itemInfo.value ? `<span style="color: var(--vscode-descriptionForeground, #999);">Value:</span><span style="color: #d4af37;">${escapeHtml(itemInfo.value)}</span>` : ''}
                ${itemInfo.weight ? `<span style="color: var(--vscode-descriptionForeground, #999);">Weight:</span><span>${itemInfo.weight} lb</span>` : ''}
            </div>
        `;
        if (itemInfo.description) {
            const desc = itemInfo.description.length > 300 ? itemInfo.description.substring(0, 300) + '...' : itemInfo.description;
            html += `<div style="border-top: 1px solid var(--vscode-panel-border, #454545); padding-top: 8px;">${escapeHtml(desc)}</div>`;
        }
        itemTooltip.innerHTML = html;
        itemTooltip.style.display = 'block';
        let left = rect.left;
        let top = rect.bottom + 5;
        if (left + 400 > window.innerWidth) left = window.innerWidth - 410;
        if (top + itemTooltip.offsetHeight > window.innerHeight) top = rect.top - itemTooltip.offsetHeight - 5;
        itemTooltip.style.left = left + 'px';
        itemTooltip.style.top = top + 'px';
    }

    function hideItemTooltip() {
        itemTooltip.style.display = 'none';
    }

    /**
     * @param {HTMLElement} row
     * @param {string} itemName
     */
    function updateItemFromCompendium(row, itemName) {
        requestItemInfo(itemName, (info) => {
            if (info && info.value) {
                const priceInput = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-field="price"]'));
                if (priceInput && !priceInput.value) {
                    priceInput.value = info.value;
                    saveInventory();
                }
            }
        });
    }

    // ========== Spell Autocomplete ==========
    /** @type {any} */
    let spellSearchTimeout;

    function debouncedSpellSearch(/** @type {HTMLInputElement} */ input) {
        clearTimeout(spellSearchTimeout);
        spellSearchTimeout = setTimeout(() => {
            const query = input.value.trim();
            if (query.length >= 2) {
                vscode.postMessage({ type: 'searchSpells', requestId: ++requestId, query: query });
            } else {
                hideSpellAutocomplete();
            }
        }, 150);
    }

    /**
     * @param {HTMLInputElement} input
     * @param {any[]} results
     */
    function showSpellAutocomplete(input, results) {
        if (results.length === 0) {
            hideSpellAutocomplete();
            return;
        }
        const rect = input.getBoundingClientRect();
        spellAutocomplete.innerHTML = results.map((spell, index) => `
            <div class="autocomplete-item" data-index="${index}" data-name="${escapeHtml(spell.name)}" data-level="${spell.level}" style="
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid var(--vscode-panel-border, #333);
            ">
                <div style="font-weight: 500;">
                    ${escapeHtml(spell.name)}
                    ${spell.isCustom ? '<span style="color: var(--vscode-charts-purple, #b180d7); font-size: 10px; margin-left: 6px;">★ Custom</span>' : ''}
                </div>
                <div style="font-size: 11px; color: var(--vscode-descriptionForeground, #999);">
                    ${spell.level === 0 ? 'Cantrip' : 'Level ' + spell.level} ${escapeHtml(spell.school)}
                </div>
            </div>
        `).join('');

        spellAutocomplete.style.display = 'block';
        spellAutocomplete.style.left = rect.left + 'px';
        spellAutocomplete.style.top = rect.bottom + 2 + 'px';
        spellAutocomplete.style.width = Math.max(rect.width, 250) + 'px';

        spellAutocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.getAttribute('data-name');
                const level = parseInt(item.getAttribute('data-level') || '0');
                if (name && activeSpellInput) {
                    activeSpellInput.value = name;
                    activeSpellInput.dispatchEvent(new Event('input', { bubbles: true }));
                    hideSpellAutocomplete();
                    // Update level and price from compendium
                    const row = activeSpellInput.closest('.spellbook-row');
                    if (row) {
                        const levelInput = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-field="level"]'));
                        if (levelInput) levelInput.value = level.toString();
                        updateSpellPrice(/** @type {HTMLElement} */ (row), level);
                    }
                    saveSpellbooks();
                }
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

    function hideSpellAutocomplete() {
        spellAutocomplete.style.display = 'none';
    }

    /**
     * @param {HTMLElement} element
     * @param {any} spellInfo
     */
    function showSpellTooltip(element, spellInfo) {
        const rect = element.getBoundingClientRect();
        const levelText = spellInfo.level === 0 ? 'Cantrip' : `Level ${spellInfo.level}`;
        let tags = [];
        if (spellInfo.concentration) tags.push('Concentration');
        if (spellInfo.ritual) tags.push('Ritual');

        let html = `
            <div style="font-weight: bold; font-size: 14px; color: var(--vscode-textLink-foreground, #3794ff); margin-bottom: 8px;">
                ${escapeHtml(spellInfo.name)}
                ${spellInfo.isCustom ? '<span style="color: var(--vscode-charts-purple, #b180d7); font-size: 11px; margin-left: 8px;">★ Custom</span>' : ''}
            </div>
            <div style="font-style: italic; color: var(--vscode-descriptionForeground, #999); margin-bottom: 8px;">
                ${levelText} ${escapeHtml(spellInfo.school)}${tags.length ? ' (' + tags.join(', ') + ')' : ''}
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin-bottom: 8px;">
                <span style="color: var(--vscode-descriptionForeground, #999);">Casting Time:</span><span>${escapeHtml(spellInfo.castingTime)}</span>
                <span style="color: var(--vscode-descriptionForeground, #999);">Range:</span><span>${escapeHtml(spellInfo.range)}</span>
                <span style="color: var(--vscode-descriptionForeground, #999);">Duration:</span><span>${escapeHtml(spellInfo.duration)}</span>
            </div>
        `;
        if (spellInfo.description) {
            const desc = spellInfo.description.length > 400 ? spellInfo.description.substring(0, 400) + '...' : spellInfo.description;
            html += `<div style="border-top: 1px solid var(--vscode-panel-border, #454545); padding-top: 8px;">${escapeHtml(desc)}</div>`;
        }
        spellTooltip.innerHTML = html;
        spellTooltip.style.display = 'block';
        let left = rect.left;
        let top = rect.bottom + 5;
        if (left + 400 > window.innerWidth) left = window.innerWidth - 410;
        if (top + spellTooltip.offsetHeight > window.innerHeight) top = rect.top - spellTooltip.offsetHeight - 5;
        spellTooltip.style.left = left + 'px';
        spellTooltip.style.top = top + 'px';
    }

    function hideSpellTooltip() {
        spellTooltip.style.display = 'none';
    }

    /**
     * Get default scroll/spellbook price based on spell level
     * @param {number} level
     * @returns {string}
     */
    function getDefaultSpellPrice(level) {
        // Based on D&D 5e scroll costs
        const prices = {
            0: '25 gp',
            1: '75 gp',
            2: '150 gp',
            3: '300 gp',
            4: '500 gp',
            5: '1,000 gp',
            6: '2,500 gp',
            7: '5,000 gp',
            8: '10,000 gp',
            9: '25,000 gp'
        };
        // @ts-ignore
        return prices[level] || '50 gp';
    }

    /**
     * @param {HTMLElement} row
     * @param {number} level
     */
    function updateSpellPrice(row, level) {
        const priceInput = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-field="price"]'));
        if (priceInput && !priceInput.value) {
            priceInput.value = getDefaultSpellPrice(level);
        }
    }

    // ========== UI State Management ==========
    function updateUIFromState() {
        textInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
            if (!el) return;
            el.value = state[id] || '';
        });

        selectInputs.forEach(id => {
            const el = /** @type {HTMLSelectElement | null} */ (document.getElementById(id));
            if (!el) return;
            el.value = state[id] || el.options[0]?.value || '';
        });

        checkboxInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
            if (!el) return;
            el.checked = !!state[id];
        });

        renderInventoryList();
        renderSpellbooksList();
    }

    function updateStateFromUI() {
        textInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
            if (!el) return;
            state[id] = el.value;
        });

        selectInputs.forEach(id => {
            const el = /** @type {HTMLSelectElement | null} */ (document.getElementById(id));
            if (!el) return;
            state[id] = el.value;
        });

        checkboxInputs.forEach(id => {
            const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
            if (!el) return;
            state[id] = el.checked;
        });
    }

    function updateSpellbooksVisibility() {
        const section = document.getElementById('spellbooks-section');
        const checkbox = /** @type {HTMLInputElement | null} */ (document.getElementById('hasSpellbooks'));
        if (section && checkbox) {
            section.style.display = checkbox.checked ? 'block' : 'none';
        }
    }

    // ========== Inventory Management ==========
    function addInventoryItem() {
        if (!state.inventory) state.inventory = [];
        state.inventory.push({ name: '', quantity: 1, price: '' });
        renderInventoryList();
        handleInputChange();
    }

    function removeInventoryItem(index) {
        state.inventory.splice(index, 1);
        renderInventoryList();
        handleInputChange();
    }

    function saveInventory() {
        if (!state.inventory) state.inventory = [];
        const container = document.getElementById('inventory-list');
        if (!container) return;

        state.inventory = [];
        container.querySelectorAll('.inventory-row').forEach(row => {
            state.inventory.push({
                name: /** @type {HTMLInputElement} */ (row.querySelector('[data-field="name"]'))?.value || '',
                quantity: parseInt(/** @type {HTMLInputElement} */ (row.querySelector('[data-field="quantity"]'))?.value) || 1,
                price: /** @type {HTMLInputElement} */ (row.querySelector('[data-field="price"]'))?.value || ''
            });
        });

        updatePreview();
        isLocalUpdate = true;
        vscode.postMessage({ type: 'updateData', data: state });
    }

    function renderInventoryList() {
        const container = document.getElementById('inventory-list');
        if (!container) return;
        container.innerHTML = '';

        if (!state.inventory || state.inventory.length === 0) {
            container.innerHTML = '<div class="empty-list">No items in inventory. Click "Add Item" to add one.</div>';
            return;
        }

        state.inventory.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'inventory-row';
            row.innerHTML = `
                <input type="text" class="inv-input inv-name" data-index="${index}" data-field="name" value="${escapeHtml(item.name || '')}" placeholder="Search items..." title="Ctrl+Click to open item file" />
                <button type="button" class="open-item item-btn-disabled" data-index="${index}" title="Open item file">→</button>
                <input type="number" class="inv-input inv-qty" data-index="${index}" data-field="quantity" value="${item.quantity || 1}" min="1" />
                <input type="text" class="inv-input inv-price" data-index="${index}" data-field="price" value="${escapeHtml(item.price || '')}" placeholder="10 gp" />
                <button type="button" class="btn-remove" data-index="${index}" title="Remove item">&times;</button>
            `;
            container.appendChild(row);

            const nameInput = /** @type {HTMLInputElement} */ (row.querySelector('[data-field="name"]'));
            const openBtn = /** @type {HTMLButtonElement} */ (row.querySelector('.open-item'));

            // Update button state
            if (item.name) {
                updateItemButtonState(openBtn, item.name);
            }

            // Name input events
            nameInput.addEventListener('input', () => {
                activeItemInput = nameInput;
                debouncedItemSearch(nameInput);
                updateItemButtonState(openBtn, nameInput.value);
                saveInventory();
            });

            nameInput.addEventListener('focus', () => {
                activeItemInput = nameInput;
                if (nameInput.value.trim().length >= 2) {
                    debouncedItemSearch(nameInput);
                }
            });

            nameInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (activeItemInput === nameInput) hideItemAutocomplete();
                }, 200);
                setTimeout(() => {
                    updateItemButtonState(openBtn, nameInput.value);
                    if (nameInput.value.trim()) {
                        updateItemFromCompendium(row, nameInput.value.trim());
                    }
                }, 250);
            });

            nameInput.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (nameInput.value.trim()) {
                        vscode.postMessage({ type: 'openItem', name: nameInput.value.trim() });
                    }
                }
            });

            nameInput.addEventListener('mouseenter', () => {
                if (nameInput.value.trim()) {
                    requestItemInfo(nameInput.value.trim(), (info) => {
                        if (info) showItemTooltip(nameInput, info);
                    });
                }
            });

            nameInput.addEventListener('mouseleave', () => hideItemTooltip());

            // Open button
            openBtn.addEventListener('click', () => {
                if (nameInput.value.trim()) {
                    vscode.postMessage({ type: 'openItem', name: nameInput.value.trim() });
                }
            });

            // Other inputs
            row.querySelectorAll('[data-field="quantity"], [data-field="price"]').forEach(input => {
                input.addEventListener('input', saveInventory);
            });

            // Remove button
            row.querySelector('.btn-remove')?.addEventListener('click', () => {
                removeInventoryItem(index);
            });
        });
    }

    /**
     * @param {HTMLButtonElement} button
     * @param {string} itemName
     */
    function updateItemButtonState(button, itemName) {
        if (!itemName.trim()) {
            button.textContent = '→';
            button.className = 'open-item item-btn-disabled';
            button.title = 'Enter an item name first';
            return;
        }
        requestItemInfo(itemName, (info) => {
            if (info) {
                button.textContent = '→';
                button.className = 'open-item item-btn-open';
                button.title = 'Open item file';
            } else {
                button.textContent = '+';
                button.className = 'open-item item-btn-create';
                button.title = 'Create new item file';
            }
        });
    }

    // ========== Spellbooks Management ==========
    function addSpellbookItem() {
        if (!state.spellbooks) state.spellbooks = [];
        state.spellbooks.push({ name: '', level: 1, price: '', type: 'scroll' });
        renderSpellbooksList();
        handleInputChange();
    }

    function removeSpellbookItem(index) {
        state.spellbooks.splice(index, 1);
        renderSpellbooksList();
        handleInputChange();
    }

    function saveSpellbooks() {
        if (!state.spellbooks) state.spellbooks = [];
        const container = document.getElementById('spellbooks-list');
        if (!container) return;

        state.spellbooks = [];
        container.querySelectorAll('.spellbook-row').forEach(row => {
            state.spellbooks.push({
                name: /** @type {HTMLInputElement} */ (row.querySelector('[data-field="name"]'))?.value || '',
                level: parseInt(/** @type {HTMLInputElement} */ (row.querySelector('[data-field="level"]'))?.value) || 1,
                price: /** @type {HTMLInputElement} */ (row.querySelector('[data-field="price"]'))?.value || '',
                type: /** @type {HTMLSelectElement} */ (row.querySelector('[data-field="type"]'))?.value || 'scroll'
            });
        });

        updatePreview();
        isLocalUpdate = true;
        vscode.postMessage({ type: 'updateData', data: state });
    }

    function renderSpellbooksList() {
        const container = document.getElementById('spellbooks-list');
        if (!container) return;
        container.innerHTML = '';

        if (!state.spellbooks || state.spellbooks.length === 0) {
            container.innerHTML = '<div class="empty-list">No spells available. Click "Add Spell" to add one.</div>';
            return;
        }

        state.spellbooks.forEach((spell, index) => {
            const row = document.createElement('div');
            row.className = 'spellbook-row';
            row.innerHTML = `
                <input type="text" class="spell-input spell-name" data-index="${index}" data-field="name" value="${escapeHtml(spell.name || '')}" placeholder="Search spells..." title="Ctrl+Click to open spell file" />
                <button type="button" class="open-spell spell-btn-disabled" data-index="${index}" title="Open spell file">→</button>
                <select class="spell-input spell-type" data-index="${index}" data-field="type">
                    <option value="scroll" ${spell.type === 'scroll' ? 'selected' : ''}>Scroll</option>
                    <option value="spellbook" ${spell.type === 'spellbook' ? 'selected' : ''}>Spellbook</option>
                    <option value="service" ${spell.type === 'service' ? 'selected' : ''}>Service</option>
                </select>
                <input type="number" class="spell-input spell-level" data-index="${index}" data-field="level" value="${spell.level || 1}" min="0" max="9" placeholder="Lvl" />
                <input type="text" class="spell-input spell-price" data-index="${index}" data-field="price" value="${escapeHtml(spell.price || '')}" placeholder="Price" />
                <button type="button" class="btn-remove" data-index="${index}" title="Remove spell">&times;</button>
            `;
            container.appendChild(row);

            const nameInput = /** @type {HTMLInputElement} */ (row.querySelector('[data-field="name"]'));
            const openBtn = /** @type {HTMLButtonElement} */ (row.querySelector('.open-spell'));
            const levelInput = /** @type {HTMLInputElement} */ (row.querySelector('[data-field="level"]'));

            // Update button state
            if (spell.name) {
                updateSpellButtonState(openBtn, spell.name);
            }

            // Name input events
            nameInput.addEventListener('input', () => {
                activeSpellInput = nameInput;
                debouncedSpellSearch(nameInput);
                updateSpellButtonState(openBtn, nameInput.value);
                saveSpellbooks();
            });

            nameInput.addEventListener('focus', () => {
                activeSpellInput = nameInput;
                if (nameInput.value.trim().length >= 2) {
                    debouncedSpellSearch(nameInput);
                }
            });

            nameInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (activeSpellInput === nameInput) hideSpellAutocomplete();
                }, 200);
                setTimeout(() => {
                    updateSpellButtonState(openBtn, nameInput.value);
                }, 250);
            });

            nameInput.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (nameInput.value.trim()) {
                        const level = parseInt(levelInput.value) || 0;
                        vscode.postMessage({ type: 'openSpell', name: nameInput.value.trim(), level: level });
                    }
                }
            });

            nameInput.addEventListener('mouseenter', () => {
                if (nameInput.value.trim()) {
                    requestSpellInfo(nameInput.value.trim(), (info) => {
                        if (info) showSpellTooltip(nameInput, info);
                    });
                }
            });

            nameInput.addEventListener('mouseleave', () => hideSpellTooltip());

            // Open button
            openBtn.addEventListener('click', () => {
                if (nameInput.value.trim()) {
                    const level = parseInt(levelInput.value) || 0;
                    vscode.postMessage({ type: 'openSpell', name: nameInput.value.trim(), level: level });
                }
            });

            // Level change updates price suggestion
            levelInput.addEventListener('change', () => {
                const priceInput = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-field="price"]'));
                if (priceInput && !priceInput.value) {
                    priceInput.value = getDefaultSpellPrice(parseInt(levelInput.value) || 0);
                }
                saveSpellbooks();
            });

            // Other inputs
            row.querySelectorAll('[data-field="type"], [data-field="price"]').forEach(input => {
                input.addEventListener('input', saveSpellbooks);
                input.addEventListener('change', saveSpellbooks);
            });

            // Remove button
            row.querySelector('.btn-remove')?.addEventListener('click', () => {
                removeSpellbookItem(index);
            });
        });
    }

    /**
     * @param {HTMLButtonElement} button
     * @param {string} spellName
     */
    function updateSpellButtonState(button, spellName) {
        if (!spellName.trim()) {
            button.textContent = '→';
            button.className = 'open-spell spell-btn-disabled';
            button.title = 'Enter a spell name first';
            return;
        }
        requestSpellInfo(spellName, (info) => {
            if (info) {
                button.textContent = '→';
                button.className = 'open-spell spell-btn-open';
                button.title = 'Open spell file';
            } else {
                button.textContent = '+';
                button.className = 'open-spell spell-btn-create';
                button.title = 'Create new spell file';
            }
        });
    }

    // ========== Preview ==========
    function updatePreview() {
        setText('preview-name', state.name || 'Shop Name');
        setText('preview-type', state.type || 'General Store');
        setText('preview-owner', state.owner ? `Proprietor: ${state.owner}` : 'Owner unknown');
        setText('preview-location', state.location || 'Location unknown');
        setText('preview-desc', state.description || 'No description.');

        // Inventory preview
        const inventoryTable = document.getElementById('preview-inventory-table');
        const inventorySection = document.getElementById('preview-inventory');
        if (inventoryTable && inventorySection) {
            if (!state.inventory || state.inventory.length === 0) {
                inventorySection.style.display = 'none';
            } else {
                inventorySection.style.display = 'block';
                let html = '<table class="preview-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>';
                state.inventory.forEach(item => {
                    if (!item.name) return;
                    html += `<tr>
                        <td><a href="#" class="item-link" data-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</a></td>
                        <td>${item.quantity || 1}</td>
                        <td class="price-cell">${escapeHtml(item.price || '—')}</td>
                    </tr>`;
                });
                html += '</tbody></table>';
                inventoryTable.innerHTML = html;

                inventoryTable.querySelectorAll('.item-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const name = /** @type {HTMLAnchorElement} */ (e.target).dataset.name;
                        if (name) vscode.postMessage({ type: 'openItem', name: name });
                    });
                });
            }
        }

        // Spellbooks preview
        const spellbooksTable = document.getElementById('preview-spellbooks-table');
        const spellbooksSection = document.getElementById('preview-spellbooks');
        if (spellbooksTable && spellbooksSection) {
            if (!state.hasSpellbooks || !state.spellbooks || state.spellbooks.length === 0) {
                spellbooksSection.style.display = 'none';
            } else {
                spellbooksSection.style.display = 'block';
                let html = '<table class="preview-table"><thead><tr><th>Spell</th><th>Type</th><th>Level</th><th>Price</th></tr></thead><tbody>';
                state.spellbooks.forEach(spell => {
                    if (!spell.name) return;
                    const levelText = spell.level === 0 ? 'Cantrip' : `${spell.level}`;
                    html += `<tr>
                        <td><a href="#" class="spell-link" data-name="${escapeHtml(spell.name)}" data-level="${spell.level}">${escapeHtml(spell.name)}</a></td>
                        <td>${spell.type === 'spellbook' ? 'Spellbook' : spell.type === 'service' ? 'Service' : 'Scroll'}</td>
                        <td>${levelText}</td>
                        <td class="price-cell">${escapeHtml(spell.price || '—')}</td>
                    </tr>`;
                });
                html += '</tbody></table>';
                spellbooksTable.innerHTML = html;

                spellbooksTable.querySelectorAll('.spell-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const target = /** @type {HTMLAnchorElement} */ (e.target);
                        const name = target.dataset.name;
                        const level = parseInt(target.dataset.level || '0');
                        if (name) vscode.postMessage({ type: 'openSpell', name: name, level: level });
                    });
                });
            }
        }
    }

    /**
     * @param {string} id
     * @param {string} text
     */
    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    /**
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Signal ready
    vscode.postMessage({ type: 'ready' });

}());
