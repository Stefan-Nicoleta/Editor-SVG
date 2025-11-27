/**
 * Auto-save and restore functionality using localStorage
 */

// Constants for storage
const STORAGE_KEY = 'editor-svg-drawing-v1';
const SAVE_DEBOUNCE_MS = 700;
let saveTimer = null;

function serializeSVGForStorage() {
    try {
        const svgContainer = document.getElementById('svgContainer');
        const clone = svgContainer.cloneNode(true);
        const handles = clone.querySelectorAll('circle[data-handle-index]');
        handles.forEach(h => h.remove());
        const serializer = new XMLSerializer();
        return serializer.serializeToString(clone);
    } catch (err) {
        console.error('Failed to serialize SVG', err);
        return null;
    }
}

function saveSVGToStorage() {
    const svgData = serializeSVGForStorage();
    if (svgData) {
        try {
            localStorage.setItem(STORAGE_KEY, svgData);
            console.log('Drawing saved to localStorage');
        } catch (err) {
            console.warn('Failed to save to localStorage', err);
        }
    }
}

// Schedule a debounced save (used to avoid excessive writes while drawing/dragging)
function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveSVGToStorage();
    }, SAVE_DEBOUNCE_MS);
}

// Restore SVG from localStorage (call on page load)
function restoreSVGFromStorage() {
    try {
        const savedSvg = localStorage.getItem(STORAGE_KEY);
        const svgContainer = document.getElementById('svgContainer');
        if (savedSvg) {
            // Parse and insert into container
            const parser = new DOMParser();
            const doc = parser.parseFromString(savedSvg, 'image/svg+xml');
            if (doc.documentElement.tagName === 'svg') {
                // Clear current container
                svgContainer.innerHTML = '';
                // Copy attributes from parsed SVG
                Array.from(doc.documentElement.attributes).forEach(attr => {
                    if (attr.name !== 'id' && attr.name !== 'class') {
                        svgContainer.setAttribute(attr.name, attr.value);
                    }
                });
                // Copy child nodes
                Array.from(doc.documentElement.childNodes).forEach(child => {
                    svgContainer.appendChild(child.cloneNode(true));
                });
                console.log('Drawing restored from localStorage');
                return true;
            }
        }
    } catch (err) {
        console.warn('Failed to restore from localStorage', err);
    }
    return false;
}

// Restore on page load
window.addEventListener('DOMContentLoaded', () => {
    restoreSVGFromStorage();
});

// Save before page unload
window.addEventListener('beforeunload', () => {
    saveSVGToStorage();
});
