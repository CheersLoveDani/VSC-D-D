// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const mapContainer = /** @type {HTMLElement} */ (document.getElementById('map-container'));
    const mapContent = /** @type {HTMLElement} */ (document.getElementById('map-content'));
    const mapImage = /** @type {HTMLImageElement} */ (document.getElementById('map-image'));
    const pinsLayer = /** @type {HTMLElement} */ (document.getElementById('pins-layer'));
    
    /** @type {{imagePath: string, pins: Array<{id: string, x: number, y: number, label: string, link: string, icon: string}>}} */
    let state = {
        imagePath: '',
        pins: []
    };

    let isEditMode = false;
    /** @type {HTMLElement | null} */
    let activePopover = null;

    // Initialize UI
    createToolbar();

    function createToolbar() {
        let toolbar = document.querySelector('.toolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.className = 'toolbar';
            document.body.appendChild(toolbar);
            
            const toggle = document.createElement('button');
            toggle.id = 'edit-toggle-btn';
            toggle.className = 'dnd-btn';
            toggle.textContent = 'Edit Map';
            toggle.onclick = toggleEditMode;
            toolbar.appendChild(toggle);

            const changeImg = document.createElement('button');
            changeImg.id = 'change-image-btn';
            changeImg.className = 'dnd-btn hidden';
            changeImg.textContent = 'Change Image';
            changeImg.onclick = () => vscode.postMessage({ type: 'selectImage' });
            toolbar.appendChild(changeImg);
        }
    }

    function toggleEditMode() {
        isEditMode = !isEditMode;
        const toggleBtn = document.getElementById('edit-toggle-btn');
        const changeImgBtn = document.getElementById('change-image-btn');
        
        if (toggleBtn) toggleBtn.textContent = isEditMode ? 'Done Editing' : 'Edit Map';
        if (changeImgBtn) {
            if (isEditMode) changeImgBtn.classList.remove('hidden');
            else changeImgBtn.classList.add('hidden');
        }

        if (mapContainer) {
            mapContainer.style.cursor = isEditMode ? 'crosshair' : 'default';
        }
        closePopover();
        render();
    }

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                try {
                    const newState = JSON.parse(message.text);
                    state = newState || {};
                    // Ensure pins is an array
                    if (!Array.isArray(state.pins)) {
                        state.pins = [];
                    }
                    // @ts-ignore
                    state.resolvedImageUri = message.resolvedImageUri;
                    render();
                } catch (e) { 
                    console.error('Error parsing state:', e);
                }
                return;
        }
    });

    function render() {
        if (!mapImage || !pinsLayer) return;

        // @ts-ignore
        if (state.resolvedImageUri) {
            // @ts-ignore
            mapImage.src = state.resolvedImageUri;
        } else if (state.imagePath) {
            // Fallback
            mapImage.src = state.imagePath;
        } else {
            mapImage.src = ''; 
        }

        pinsLayer.innerHTML = '';
        if (state.pins && Array.isArray(state.pins)) {
            state.pins.forEach((pin, index) => {
                const el = document.createElement('div');
                el.className = 'pin';
                el.style.left = `${pin.x}px`;
                el.style.top = `${pin.y}px`;
                el.textContent = pin.icon || '📍';
                el.title = pin.label || 'Pin';
                
                // Click Handler
                el.onclick = (e) => {
                    e.stopPropagation();
                    if (isEditMode) {
                        showPinPopover(pin, index, e.clientX, e.clientY);
                    } else {
                        if (pin.link) {
                            vscode.postMessage({ type: 'openFile', path: pin.link });
                        }
                    }
                };

                // Right Click (Context Menu) - Delete
                el.oncontextmenu = (e) => {
                    if (isEditMode) {
                        e.preventDefault();
                        if (confirm(`Delete pin "${pin.label}"?`)) {
                            deletePin(index);
                        }
                    }
                };

                pinsLayer.appendChild(el);
            });
        }
    }

    /**
     * @param {{id: string, x: number, y: number, label: string, link: string, icon: string}} pin 
     * @param {number} index 
     * @param {number} x 
     * @param {number} y 
     */
    function showPinPopover(pin, index, x, y) {
        closePopover();

        const popover = document.createElement('div');
        popover.className = 'pin-popover';
        popover.style.left = `${x}px`;
        popover.style.top = `${y}px`;

        popover.innerHTML = `
            <label>Label</label>
            <input type="text" id="pin-label" value="${pin.label || ''}">
            <label>Icon (Emoji)</label>
            <input type="text" id="pin-icon" value="${pin.icon || '📍'}" style="width: 50px;">
            <label>Link (Path)</label>
            <input type="text" id="pin-link" value="${pin.link || ''}" placeholder="./file.dnditem">
            <div class="actions">
                <button class="dnd-btn" id="pin-save">Save</button>
                <button class="dnd-btn delete-btn" id="pin-delete">Delete</button>
            </div>
        `;

        document.body.appendChild(popover);
        activePopover = popover;

        // Bind events
        const saveBtn = popover.querySelector('#pin-save');
        const deleteBtn = popover.querySelector('#pin-delete');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const labelInput = /** @type {HTMLInputElement} */ (document.getElementById('pin-label'));
                const iconInput = /** @type {HTMLInputElement} */ (document.getElementById('pin-icon'));
                const linkInput = /** @type {HTMLInputElement} */ (document.getElementById('pin-link'));

                if (labelInput && iconInput && linkInput) {
                    updatePin(index, { 
                        ...pin, 
                        label: labelInput.value, 
                        icon: iconInput.value, 
                        link: linkInput.value 
                    });
                }
                closePopover();
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                deletePin(index);
                closePopover();
            });
        }
    }

    function closePopover() {
        if (activePopover) {
            activePopover.remove();
            activePopover = null;
        }
    }

    /**
     * @param {number} index 
     * @param {any} newPin 
     */
    function updatePin(index, newPin) {
        const newPins = [...state.pins];
        newPins[index] = newPin;
        state.pins = newPins;
        saveState();
    }

    /**
     * @param {number} index 
     */
    function deletePin(index) {
        const newPins = [...state.pins];
        newPins.splice(index, 1);
        state.pins = newPins;
        saveState();
    }

    function saveState() {
        vscode.postMessage({
            type: 'updateData',
            data: state
        });
        render();
    }

    if (mapContent) {
        mapContent.addEventListener('click', (e) => {
            if (!isEditMode) return;
            // If clicking on map (not pin), add new pin
            if (e.target !== mapContent && e.target !== mapImage) return;

            const rect = mapContent.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const newPin = {
                id: Date.now().toString(),
                x: Math.round(x),
                y: Math.round(y),
                label: 'New Pin',
                icon: '📍',
                link: ''
            };

            state.pins = state.pins || [];
            state.pins.push(newPin);
            saveState();
            
            // Immediately show edit for new pin
            setTimeout(() => {
                 // Find the last pin element (the new one)
                 if (pinsLayer) {
                     const pins = pinsLayer.querySelectorAll('.pin');
                     const lastPin = pins[pins.length - 1];
                     if (lastPin) {
                         const rect = lastPin.getBoundingClientRect();
                         showPinPopover(newPin, state.pins.length - 1, rect.left, rect.top);
                     }
                 }
            }, 50);
        });
    }

    // Signal that the webview is ready to receive data
    vscode.postMessage({ type: 'ready' });
}());
