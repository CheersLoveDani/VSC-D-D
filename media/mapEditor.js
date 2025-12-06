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
    let imageErrorMessage = '';
    let currentImageUri = '';
    let isFirstLoad = true;

    // External URL warning
    const EXTERNAL_URL_WARNING_KEY = 'dnd-map-external-url-warning-dismissed';

    // Pan/drag state
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    let isEditMode = false;
    /** @type {HTMLElement | null} */
    let activePopover = null;
    /** @type {number} */
    let hoveredPinIndex = -1;
    /** @type {HTMLElement | null} */
    let previewPopover = null;

    // Track if map is empty (no image set)
    let isEmptyMap = true;
    
    // Animation state for smooth pin hover
    let pinHoverScale = 1.0;
    let targetPinHoverScale = 1.0;
    /** @type {number | null} */
    let animationFrameId = null;

    // Initialize UI
    createToolbar();
    createEmptyState();
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

    function createEmptyState() {
        let emptyState = document.querySelector('.empty-state');
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-state-icon">🗺️</div>
                <div class="empty-state-title">No Map Image</div>
                <div class="empty-state-text">Choose an image to get started with your map</div>
                <button class="dnd-btn empty-state-btn" id="choose-image-btn">Choose Map Image</button>
            `;
            mapContainer.appendChild(emptyState);

            const chooseBtn = emptyState.querySelector('#choose-image-btn');
            if (chooseBtn) {
                chooseBtn.addEventListener('click', () => {
                    vscode.postMessage({ type: 'selectImage' });
                });
            }
        }
    }

    function updateEmptyState() {
        const emptyState = document.querySelector('.empty-state');
        const toolbar = document.querySelector('.toolbar');

        if (emptyState) {
            if (isEmptyMap) {
                emptyState.classList.remove('hidden');
                if (toolbar) toolbar.classList.add('hidden');
            } else {
                emptyState.classList.add('hidden');
                if (toolbar) toolbar.classList.remove('hidden');
            }
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

        // Mouse events for pan and hover
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        // Right-click for pin placement in edit mode
        canvas.addEventListener('contextmenu', handleContextMenu);
        
        // Click for pin interaction
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
        // Allow panning in both edit and view modes
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        
        if (canvas) {
            canvas.style.cursor = 'grabbing';
        }
    }

    function handleMouseMove(/** @type {MouseEvent} */ e) {
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Handle dragging
        if (isDragging) {
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;

            viewport.translateX += deltaX;
            viewport.translateY += deltaY;

            lastX = e.clientX;
            lastY = e.clientY;

            render();
            return;
        }

        // Check for pin hover (only in view mode)
        if (!isEditMode) {
            const pinIndex = findPinAtScreen(screenX, screenY);
            
            if (pinIndex !== hoveredPinIndex) {
                hoveredPinIndex = pinIndex;
                targetPinHoverScale = pinIndex !== -1 ? 1.3 : 1.0;
                startAnimation();
                
                // Show/hide preview
                if (pinIndex !== -1) {
                    const pin = state.pins[pinIndex];
                    if (pin.link) {
                        showPreview(pin, e.clientX, e.clientY);
                    } else {
                        closePreview();
                    }
                } else {
                    closePreview();
                }
            }
        }
    }

    function handleMouseUp() {
        isDragging = false;
        if (canvas) {
            canvas.style.cursor = isEditMode ? 'crosshair' : 'grab';
        }
    }

    function handleMouseLeave() {
        isDragging = false;
        hoveredPinIndex = -1;
        targetPinHoverScale = 1.0;
        closePreview();
        if (canvas) {
            canvas.style.cursor = isEditMode ? 'crosshair' : 'grab';
        }
        startAnimation();
    }

    function handleContextMenu(/** @type {MouseEvent} */ e) {
        e.preventDefault();
        
        if (!isEditMode || !canvas) return;

        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
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
        
        // Store viewport state before showing popover to prevent jumping
        const savedViewport = {
            scale: viewport.scale,
            translateX: viewport.translateX,
            translateY: viewport.translateY
        };
        
        saveState();
        
        // Restore viewport after save to prevent any jumping
        viewport.scale = savedViewport.scale;
        viewport.translateX = savedViewport.translateX;
        viewport.translateY = savedViewport.translateY;
        
        // Show edit popover for new pin
        setTimeout(() => {
            showPinPopover(newPin, state.pins.length - 1, e.clientX, e.clientY);
        }, 50);
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
        }
        // Note: Pin placement now handled by right-click (contextmenu event)
    }

    function startAnimation() {
        if (animationFrameId) return; // Already animating
        
        function animate() {
            // Smooth interpolation
            const diff = targetPinHoverScale - pinHoverScale;
            if (Math.abs(diff) > 0.01) {
                pinHoverScale += diff * 0.2; // Ease factor
                render();
                animationFrameId = requestAnimationFrame(animate);
            } else {
                pinHoverScale = targetPinHoverScale;
                render();
                animationFrameId = null;
            }
        }
        
        animationFrameId = requestAnimationFrame(animate);
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
                    const text = message.text.trim();
                    // Handle empty file
                    if (!text) {
                        state = { imagePath: '', pins: [] };
                        isEmptyMap = true;
                        imageErrorMessage = '';
                        updateEmptyState();
                        render();
                        return;
                    }

                    const newState = JSON.parse(text);
                    state = newState || {};
                    // Ensure pins is an array
                    if (!Array.isArray(state.pins)) {
                        state.pins = [];
                    }
                    // @ts-ignore
                    const resolvedImageUri = message.resolvedImageUri;
                    const imagePathType = message.imagePathType;
                    const imagePathError = message.imagePathError;

                    // Handle validation errors
                    if (imagePathError) {
                        showImagePathError(imagePathError);
                        return;
                    }

                    // Clear any previous error message
                    imageErrorMessage = '';

                    // Show warning for external URLs (but don't block)
                    if (imagePathType === 'external') {
                        const dismissed = localStorage.getItem(EXTERNAL_URL_WARNING_KEY) === 'true';
                        if (!dismissed) {
                            showExternalUrlWarning();
                        }
                    }

                    // Check if map has an image
                    isEmptyMap = !state.imagePath && !resolvedImageUri;
                    updateEmptyState();

                    if (resolvedImageUri) {
                        // Only reload image if URI has changed
                        if (resolvedImageUri !== currentImageUri) {
                            loadImage(resolvedImageUri);
                        } else {
                            // Just re-render with updated state, don't reload image
                            render();
                        }
                    } else {
                        imageLoaded = false;
                        imageError = false; // Not an error, just no image yet
                        render();
                    }
                } catch (e) {
                    console.error('Error parsing state:', e);
                    // Show empty state on parse error
                    isEmptyMap = true;
                    updateEmptyState();
                }
                return;
            case 'previewData':
                // Display preview popover with file data
                if (message.data) {
                    displayPreview(message.data, message.x, message.y);
                }
                return;
        }
    });

    function loadImage(/** @type {string} */ uri) {
        imageLoaded = false;
        imageError = false;
        currentImageUri = uri;
        
        mapImage = new Image();
        
        mapImage.onload = () => {
            console.log('Map image loaded successfully:', uri);
            imageLoaded = true;
            imageError = false;
            
            // Center image only on first load
            if (isFirstLoad && canvas) {
                viewport.translateX = (canvas.width - mapImage.width) / 2;
                viewport.translateY = (canvas.height - mapImage.height) / 2;
                isFirstLoad = false;
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

    /**
     * Show an error when the image path is invalid
     * @param {string} message
     */
    function showImagePathError(message) {
        imageLoaded = false;
        imageError = true;
        imageErrorMessage = message;
        isEmptyMap = false; // Don't show empty state, show error instead
        updateEmptyState();
        render();
    }

    /**
     * Show warning modal for external URLs
     */
    function showExternalUrlWarning() {
        // Remove any existing warning modal
        const existing = document.querySelector('.warning-modal-overlay');
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement('div');
        overlay.className = 'warning-modal-overlay';
        overlay.innerHTML = `
            <div class="warning-modal">
                <div class="warning-modal-icon">⚠️</div>
                <h3>External Image URL</h3>
                <p>You're using an external web URL for this map image.</p>
                <p><strong>Note:</strong> External URLs can change or become unavailable, which would break your map. Consider downloading images to your project folder.</p>
                <label class="warning-modal-checkbox">
                    <input type="checkbox" id="dontShowAgain">
                    <span>Don't show this warning again</span>
                </label>
                <div class="warning-modal-buttons">
                    <button class="dnd-btn" id="warningDismiss">Got it</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const dismissBtn = overlay.querySelector('#warningDismiss');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                const checkbox = /** @type {HTMLInputElement} */ (overlay.querySelector('#dontShowAgain'));
                if (checkbox && checkbox.checked) {
                    localStorage.setItem(EXTERNAL_URL_WARNING_KEY, 'true');
                }
                overlay.remove();
            });
        }
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
            // Draw error message in screen space
            ctx.restore();
            ctx.fillStyle = '#DC2626'; // Red for errors
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';

            if (imageErrorMessage) {
                // Draw custom error message (may be multi-line)
                const lines = imageErrorMessage.split('\n');
                const lineHeight = 24;
                const startY = canvas.height / 2 - (lines.length * lineHeight) / 2;

                // Draw error icon
                ctx.font = '32px sans-serif';
                ctx.fillText('⚠️', canvas.width / 2, startY - 30);

                // Draw error lines
                ctx.font = '14px sans-serif';
                ctx.fillStyle = '#999';
                lines.forEach((line, i) => {
                    ctx.fillText(line.trim(), canvas.width / 2, startY + i * lineHeight);
                });
            } else {
                // Generic error
                ctx.fillText('Failed to load map image', canvas.width / 2, canvas.height / 2 - 10);
                ctx.fillStyle = '#666';
                ctx.font = '14px sans-serif';
                ctx.fillText('Check console for details', canvas.width / 2, canvas.height / 2 + 15);
            }

            ctx.save();
            ctx.translate(viewport.translateX, viewport.translateY);
            ctx.scale(viewport.scale, viewport.scale);
        } else if (!isEmptyMap) {
            // Only show loading if we expect an image
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
            state.pins.forEach((pin, index) => {
                drawPin(ctx, pin, index);
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
     * @param {number} index
     */
    function drawPin(ctx, pin, index) {
        const x = pin.x;
        const y = pin.y;
        const baseSize = 24;
        const isHovered = index === hoveredPinIndex && !isEditMode;
        // Use animated scale for smooth transition
        const size = isHovered ? baseSize * pinHoverScale : baseSize;
        const radius = size / 2;

        // Draw pin background circle
        ctx.save();
        
        // Enhanced shadow for hover
        if (isHovered) {
            ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
            ctx.shadowBlur = 12;
        } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 4;
        }
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        // Gradient background
        const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
        gradient.addColorStop(0, isHovered ? '#A78BFA' : '#8B5CF6');
        gradient.addColorStop(1, isHovered ? '#8B5CF6' : '#7C3AED');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // White border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = isHovered ? 4 : 3;
        ctx.stroke();
        
        ctx.restore();

        // Draw icon/emoji
        ctx.save();
        ctx.font = isHovered ? '20px sans-serif' : '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(pin.icon || '📍', x, y);
        ctx.restore();
    }

    /**
     * Show preview popover for a pin's linked file
     * @param {{link: string, label: string}} pin
     * @param {number} x
     * @param {number} y
     */
    function showPreview(pin, x, y) {
        closePreview();
        
        // Request preview data from backend
        vscode.postMessage({ type: 'getPreview', path: pin.link, x: x, y: y });
    }

    /**
     * Close the preview popover
     */
    function closePreview() {
        if (previewPopover) {
            previewPopover.remove();
            previewPopover = null;
        }
    }

    /**
     * Display preview data in a popover
     * @param {any} data
     * @param {number} x
     * @param {number} y
     */
    function displayPreview(data, x, y) {
        closePreview();
        
        if (!data) return;
        
        const popover = document.createElement('div');
        popover.className = 'preview-popover';
        popover.style.position = 'fixed';
        popover.style.left = `${x + 10}px`;
        popover.style.top = `${y + 10}px`;
        
        let content = '';
        
        if (data.type === 'character') {
            content = `
                <div class="preview-title">${data.name || 'Unnamed'}</div>
                <div class="preview-detail"><b>Class:</b> ${data.class || 'Unknown'}</div>
                <div class="preview-detail"><b>HP:</b> ${data.hp || 'Unknown'}</div>
            `;
        } else if (data.type === 'item') {
            content = `
                <div class="preview-title">${data.name || 'Unnamed'}</div>
                <div class="preview-detail"><b>Type:</b> ${data.itemType || 'Unknown'}</div>
                <div class="preview-detail"><b>Value:</b> ${data.value || 'Unknown'}</div>
            `;
        } else if (data.type === 'map') {
            content = `
                <div class="preview-title">Map</div>
                ${data.imageSrc ? `<img src="${data.imageSrc}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;">` : ''}
                <div class="preview-detail"><b>Pins:</b> ${data.pinCount || 0}</div>
            `;
        } else if (data.type === 'notes') {
            content = `<div class="preview-title">${data.title || 'Note'}</div>`;
            if (data.headers && data.headers.length > 0) {
                content += '<div class="preview-detail" style="display: flex; flex-direction: column; gap: 4px;">';
                data.headers.forEach(header => {
                    const indent = (header.level - 1) * 12;
                    content += `<div style="padding-left: ${indent}px; font-size: 12px;">• ${header.text}</div>`;
                });
                content += '</div>';
            } else {
                content += '<div class="preview-detail"><i>No headers found</i></div>';
            }
        }
        
        popover.innerHTML = content;
        document.body.appendChild(popover);
        previewPopover = popover;
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
        popover.style.position = 'fixed';
        
        // Temporarily append to measure size
        popover.style.visibility = 'hidden';
        document.body.appendChild(popover);
        
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
        
        // Measure popover size
        const rect = popover.getBoundingClientRect();
        const popoverWidth = rect.width;
        const popoverHeight = rect.height;
        
        // Constrain to viewport
        let finalX = x;
        let finalY = y;
        
        // Check right edge
        if (finalX + popoverWidth > window.innerWidth) {
            finalX = window.innerWidth - popoverWidth - 10;
        }
        
        // Check bottom edge
        if (finalY + popoverHeight > window.innerHeight) {
            finalY = window.innerHeight - popoverHeight - 10;
        }
        
        // Check left edge
        if (finalX < 10) {
            finalX = 10;
        }
        
        // Check top edge
        if (finalY < 10) {
            finalY = 10;
        }
        
        popover.style.left = `${finalX}px`;
        popover.style.top = `${finalY}px`;
        popover.style.visibility = 'visible';

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
