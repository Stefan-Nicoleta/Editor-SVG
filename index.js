/**
 * Editor SVG - Implementarea Cerințelor
 * 
 * CERINȚA 1 (1p):
 * - Suport pentru adăugare elemente geometrice de bază
 * - Implementează desenarea de:
 *   • Linii
 *   • Elipse
 *   • Dreptunghiuri
 * 
 * CERINȚA 2:
 * - Suport pentru selectarea culorii și grosimii liniei
 * - Permite utilizatorului să:
 *   • Aleagă culoarea formelor folosind color picker
 *   • Ajusteze grosimea liniei folosind un slider
 * 
 * CERINȚA 3:
 * - Suport pentru selecție și editare elemente
 * - Funcționalități:
 *   • Selectare element existent
 *   • Modificare culoare contur și fundal
 *   • Modificare grosime linie
 *   • Ștergere element selectat
 */

// Selectăm elementele DOM necesare
const svgContainer = document.getElementById('svgContainer');  // Zona de desen SVG
const buttons = document.querySelectorAll('button');          // Toate butoanele din toolbar
const strokeColorInput = document.getElementById('strokeColor');    // Input pentru culoare contur
const fillColorInput = document.getElementById('fillColor');       // Input pentru culoare fundal
const fillEnabledInput = document.getElementById('fillEnabled'); // Checkbox pentru a activa/dezactiva fill
const strokeWidthInput = document.getElementById('strokeWidth');    // Slider pentru grosimea liniei
const strokeWidthValue = document.getElementById('strokeWidthValue'); // Afișarea valorii grosimii

// Variabile globale pentru starea editorului
let currentTool = null;      // Instrumentul curent selectat (line, rect, ellipse, select)
let isDrawing = false;       // Flag care indică dacă utilizatorul desenează în prezent
let startX, startY;         // Coordonatele de început ale formei curente
let currentElement = null;   // Elementul SVG care este în curs de desenare
let selectedElement = null;  // Elementul SVG selectat pentru editare
let currentColor = '#000000'; // Culoarea curentă selectată pentru contur
let currentFillColor = '#ffffff'; // Culoarea curentă pentru fundal (folosită doar dacă fill e activat)
let currentWidth = 2;        // Grosimea curentă a liniei
// Stivă pentru elementele desenate (folosită la undo)
let elementStack = [];
// Preview element (shown while hovering before drawing)
let previewElement = null;
// Drag state for moving selected elements
let isDraggingElement = false;
let dragStartX = 0, dragStartY = 0;
let dragData = null; // will hold original attributes for the dragged element
// Path drawing state
let isDrawingPath = false;
let currentPathPoints = [];
let currentPathElement = null;
let isHandleDragging = false;
let activeHandle = null;
let handleElements = [];
// Auto-save settings
const STORAGE_KEY = 'editor-svg-drawing-v1';
let saveTimer = null;
const SAVE_DEBOUNCE_MS = 700;

function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveSVGToStorage();
    }, SAVE_DEBOUNCE_MS);
}

function createPreviewElement(tool, x, y) {
    removePreviewElement();
    previewElement = document.createElementNS('http://www.w3.org/2000/svg', tool);
    previewElement.setAttribute('opacity', '0.6');
    previewElement.setAttribute('pointer-events', 'none');
    previewElement.setAttribute('stroke', currentColor);
    previewElement.setAttribute('stroke-width', currentWidth);
    
    if (tool !== 'line') {
        previewElement.setAttribute('fill', fillEnabledInput?.checked ? currentFillColor : 'none');
    } else {
        previewElement.setAttribute('fill', 'none');
    }
    
    switch(tool) {
        case 'line':
            previewElement.setAttribute('x1', x - 30);
            previewElement.setAttribute('y1', y - 30);
            previewElement.setAttribute('x2', x + 30);
            previewElement.setAttribute('y2', y + 30);
            break;
        case 'rect':
            previewElement.setAttribute('x', x - 35);
            previewElement.setAttribute('y', y - 35);
            previewElement.setAttribute('width', 70);
            previewElement.setAttribute('height', 70);
            break;
        case 'ellipse':
            previewElement.setAttribute('cx', x);
            previewElement.setAttribute('cy', y);
            previewElement.setAttribute('rx', 40);
            previewElement.setAttribute('ry', 30);
            break;
    }
    svgContainer.appendChild(previewElement);
}

