// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const mapContainer = /** @type {HTMLElement} */ (document.getElementById('map-container'));
    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('map-canvas'));
    const ctx = canvas ? canvas.getContext('2d') : null;
    
    /** @type {{imagePath: string, pins: Array<{id: string, x: number, y: number, label: string, link: string, icon: string}>}} */
    let state = {
        imagePath: '',
        pins: []
    };

    // Viewport state for pan/zoom
    let viewport = {
        scale: 1,
        translateX: 0,
        translateY: 0
    };

    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 5;

    // Image loading
    let mapImage = new Image();
    let imageLoaded = false;
    let imageError = false;

    // Pan/drag state
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    let isEditMode = false;
    /** @type {HTMLElement | null} */
    let activePopover = null;

    // Initialize UI
    createToolbar();
    setupCanvas();
    setupEventListeners();

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

            const resetView = document.createElement('button');
            resetView.id = 'reset-view-btn';
            resetView.className = 'dnd-btn';
            resetView.textContent = 'Reset View';
            resetView.onclick = resetViewport;
            toolbar.appendChild(resetView);
        }
    }

    function setupCanvas() {
        if (!canvas || !ctx) return;
        
        // Set canvas size to match container
        function resizeCanvas() {
            if (!canvas || !mapContainer) return;
            canvas.width = mapContainer.clientWidth;
            canvas.height = mapContainer.clientHeight;
            render();
        }
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function setupEventListeners() {
        if (!canvas) return;

        // Mouse wheel for zoom
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        // Mouse events for pan
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);

        // Click for pin placement/interaction
        canvas.addEventListener('click', handleCanvasClick);
    }

    function handleWheel(/** @type {WheelEvent} */ e) {
        e.preventDefault();
        
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Get world coordinates before zoom
        const worldBefore = screenToWorld(mouseX, mouseY);

        // Calculate zoom
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.scale * zoomFactor));

        viewport.scale = newScale;

        // Get world coordinates after zoom
        const worldAfter = screenToWorld(mouseX, mouseY);

        // Adjust translation to keep the same world point under the mouse
        viewport.translateX += (worldAfter.x - worldBefore.x) * viewport.scale;
        viewport.translateY += (worldAfter.y - worldBefore.y) * viewport.scale;

        render();
    }

    function handleMouseDown(/** @type {MouseEvent} */ e) {
        if (isEditMode) return; // Don't pan in edit mode
        
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        
        if (canvas) {
            canvas.style.cursor = 'grabbing';
        }
    }

    function handleMouseMove(/** @type {MouseEvent} */ e) {
        if (!isDragging) return;

        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;

        viewport.translateX += deltaX;
        viewport.translateY += deltaY;

        lastX = e.clientX;
        lastY = e.clientY;

        render();
    }

    function handleMouseUp() {
        isDragging = false;
        if (canvas && !isEditMode) {
            canvas.style.cursor = 'grab';
        }
    }

    function handleCanvasClick(/** @type {MouseEvent} */ e) {
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Check if clicking on a pin
        const clickedPinIndex = findPinAtScreen(screenX, screenY);
        
        if (clickedPinIndex !== -1) {
            const pin = state.pins[clickedPinIndex];
            if (isEditMode) {
                showPinPopover(pin, clickedPinIndex, e.clientX, e.clientY);
            } else {
                if (pin.link) {
                    vscode.postMessage({ type: 'openFile', path: pin.link });
                }
            }
            return;
        }

        // If in edit mode and didn't click a pin, add new pin
        if (isEditMode) {
            const world = screenToWorld(screenX, screenY);
            
            const newPin = {
                id: Date.now().toString(),
                x: Math.round(world.x),
                y: Math.round(world.y),
                label: 'New Pin',
                icon: '📍',
                link: ''
            };

            state.pins = state.pins || [];
            state.pins.push(newPin);
            saveState();
            
            // Show edit popover for new pin
            setTimeout(() => {
                showPinPopover(newPin, state.pins.length - 1, e.clientX, e.clientY);
            }, 50);
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

        if (canvas) {
            canvas.style.cursor = isEditMode ? 'crosshair' : 'grab';
        }
        closePopover();
        render();
    }

    function resetViewport() {
        viewport.scale = 1;
        viewport.translateX = 0;
        viewport.translateY = 0;
        
        // Center the image if loaded
        if (imageLoaded && canvas && mapImage) {
            viewport.translateX = (canvas.width - mapImage.width) / 2;
            viewport.translateY = (canvas.height - mapImage.height) / 2;
        }
        
        render();
    }

    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX 
     * @param {number} screenY 
     * @returns {{x: number, y: number}}
     */
    function screenToWorld(screenX, screenY) {
        return {
            x: (screenX - viewport.translateX) / viewport.scale,
            y: (screenY - viewport.translateY) / viewport.scale
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     * @param {number} worldX 
     * @param {number} worldY 
     * @returns {{x: number, y: number}}
     */
    function worldToScreen(worldX, worldY) {
        return {
            x: worldX * viewport.scale + viewport.translateX,
            y: worldY * viewport.scale + viewport.translateY
        };
    }

    /**
     * Find pin at screen coordinates
     * @param {number} screenX 
     * @param {number} screenY 
     * @returns {number} Index of pin, or -1 if none found
     */
    function findPinAtScreen(screenX, screenY) {
        const PIN_RADIUS = 12; // Half of pin size (24px / 2)
        
        for (let i = state.pins.length - 1; i >= 0; i--) {
            const pin = state.pins[i];
            const screen = worldToScreen(pin.x, pin.y);
            
            const dx = screenX - screen.x;
            const dy = screenY - screen.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= PIN_RADIUS * viewport.scale) {
                return i;
            }
        }
        
        return -1;
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
                    const resolvedImageUri = message.resolvedImageUri;
                    
                    if (resolvedImageUri) {
                        loadImage(resolvedImageUri);
                    } else {
                        imageLoaded = false;
                        imageError = true;
                        render();
                    }
                } catch (e) { 
                    console.error('Error parsing state:', e);
                }
                return;
        }
    });

    function loadImage(/** @type {string} */ uri) {
        imageLoaded = false;
        imageError = false;
        
        mapImage = new Image();
        
        mapImage.onload = () => {
            console.log('Map image loaded successfully:', uri);
            imageLoaded = true;
            imageError = false;
            
            // Center image on first load
            if (canvas) {
                viewport.translateX = (canvas.width - mapImage.width) / 2;
                viewport.translateY = (canvas.height - mapImage.height) / 2;
            }
            
            render();
        };
        
        mapImage.onerror = (e) => {
            console.error('Failed to load map image:', uri, e);
            imageLoaded = false;
            imageError = true;
            render();
        };
        
        mapImage.src = uri;
    }

    function render() {
        if (!ctx || !canvas) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Apply transformation
        ctx.save();
        ctx.translate(viewport.translateX, viewport.translateY);
        ctx.scale(viewport.scale, viewport.scale);

        // Draw map image
        if (imageLoaded && mapImage) {
            ctx.drawImage(mapImage, 0, 0);
        } else if (imageError) {
            // Draw error message in world space
            ctx.restore();
            ctx.fillStyle = '#666';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Failed to load map image', canvas.width / 2, canvas.height / 2 - 10);
            ctx.fillText('Check console for details', canvas.width / 2, canvas.height / 2 + 10);
            ctx.save();
            ctx.translate(viewport.translateX, viewport.translateY);
            ctx.scale(viewport.scale, viewport.scale);
        } else {
            // Draw loading message
            ctx.restore();
            ctx.fillStyle = '#666';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Loading map...', canvas.width / 2, canvas.height / 2);
            ctx.save();
            ctx.translate(viewport.translateX, viewport.translateY);
            ctx.scale(viewport.scale, viewport.scale);
        }

        // Draw pins
        if (state.pins && Array.isArray(state.pins)) {
            state.pins.forEach((pin) => {
                drawPin(ctx, pin);
            });
        }

        ctx.restore();

        // Draw UI overlay (zoom level, etc.)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, canvas.height - 30, 100, 20);
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Zoom: ${Math.round(viewport.scale * 100)}%`, 15, canvas.height - 15);
    }

    /**
     * Draw a pin on the canvas
     * @param {CanvasRenderingContext2D} ctx 
     * @param {{x: number, y: number, label: string, icon: string}} pin 
     */
    function drawPin(ctx, pin) {
        const x = pin.x;
        const y = pin.y;
        const size = 24;
        const radius = size / 2;

        // Draw pin background circle
        ctx.save();
        
        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        // Gradient background
        const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
        gradient.addColorStop(0, '#8B5CF6');
        gradient.addColorStop(1, '#7C3AED');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // White border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.restore();

        // Draw icon/emoji
        ctx.save();
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(pin.icon || '📍', x, y);
        ctx.restore();
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

    // Signal that the webview is ready to receive data
    vscode.postMessage({ type: 'ready' });
}());
