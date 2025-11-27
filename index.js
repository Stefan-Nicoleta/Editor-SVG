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
// Drag state for moving selected elements
let isDraggingElement = false;
let dragStartX = 0, dragStartY = 0;
let dragData = null; // will hold original attributes for the dragged element

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
document.getElementById('selectBtn').onclick = () => selectTool('select');
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
        } else {
            // Click pe canvas: deselectăm și anulăm drag
            selectedElement = null;
            isDraggingElement = false;
            dragData = null;
        }
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
    const currentX = e.clientX - rect.left;  // Poziția X curentă a mouse-ului
    const currentY = e.clientY - rect.top;   // Poziția Y curentă a mouse-ului

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

    if (!isDrawing) return; // Ieși dacă nu suntem activi în desenare
    
    // Actualizează forma în funcție de instrumentul selectat
    switch(currentTool) {
        case 'line':
            // Pentru linie, actualizează doar punctul final
            currentElement.setAttribute("x2", currentX);
            currentElement.setAttribute("y2", currentY);
            break;
            
        case 'rect':
            // Pentru dreptunghi, calculează dimensiunile și poziția
            const width = currentX - startX;   // Lățimea dreptunghiului
            const height = currentY - startY;  // Înălțimea dreptunghiului
            
            // Folosim Math.abs() pentru a avea întotdeauna dimensiuni pozitive
            currentElement.setAttribute("width", Math.abs(width));
            currentElement.setAttribute("height", Math.abs(height));
            
            // Ajustează poziția x,y în funcție de direcția de tragere
            currentElement.setAttribute("x", width < 0 ? currentX : startX);
            currentElement.setAttribute("y", height < 0 ? currentY : startY);
            break;
            
        case 'ellipse':
            // Pentru elipsă, calculează razele și centrul
            // Razele sunt jumătate din lățime/înălțime
            const rx = Math.abs(currentX - startX) / 2;  // Raza pe axa X
            const ry = Math.abs(currentY - startY) / 2;  // Raza pe axa Y
            
            // Centrul elipsei este la mijlocul între punctul de start și poziția curentă
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
    isDrawing = false;        // Oprește modul de desenare
    // Dacă există un element curent finalizat, îl adăugăm în stivă
    if (currentElement) {
        elementStack.push(currentElement);
    }
    currentElement = null;    // Eliberează referința la elementul curent

    // Dacă eram în modul de drag pentru un element selectat, oprim drag-ul
    if (isDraggingElement) {
        isDraggingElement = false;
        dragData = null;
    }
};

/**
 * Event listener pentru ieșirea mouse-ului din zona de desen
 * Oprește desenarea dacă mouse-ul părăsește containerul SVG
 * Acest lucru previne "blocarea" în modul de desenare dacă utilizatorul
 * iese accidental din zona de desen
 */
svgContainer.onmouseleave = () => {
    if (isDrawing) {
        isDrawing = false;     // Oprește modul de desenare
        currentElement = null; // Eliberează referința la elementul curent
    }
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