function removePreviewElement() {
    if (previewElement && previewElement.parentNode) {
        previewElement.parentNode.removeChild(previewElement);
        previewElement = null;
    }
}

function updatePreviewElement(tool, x, y) {
    if (!previewElement) return;
    
    switch(tool) {
        case 'line':
            previewElement.setAttribute('x1', x - 30);
            previewElement.setAttribute('y1', y - 30);
            previewElement.setAttribute('x2', x + 30);
            previewElement.setAttribute('y2', y + 30);
            break;
        case 'rect':
            previewElement.setAttribute('x', x - 35);
            previewElement.setAttribute('y', y - 35);
            break;
        case 'ellipse':
            previewElement.setAttribute('cx', x);
            previewElement.setAttribute('cy', y);
            break;
    }
}

// Event listeners pentru controalele de stil
strokeColorInput.addEventListener('input', (e) => {
    currentColor = e.target.value;
    if (selectedElement) {
        selectedElement.setAttribute('stroke', currentColor);
    }
});

fillColorInput.addEventListener('input', (e) => {
    currentFillColor = e.target.value;
    if (selectedElement && selectedElement.tagName !== 'line' && fillEnabledInput.checked) {
        selectedElement.setAttribute('fill', currentFillColor);
        selectedElement.style.fill = currentFillColor;
    }
});

// Când toggle-ul de fill se schimbă, aplicăm sau eliminăm fill pentru elementul selectat
fillEnabledInput.addEventListener('change', (e) => {
    if (selectedElement && selectedElement.tagName !== 'line') {
        if (e.target.checked) {
            selectedElement.setAttribute('fill', currentFillColor);
            selectedElement.style.fill = currentFillColor;
        } else {
            selectedElement.setAttribute('fill', 'none');
            selectedElement.style.fill = 'none';
        }
    }
});

strokeWidthInput.addEventListener('input', (e) => {
    currentWidth = e.target.value;
    strokeWidthValue.textContent = currentWidth;
    if (selectedElement) {
        selectedElement.setAttribute('stroke-width', currentWidth);
    }
});

/**
 * Gestionarea instrumentelor de desen
 */

/**
 * Funcție pentru selectarea instrumentului activ
 * @param {string} toolName - Numele instrumentului selectat ('line', 'rect', 'ellipse')
 */
function selectTool(toolName) {
    currentTool = toolName;  // Setează instrumentul curent
    // Elimină clasa 'selected' de pe toate butoanele
    buttons.forEach(btn => btn.classList.remove('selected'));
    // Adaugă clasa 'selected' pe butonul activ
    document.getElementById(toolName + 'Btn').classList.add('selected');
}

