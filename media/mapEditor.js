// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const mapContainer = /** @type {HTMLElement} */ (document.getElementById('map-container'));
    const mapContent = /** @type {HTMLElement} */ (document.getElementById('map-content'));
    const mapImage = /** @type {HTMLImageElement} */ (document.getElementById('map-image'));
    const pinsLayer = /** @type {HTMLElement} */ (document.getElementById('pins-layer'));
    const addPinBtn = /** @type {HTMLElement} */ (document.getElementById('add-pin-btn'));

    /** @type {{imagePath: string, pins: Array<{x: number, y: number, label: string}>}} */
    let state = {
        imagePath: '',
        pins: []
    };

    let isAddPinMode = false;

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                const text = message.text;
                try {
                    state = JSON.parse(text);
                    render();
                } catch {
                    // ignore
                }
                return;
        }
    });

    function render() {
        if (state.imagePath) {
            mapImage.src = state.imagePath;
        } else {
            mapImage.src = ''; // TODO: Show placeholder
        }

        pinsLayer.innerHTML = '';
        if (state.pins) {
            state.pins.forEach(pin => {
                const el = document.createElement('div');
                el.className = 'pin';
                el.style.left = `${pin.x}px`;
                el.style.top = `${pin.y}px`;
                el.setAttribute('data-label', pin.label || 'Pin');
                el.onclick = (e) => {
                    e.stopPropagation();
                    // TODO: Open link
                    console.log('Clicked pin', pin);
                };
                pinsLayer.appendChild(el);
            });
        }
    }

    addPinBtn.addEventListener('click', () => {
        isAddPinMode = !isAddPinMode;
        addPinBtn.textContent = isAddPinMode ? 'Cancel Add Pin' : 'Add Pin Mode';
        mapContainer.style.cursor = isAddPinMode ? 'crosshair' : 'default';
    });

    mapContent.addEventListener('click', (e) => {
        if (!isAddPinMode) return;

        const rect = mapContent.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        vscode.postMessage({
            type: 'addPin',
            x: Math.round(x),
            y: Math.round(y)
        });

        isAddPinMode = false;
        addPinBtn.textContent = 'Add Pin Mode';
        mapContainer.style.cursor = 'default';
    });

    // Signal that the webview is ready to receive data
    vscode.postMessage({ type: 'ready' });
}());
