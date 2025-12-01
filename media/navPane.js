/**
 * Navigation Pane for Notes Editor
 * Provides Google Docs-style table of contents with:
 * - Heading extraction from TipTap editor or raw markdown
 * - Click-to-jump navigation
 * - Scroll-sync active heading highlighting
 * - Collapsible sidebar with small viewport overlay mode
 */

(function() {
    'use strict';

    // Note: We use localStorage for state persistence instead of vscode.getState()
    // because acquireVsCodeApi() can only be called once per webview (notesEditor.js calls it).

    // State
    let navPane = null;
    let navContent = null;
    let navToggle = null;
    let expandBtn = null;
    let backdrop = null;
    let scrollContainer = null;
    let editorContainer = null;
    let rawTextarea = null;
    let observer = null;
    let headingElements = [];
    let isCollapsed = false;
    let isSmallViewport = false;
    let currentMode = 'view'; // 'view', 'edit', 'raw'
    let refreshDebounceTimeout = null;

    const SMALL_VIEWPORT_BREAKPOINT = 600;
    const REFRESH_DEBOUNCE_MS = 300;

    /**
     * Initialize the navigation pane
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.scrollContainer - The scroll container (.content-area)
     * @param {HTMLElement} [options.editorContainer] - The editor container (#tiptap-editor or #tiptap-viewer)
     * @param {HTMLTextAreaElement} [options.rawTextarea] - The raw markdown textarea
     * @param {string} [options.mode] - Current mode: 'view', 'edit', or 'raw'
     */
    function init(options) {
        scrollContainer = options.scrollContainer;
        editorContainer = options.editorContainer || null;
        rawTextarea = options.rawTextarea || null;
        currentMode = options.mode || 'view';

        // Get nav pane elements
        navPane = document.querySelector('.nav-pane');
        navContent = document.querySelector('.nav-pane-content');
        navToggle = document.querySelector('.nav-pane-toggle');
        expandBtn = document.querySelector('.nav-pane-expand-btn');
        backdrop = document.querySelector('.nav-pane-backdrop');

        if (!navPane || !navContent) {
            console.warn('NavPane: Required elements not found');
            return;
        }

        // Restore state
        restoreState();

        // Check viewport size
        checkViewportSize();

        // Setup event listeners
        setupEventListeners();

        // Initial build
        refresh();

        // Setup scroll sync
        setupScrollSync();
    }

    /**
     * Restore collapsed state from localStorage
     */
    function restoreState() {
        try {
            const stored = localStorage.getItem('navPaneCollapsed');
            isCollapsed = stored === 'true';
        } catch (e) {
            isCollapsed = false;
        }

        // Don't apply collapsed state on init - we want expanded by default
        // State is restored after initial render
    }

    /**
     * Save state to localStorage
     */
    function saveState() {
        try {
            localStorage.setItem('navPaneCollapsed', isCollapsed ? 'true' : 'false');
        } catch (e) {
            // Ignore state save errors
        }
    }

    /**
     * Check if viewport is small and update state
     */
    function checkViewportSize() {
        const wasSmall = isSmallViewport;
        isSmallViewport = window.innerWidth <= SMALL_VIEWPORT_BREAKPOINT;

        if (isSmallViewport && !wasSmall) {
            // Transitioned to small viewport - collapse
            collapse();
        } else if (!isSmallViewport && wasSmall) {
            // Transitioned to large viewport - restore from state
            if (!isCollapsed) {
                expand();
            }
        }

        updateClasses();
    }

    /**
     * Update CSS classes based on state
     */
    function updateClasses() {
        if (!navPane) return;

        if (isSmallViewport) {
            // Small viewport: use expanded class for overlay
            navPane.classList.remove('collapsed');
            navPane.classList.toggle('expanded', !isCollapsed);
            if (backdrop) {
                backdrop.classList.toggle('visible', !isCollapsed);
            }
        } else {
            // Large viewport: use collapsed class
            navPane.classList.remove('expanded');
            navPane.classList.toggle('collapsed', isCollapsed);
            if (backdrop) {
                backdrop.classList.remove('visible');
            }
        }

        // Update toggle button icon
        if (navToggle) {
            navToggle.innerHTML = isCollapsed ? '&#9654;' : '&#9664;'; // Right or Left arrow
            navToggle.title = isCollapsed ? 'Expand' : 'Collapse';
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Toggle button in header
        if (navToggle) {
            navToggle.addEventListener('click', toggle);
        }

        // Expand button (small viewport)
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                expand();
            });
        }

        // Backdrop click (small viewport)
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                collapse();
            });
        }

        // Window resize
        window.addEventListener('resize', debounce(checkViewportSize, 150));

        // Raw textarea events (for raw mode)
        if (rawTextarea) {
            rawTextarea.addEventListener('input', debounceRefresh);
            rawTextarea.addEventListener('scroll', debounce(syncActiveFromTextarea, 100));
        }
    }

    /**
     * Toggle navigation pane collapsed state
     */
    function toggle() {
        if (isCollapsed) {
            expand();
        } else {
            collapse();
        }
    }

    /**
     * Expand the navigation pane
     */
    function expand() {
        isCollapsed = false;
        saveState();
        updateClasses();

        // On small viewports, close any open popovers when opening the overlay
        if (isSmallViewport) {
            closeAllPopovers();
        }
    }

    /**
     * Close all open popovers to prevent them showing through the overlay
     */
    function closeAllPopovers() {
        // Close main preview popover
        const popover = document.getElementById('popover');
        if (popover) {
            popover.classList.remove('visible');
            popover.style.display = 'none';
        }

        // Close compendium tooltip
        const compendiumTooltip = document.getElementById('compendium-tooltip');
        if (compendiumTooltip) {
            compendiumTooltip.classList.remove('visible');
            compendiumTooltip.style.display = 'none';
        }

        // Close any context menus
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.classList.remove('visible');
        }

        const tableContextMenu = document.getElementById('table-context-menu');
        if (tableContextMenu) {
            tableContextMenu.classList.remove('visible');
        }
    }

    /**
     * Collapse the navigation pane
     */
    function collapse() {
        isCollapsed = true;
        saveState();
        updateClasses();
    }

    /**
     * Generate a unique ID for a heading
     * @param {string} text - Heading text content
     * @param {number} index - Index in document order
     * @returns {string}
     */
    function generateHeadingId(text, index) {
        const slug = (text || 'heading')
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
        return `nav-heading-${slug}-${index}`;
    }

    /**
     * Debounced refresh call
     */
    function debounceRefresh() {
        if (refreshDebounceTimeout) {
            clearTimeout(refreshDebounceTimeout);
        }
        refreshDebounceTimeout = setTimeout(() => {
            refresh();
        }, REFRESH_DEBOUNCE_MS);
    }

    /**
     * Refresh the navigation pane with current headings
     */
    function refresh() {
        if (!navContent) return;

        // Disconnect existing observer
        if (observer) {
            observer.disconnect();
        }

        // Clear current items
        navContent.innerHTML = '';
        headingElements = [];

        if (currentMode === 'raw' && rawTextarea) {
            refreshFromRawMarkdown();
        } else {
            refreshFromEditor();
        }
    }

    /**
     * Refresh headings from TipTap editor DOM
     */
    function refreshFromEditor() {
        if (!editorContainer) {
            showEmptyState();
            return;
        }

        // Find ProseMirror element
        const proseMirror = editorContainer.querySelector('.ProseMirror');
        if (!proseMirror) {
            showEmptyState();
            return;
        }

        const headings = proseMirror.querySelectorAll('h1, h2, h3, h4, h5, h6');

        if (headings.length === 0) {
            showEmptyState();
            return;
        }

        // Build navigation items
        headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName.substring(1));
            const text = heading.textContent || '';
            const id = generateHeadingId(text, index);

            // Set data attribute on heading for navigation
            heading.setAttribute('data-nav-id', id);
            headingElements.push(heading);

            // Create nav item
            createNavItem(id, level, text, index, () => {
                scrollToEditorHeading(heading);
            });
        });

        // Setup scroll sync
        setupScrollSync();
    }

    /**
     * Refresh headings from raw markdown text
     */
    function refreshFromRawMarkdown() {
        if (!rawTextarea) {
            showEmptyState();
            return;
        }

        const text = rawTextarea.value || '';
        const headings = extractMarkdownHeadings(text);

        if (headings.length === 0) {
            showEmptyState();
            return;
        }

        // Build navigation items
        headings.forEach((heading, index) => {
            const id = generateHeadingId(heading.text, index);

            // Store line info for navigation
            heading.navId = id;

            // Create nav item
            createNavItem(id, heading.level, heading.text, index, () => {
                scrollToMarkdownLine(heading.lineIndex);
            });
        });

        // Store headings for scroll sync
        headingElements = headings;

        // Initial sync
        syncActiveFromTextarea();
    }

    /**
     * Extract headings from markdown text
     * @param {string} text - Markdown text
     * @returns {Array} Array of heading objects with level, text, lineIndex
     */
    function extractMarkdownHeadings(text) {
        const headings = [];
        const lines = text.split('\n');

        lines.forEach((line, lineIndex) => {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                headings.push({
                    level: match[1].length,
                    text: match[2].trim(),
                    lineIndex: lineIndex,
                    charIndex: getCharIndexForLine(text, lineIndex)
                });
            }
        });

        return headings;
    }

    /**
     * Get character index for a line number
     * @param {string} text - Full text
     * @param {number} lineIndex - Line index (0-based)
     * @returns {number} Character index
     */
    function getCharIndexForLine(text, lineIndex) {
        const lines = text.split('\n');
        let charIndex = 0;
        for (let i = 0; i < lineIndex && i < lines.length; i++) {
            charIndex += lines[i].length + 1; // +1 for newline
        }
        return charIndex;
    }

    /**
     * Create a navigation item
     * @param {string} id - Unique ID
     * @param {number} level - Heading level (1-6)
     * @param {string} text - Heading text
     * @param {number} index - Index for fallback text
     * @param {Function} onClick - Click handler
     */
    function createNavItem(id, level, text, index, onClick) {
        const navItem = document.createElement('button');
        navItem.className = 'nav-item';
        navItem.setAttribute('data-level', level.toString());
        navItem.setAttribute('data-nav-id', id);
        navItem.textContent = text || `Heading ${index + 1}`;
        navItem.title = text; // Tooltip for truncated text

        navItem.addEventListener('click', () => {
            onClick();

            // On small viewport, auto-collapse after clicking
            if (isSmallViewport) {
                setTimeout(() => {
                    collapse();
                }, 100);
            }
        });

        navContent.appendChild(navItem);
    }

    /**
     * Show empty state when no headings found
     */
    function showEmptyState() {
        if (!navContent) return;
        navContent.innerHTML = '<div class="nav-pane-empty">No headings found</div>';
    }

    /**
     * Scroll to a heading element in the editor
     * @param {HTMLElement} heading
     */
    function scrollToEditorHeading(heading) {
        if (!scrollContainer || !heading) return;

        // Use smooth scroll
        heading.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        // Briefly highlight the heading
        highlightElement(heading);

        // Set as active
        setActiveHeading(heading.getAttribute('data-nav-id'));
    }

    /**
     * Scroll to a line in the raw markdown textarea
     * @param {number} lineIndex - Line index (0-based)
     */
    function scrollToMarkdownLine(lineIndex) {
        if (!rawTextarea) return;

        const text = rawTextarea.value;
        const charIndex = getCharIndexForLine(text, lineIndex);

        // Set cursor position
        rawTextarea.focus();
        rawTextarea.setSelectionRange(charIndex, charIndex);

        // Calculate scroll position
        // Approximate: each line is roughly lineHeight pixels
        const style = window.getComputedStyle(rawTextarea);
        const lineHeight = parseFloat(style.lineHeight) || 20;
        const scrollTop = lineIndex * lineHeight;

        rawTextarea.scrollTop = scrollTop - rawTextarea.clientHeight / 4;

        // Set as active
        const heading = headingElements.find(h => h.lineIndex === lineIndex);
        if (heading) {
            setActiveHeading(heading.navId);
        }
    }

    /**
     * Briefly highlight an element
     * @param {HTMLElement} element
     */
    function highlightElement(element) {
        const originalBg = element.style.backgroundColor;
        const originalTransition = element.style.transition;

        element.style.transition = 'background-color 0.3s';
        element.style.backgroundColor = 'var(--dnd-accent-soft)';

        setTimeout(() => {
            element.style.backgroundColor = originalBg;
            setTimeout(() => {
                element.style.transition = originalTransition;
            }, 300);
        }, 1000);
    }

    /**
     * Setup IntersectionObserver for scroll synchronization (editor mode)
     */
    function setupScrollSync() {
        if (!scrollContainer || headingElements.length === 0 || currentMode === 'raw') return;

        // Disconnect existing observer
        if (observer) {
            observer.disconnect();
        }

        observer = new IntersectionObserver(
            (entries) => {
                // Find the topmost visible heading
                let topMostVisible = null;
                let topMostY = Infinity;

                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const rect = entry.boundingClientRect;
                        if (rect.top < topMostY) {
                            topMostY = rect.top;
                            topMostVisible = entry.target;
                        }
                    }
                });

                if (topMostVisible) {
                    setActiveHeading(topMostVisible.getAttribute('data-nav-id'));
                }
            },
            {
                root: scrollContainer,
                rootMargin: '-10% 0px -70% 0px',
                threshold: [0, 0.1, 0.25, 0.5]
            }
        );

        // Observe all headings (only DOM elements, not markdown heading objects)
        headingElements.forEach(heading => {
            if (heading instanceof Element) {
                observer.observe(heading);
            }
        });
    }

    /**
     * Sync active heading from textarea scroll position (raw mode)
     */
    function syncActiveFromTextarea() {
        if (!rawTextarea || currentMode !== 'raw' || headingElements.length === 0) return;

        const scrollTop = rawTextarea.scrollTop;
        const style = window.getComputedStyle(rawTextarea);
        const lineHeight = parseFloat(style.lineHeight) || 20;

        // Estimate which line is at the top of the viewport
        const topLine = Math.floor(scrollTop / lineHeight);

        // Find the heading closest to but before the top line
        let activeHeading = null;
        for (const heading of headingElements) {
            if (heading.lineIndex <= topLine + 2) { // +2 for some tolerance
                activeHeading = heading;
            } else {
                break;
            }
        }

        if (activeHeading) {
            setActiveHeading(activeHeading.navId);
        }
    }

    /**
     * Set the active heading in the navigation pane
     * @param {string|null} navId
     */
    function setActiveHeading(navId) {
        if (!navContent) return;

        // Remove active class from all items
        const items = navContent.querySelectorAll('.nav-item');
        items.forEach(item => item.classList.remove('active'));

        // Add active class to matching item
        if (navId) {
            const activeItem = navContent.querySelector(`.nav-item[data-nav-id="${navId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');

                // Scroll nav item into view if needed
                const contentRect = navContent.getBoundingClientRect();
                const itemRect = activeItem.getBoundingClientRect();

                if (itemRect.top < contentRect.top || itemRect.bottom > contentRect.bottom) {
                    activeItem.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }
            }
        }
    }

    /**
     * Update the current mode
     * @param {string} mode - 'view', 'edit', or 'raw'
     * @param {Object} [options] - Optional new references
     */
    function setMode(mode, options) {
        currentMode = mode;

        if (options) {
            if (options.editorContainer !== undefined) {
                editorContainer = options.editorContainer;
            }
            if (options.rawTextarea !== undefined) {
                rawTextarea = options.rawTextarea;
            }
        }

        refresh();
    }

    /**
     * Destroy the navigation pane (cleanup)
     */
    function destroy() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        if (refreshDebounceTimeout) {
            clearTimeout(refreshDebounceTimeout);
        }
        headingElements = [];
        navPane = null;
        navContent = null;
        navToggle = null;
        expandBtn = null;
        backdrop = null;
        scrollContainer = null;
        editorContainer = null;
        rawTextarea = null;
    }

    /**
     * Debounce utility function
     * @param {Function} func
     * @param {number} wait
     * @returns {Function}
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Expose API globally
    window.NavPane = {
        init,
        refresh,
        toggle,
        expand,
        collapse,
        setMode,
        destroy
    };

})();