// Configurarea event listeners pentru butoanele de instrumente
document.getElementById('lineBtn').onclick = () => selectTool('line');     // Instrument linie
document.getElementById('rectBtn').onclick = () => selectTool('rect');     // Instrument dreptunghi
document.getElementById('ellipseBtn').onclick = () => selectTool('ellipse');
document.getElementById('pathBtn').onclick = () => selectTool('path');
document.getElementById('selectBtn').onclick = () => selectTool('select');
document.getElementById('exportPngBtn').onclick = () => exportSVGAsImage('png');
document.getElementById('exportJpegBtn').onclick = () => exportSVGAsImage('jpeg');
document.getElementById('exportSvgBtn')?.addEventListener('click', () => {
    exportSVGFile();
    // close menu after clicking
    if (exportMenu) {
        exportMenu.classList.remove('show');
        exportMenu.setAttribute('aria-hidden', 'true');
    }
});
// Toggle export menu visibility
const exportToggleBtn = document.getElementById('exportToggleBtn');
const exportMenu = document.getElementById('exportMenu');
if (exportToggleBtn && exportMenu) {
    exportToggleBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const isShown = exportMenu.classList.toggle('show');
        exportMenu.setAttribute('aria-hidden', (!isShown).toString());
    });

    // Close menu when clicking outside
    document.addEventListener('click', (ev) => {
        if (!exportMenu.classList.contains('show')) return;
        if (!exportMenu.contains(ev.target) && ev.target !== exportToggleBtn) {
            exportMenu.classList.remove('show');
            exportMenu.setAttribute('aria-hidden', 'true');
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && exportMenu.classList.contains('show')) {
            exportMenu.classList.remove('show');
            exportMenu.setAttribute('aria-hidden', 'true');
        }
    });
}
document.getElementById('deleteBtn').onclick = () => {
    if (selectedElement) {
        // Dacă elementul este în stivă, îl eliminăm și din stivă
        const idx = elementStack.indexOf(selectedElement);
        if (idx !== -1) elementStack.splice(idx, 1);
        selectedElement.remove();
        selectedElement = null;
    }
}; // Instrument elipsă

/**
 * Gestionarea evenimentelor de desenare
 * 
 * Procesul de desenare constă în trei pași:
 * 1. mousedown - începerea desenării
 * 2. mousemove - actualizarea dimensiunilor în timp real
 * 3. mouseup - finalizarea desenării
 */




/**
 * CERINȚA NOUĂ: Funcționalitate pentru afișarea mesajului de avertizare
 * Afișează un mesaj când utilizatorul încearcă să deseneze fără a selecta un instrument
 */
function showWarningMessage() {
    const warningMessage = document.getElementById('warningMessage');
    warningMessage.style.display = 'block';
    // Resetează animația
    warningMessage.style.animation = 'none';
    warningMessage.offsetHeight; // Forțează un reflow
    warningMessage.style.animation = 'fadeOut 2s ease-in-out forwards';
    
    // Ascunde mesajul după ce animația se termină
    setTimeout(() => {
        warningMessage.style.display = 'none';
    }, 3000);
}

// Event listener pentru începerea desenării (când utilizatorul apasă butonul mouse-ului)
svgContainer.onmousedown = (e) => {
    if (!currentTool) {
        showWarningMessage();
        return;
    }

    // Dacă suntem în modul select, gestionăm selectarea elementelor
    if (currentTool === 'select') {
        // Deselectăm elementul anterior
        if (selectedElement) {
            selectedElement.classList.remove('selected-element');
        }
        
        // Verificăm dacă am dat click pe un element
        const clickedElement = e.target;
        if (clickedElement !== svgContainer) {
            selectedElement = clickedElement;
            selectedElement.classList.add('selected-element');
            
            // Actualizăm controalele cu proprietățile elementului selectat
            strokeColorInput.value = selectedElement.getAttribute('stroke') || '#000000';
            currentColor = strokeColorInput.value;
            
            // Verificăm dacă elementul are fill (nu este linie)
            if (selectedElement.tagName !== 'line') {
                const fillAttr = selectedElement.getAttribute('fill') || selectedElement.style.fill || 'none';
                if (fillAttr && fillAttr !== 'none') {
                    fillEnabledInput.checked = true;
                    // Dacă avem o culoare validă, punem valoarea în color picker
                    try {
                        // dacă fillAttr e în format hex, setăm input; altfel păstrăm curent
                        if (/^#([0-9A-F]{3}){1,2}$/i.test(fillAttr)) {
                            fillColorInput.value = fillAttr;
                            currentFillColor = fillAttr;
                        }
                    } catch (err) {}
                } else {
                    fillEnabledInput.checked = false;
                }
            }
            
            const width = selectedElement.getAttribute('stroke-width') || 2;
            strokeWidthInput.value = width;
            strokeWidthValue.textContent = width;
            currentWidth = width;

            // Pregătim datele pentru drag/move: reținem poziția mouse-ului și a elementului
            const rect = svgContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            isDraggingElement = true;
            dragStartX = mouseX;
            dragStartY = mouseY;
            // Salvăm atributele originale în funcție de tipul elementului
            const tag = selectedElement.tagName.toLowerCase();
            if (tag === 'line') {
                dragData = {
                    x1: parseFloat(selectedElement.getAttribute('x1')) || 0,
                    y1: parseFloat(selectedElement.getAttribute('y1')) || 0,
                    x2: parseFloat(selectedElement.getAttribute('x2')) || 0,
                    y2: parseFloat(selectedElement.getAttribute('y2')) || 0,
                };
            } else if (tag === 'rect') {
                dragData = {
                    x: parseFloat(selectedElement.getAttribute('x')) || 0,
                    y: parseFloat(selectedElement.getAttribute('y')) || 0,
                };
            } else if (tag === 'ellipse') {
                dragData = {
                    cx: parseFloat(selectedElement.getAttribute('cx')) || 0,
                    cy: parseFloat(selectedElement.getAttribute('cy')) || 0,
                };
            } else {
                dragData = null;
            }
            // If the selected element is a path, create handles for editing its points
            if (selectedElement && selectedElement.tagName && selectedElement.tagName.toLowerCase() === 'path') {
                createHandlesForPath(selectedElement);
            } else {
                removeAllHandles();
            }
        } else {
            // Click pe canvas: deselectăm și anulăm drag
            selectedElement = null;
            isDraggingElement = false;
            dragData = null;
            removeAllHandles();
        }
        return;
    }

    // Dacă suntem în modul path, click-ul adaugă puncte (nu folosim isDrawing normal)
    if (currentTool === 'path') {
        const rect = svgContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        // Dacă nu am început o cale, inițiem
        if (!isDrawingPath) {
            isDrawingPath = true;
            currentPathPoints = [{ x: mouseX, y: mouseY }];
            currentPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            currentPathElement.setAttribute('stroke', currentColor);
            currentPathElement.setAttribute('stroke-width', currentWidth);
            currentPathElement.setAttribute('fill', 'none');
            currentPathElement._points = currentPathPoints;
            svgContainer.appendChild(currentPathElement);
        } else {
            // Adăugăm punct
            currentPathPoints.push({ x: mouseX, y: mouseY });
            currentPathElement._points = currentPathPoints;
        }
        // Actualizăm atributul 'd'
        currentPathElement.setAttribute('d', pointsToPathD(currentPathPoints));
        return;
    }
    
    isDrawing = true; // Marchează începutul desenării
    // Calculează coordonatele relative la containerul SVG
    const rect = svgContainer.getBoundingClientRect();
    startX = e.clientX - rect.left;  // Coordonata X inițială
    startY = e.clientY - rect.top;   // Coordonata Y inițială
    
    // Creează elementul SVG corespunzător instrumentului selectat
    switch(currentTool) {
        case 'line':
            // Creează o linie SVG
            currentElement = document.createElementNS("http://www.w3.org/2000/svg", "line");
            // Setează punctul de început
            currentElement.setAttribute("x1", startX);
            currentElement.setAttribute("y1", startY);
            // Inițial, punctul de sfârșit este identic cu cel de început
            currentElement.setAttribute("x2", startX);
            currentElement.setAttribute("y2", startY);
            // Aplică stilizarea
            currentElement.setAttribute("stroke", currentColor);
            currentElement.setAttribute("stroke-width", currentWidth);
            break;
            
        case 'rect':
            // Creează un dreptunghi SVG
            currentElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            // Setează poziția inițială
            currentElement.setAttribute("x", startX);
            currentElement.setAttribute("y", startY);
            // Inițial, dimensiunile sunt 0
            currentElement.setAttribute("width", 0);
            currentElement.setAttribute("height", 0);
            // Aplică stilizarea
            currentElement.setAttribute("stroke", currentColor);
            currentElement.setAttribute("stroke-width", currentWidth);
            // Aplicăm fill doar dacă toggle-ul e activat; altfel lăsăm transparent
            if (fillEnabledInput && fillEnabledInput.checked) {
                currentElement.setAttribute("fill", currentFillColor);
            } else {
                currentElement.setAttribute("fill", "none");
            }
            break;
            
        case 'ellipse':
            // Creează o elipsă SVG
            currentElement = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            // Setează centrul elipsei
            currentElement.setAttribute("cx", startX);
            currentElement.setAttribute("cy", startY);
            // Inițial, razele sunt 0
            currentElement.setAttribute("rx", 0);
            currentElement.setAttribute("ry", 0);
            // Aplică stilizarea
            currentElement.setAttribute("stroke", currentColor);
            currentElement.setAttribute("stroke-width", currentWidth);
            if (fillEnabledInput && fillEnabledInput.checked) {
                currentElement.setAttribute("fill", currentFillColor);
            } else {
                currentElement.setAttribute("fill", "none");
            }
            break;
            case 'path':
                // path handled via click events (see earlier) — keep for completeness
                break;
    }
    
    svgContainer.appendChild(currentElement);
};
// Setăm implicit instrumentul de lucru pe 'select' pentru a permite mutarea/seleția imediat
selectTool('select');

/**
 * Event listener pentru desenare - se execută când utilizatorul mișcă mouse-ul
 * Actualizează dimensiunile și forma elementului în timp real în funcție de 
 * poziția curentă a mouse-ului
 */
svgContainer.onmousemove = (e) => {
    // Calculează coordonatele curente relative la containerul SVG
    const rect = svgContainer.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // Show preview when hovering over canvas with a drawing tool selected (but not drawing yet)
    if (!isDrawing && !isDraggingElement && !isDrawingPath && currentTool && ['line', 'rect', 'ellipse'].includes(currentTool)) {
        if (!previewElement) {
            createPreviewElement(currentTool, currentX, currentY);
        }
        updatePreviewElement(currentTool, currentX, currentY);
    } else if (previewElement && !isDrawing) {
        removePreviewElement();
    }

    // Dacă mutăm un element selectat, gestionăm mișcarea și ieșim
    if (isDraggingElement && selectedElement && dragData) {
        const dx = currentX - dragStartX;
        const dy = currentY - dragStartY;
        const tag = selectedElement.tagName.toLowerCase();
        if (tag === 'line') {
            selectedElement.setAttribute('x1', dragData.x1 + dx);
            selectedElement.setAttribute('y1', dragData.y1 + dy);
            selectedElement.setAttribute('x2', dragData.x2 + dx);
            selectedElement.setAttribute('y2', dragData.y2 + dy);
        } else if (tag === 'rect') {
            selectedElement.setAttribute('x', dragData.x + dx);
            selectedElement.setAttribute('y', dragData.y + dy);
        } else if (tag === 'ellipse') {
            selectedElement.setAttribute('cx', dragData.cx + dx);
            selectedElement.setAttribute('cy', dragData.cy + dy);
        }
        return;
    }

    // Dacă desenăm o cale, actualizăm previzualizarea ultimei segmente cu poziția curentă a mouse-ului
    if (isDrawingPath && currentPathElement && currentPathPoints.length > 0) {
        const tempPoints = currentPathPoints.concat([{ x: currentX, y: currentY }]);
        currentPathElement.setAttribute('d', pointsToPathD(tempPoints));
        return;
    }

    if (!isDrawing) return;
    
    // Actualizează forma în funcție de instrumentul selectat
    switch(currentTool) {
        case 'line':
            currentElement.setAttribute("x2", currentX);
            currentElement.setAttribute("y2", currentY);
            break;
        case 'rect':
            const width = currentX - startX;
            const height = currentY - startY;
            currentElement.setAttribute("width", Math.abs(width));
            currentElement.setAttribute("height", Math.abs(height));
            currentElement.setAttribute("x", width < 0 ? currentX : startX);
            currentElement.setAttribute("y", height < 0 ? currentY : startY);
            break;
        case 'ellipse':
            const rx = Math.abs(currentX - startX) / 2;
            const ry = Math.abs(currentY - startY) / 2;
            currentElement.setAttribute("cx", startX + (currentX - startX) / 2);
            currentElement.setAttribute("cy", startY + (currentY - startY) / 2);
            currentElement.setAttribute("rx", rx);
            currentElement.setAttribute("ry", ry);
            break;
    }
};

/**
 * Event listener pentru terminarea desenării
 * Se execută când utilizatorul ridică butonul mouse-ului
 */
svgContainer.onmouseup = () => {
    isDrawing = false;
    if (currentElement) {
        elementStack.push(currentElement);
    }
    currentElement = null;

    if (isDraggingElement) {
        isDraggingElement = false;
        dragData = null;
    }
    
    removePreviewElement();
};

/**
 * Event listener pentru ieșirea mouse-ului din zona de desen
 * Oprește desenarea dacă mouse-ul părăsește containerul SVG
 * Acest lucru previne "blocarea" în modul de desenare dacă utilizatorul
 * iese accidental din zona de desen
 */
svgContainer.onmouseleave = () => {
    if (isDrawing) {
        isDrawing = false;
        currentElement = null;
    }
    removePreviewElement();
};

// suport pentru anularea ultimelor n operații (undo) 
// Undo (Ctrl+Z) - elimină ultima figură desenată
document.addEventListener('keydown', (e) => {
    // Detectăm Ctrl+Z (sau Cmd+Z pe Mac — browserul va seta metaKey; aici folosim ctrlKey pentru Windows)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        const last = elementStack.pop();
        if (last && last.parentNode) {
            last.parentNode.removeChild(last);
        }
        // Deselectăm orice element selectat după undo
        selectedElement = null;
    }
});

// Double-click finalizes a path
svgContainer.ondblclick = (e) => {
    if (isDrawingPath && currentPathElement) {
        // finalize path
        isDrawingPath = false;
        // ensure final points array is set
        currentPathElement._points = currentPathPoints.slice();
        // keep fill if enabled
        if (fillEnabledInput && fillEnabledInput.checked) {
            currentPathElement.setAttribute('fill', currentFillColor);
        }
        elementStack.push(currentPathElement);
        currentPathElement = null;
        currentPathPoints = [];
    }
};

// Enter finalizes path, Escape cancels
document.addEventListener('keydown', (e) => {
    if (isDrawingPath) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentPathElement) {
                isDrawingPath = false;
                currentPathElement._points = currentPathPoints.slice();
                if (fillEnabledInput && fillEnabledInput.checked) {
                    currentPathElement.setAttribute('fill', currentFillColor);
                }
                elementStack.push(currentPathElement);
                currentPathElement = null;
                currentPathPoints = [];
            }
        } else if (e.key === 'Escape') {
            // cancel
            e.preventDefault();
            if (currentPathElement && currentPathElement.parentNode) {
                currentPathElement.parentNode.removeChild(currentPathElement);
            }
            isDrawingPath = false;
            currentPathElement = null;
            currentPathPoints = [];
        }
    }
});

/**
 * Helpers for path editing
 */
function pointsToPathD(points) {
    if (!points || points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
}

function createHandlesForPath(pathEl) {
    removeAllHandles();
    // ensure path has _points
    let pts = pathEl._points;
    if (!pts) {
        // try parse d attribute for M/L commands
        const d = pathEl.getAttribute('d') || '';
        pts = [];
        const matches = d.match(/([ML])\s*([\d.-]+)\s*,?\s*([\d.-]+)/gi);
        if (matches) {
            for (const m of matches) {
                const nums = m.replace(/[MLml]/, '').trim().split(/[,\s]+/).map(Number);
                if (nums.length >= 2) pts.push({ x: nums[0], y: nums[1] });
            }
        }
        pathEl._points = pts;
    }
    // create circle handles
    pts.forEach((p, idx) => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', p.x);
        c.setAttribute('cy', p.y);
        c.setAttribute('r', 6);
        c.setAttribute('fill', '#fff');
        c.setAttribute('stroke', '#333');
        c.setAttribute('stroke-width', 1);
        c.style.cursor = 'pointer';
        c.dataset.handleIndex = idx;
        // prevent clicks on handle from selecting other things
        c.addEventListener('mousedown', (ev) => {
            ev.stopPropagation();
            isHandleDragging = true;
            activeHandle = c;
        });
        svgContainer.appendChild(c);
        handleElements.push(c);
    });
}

function removeAllHandles() {
    handleElements.forEach(h => { if (h.parentNode) h.parentNode.removeChild(h); });
    handleElements = [];
    isHandleDragging = false;
    activeHandle = null;
}

// handle dragging of handles
document.addEventListener('mousemove', (e) => {
    if (!isHandleDragging || !activeHandle) return;
    const rect = svgContainer.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    activeHandle.setAttribute('cx', mx);
    activeHandle.setAttribute('cy', my);
    const idx = parseInt(activeHandle.dataset.handleIndex, 10);
    if (selectedElement && selectedElement.tagName && selectedElement.tagName.toLowerCase() === 'path') {
        const pts = selectedElement._points || [];
        if (pts[idx]) {
            pts[idx].x = mx;
            pts[idx].y = my;
            selectedElement.setAttribute('d', pointsToPathD(pts));
        }
    }
});

document.addEventListener('mouseup', () => {
    if (isHandleDragging) {
        isHandleDragging = false;
        activeHandle = null;
    }
});

/**
 * Export SVG to raster image (png or jpeg)
 * - Serializes the SVG, creates an Image, draws to canvas and triggers download.
 * - JPEG uses white background to avoid black transparency.
 */
function exportSVGAsImage(format = 'png') {
    try {
        const svgEl = svgContainer;
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgEl);

        // Add namespaces if missing
        if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!source.match(/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/)) {
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }

        // Inline external CSS computed styles: a simple approach is to embed a minimal style block
        // (For full fidelity you'd need to compute styles per element — acceptable for basic use.)

        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        const width = parseInt(svgEl.getAttribute('width')) || svgEl.clientWidth;
        const height = parseInt(svgEl.getAttribute('height')) || svgEl.clientHeight;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (format === 'jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const dataURL = canvas.toDataURL(mime);
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = `export.${format === 'jpeg' ? 'jpg' : 'png'}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            alert('Eroare la generarea imaginii. Vezi consola pentru detalii.');
            console.error(err);
        };
        img.src = url;
    } catch (err) {
        console.error('Export failed', err);
        alert('Export eșuat: ' + err.message);
    }
}

// Export the current SVG content as .svg file (removes editing handles before export)
function exportSVGFile() {
    try {
        const svgEl = svgContainer;
        // clone to avoid modifying the live DOM
        const clone = svgEl.cloneNode(true);

        // Remove editing handles (they have data-handle-index attribute)
        const handles = clone.querySelectorAll('circle[data-handle-index]');
        handles.forEach(h => h.remove());

        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(clone);
        if (!source.match(/^<\?xml/)) {
            source = '<?xml version="1.0" encoding="UTF-8"?>\n' + source;
        }
        if (!source.match(/^<svg[^>]+xmlns=\"http:\/\/www\.w3\.org\/2000\/svg\"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!source.match(/^<svg[^>]+xmlns:xlink=\"http:\/\/www\.w3\.org\/1999\/xlink\"/)) {
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }

        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drawing.svg';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
        console.error('Failed to export SVG', err);
        alert('Eroare la exportul SVG: ' + err.message);
    }
}

/**
 * Auto-save and restore functionality using localStorage
 */

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




