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
const strokeWidthInput = document.getElementById('strokeWidth');    // Slider pentru grosimea liniei
const strokeWidthValue = document.getElementById('strokeWidthValue'); // Afișarea valorii grosimii

// Variabile globale pentru starea editorului
let currentTool = null;      // Instrumentul curent selectat (line, rect, ellipse, select)
let isDrawing = false;       // Flag care indică dacă utilizatorul desenează în prezent
let startX, startY;         // Coordonatele de început ale formei curente
let currentElement = null;   // Elementul SVG care este în curs de desenare
let selectedElement = null;  // Elementul SVG selectat pentru editare
let currentColor = '#000000'; // Culoarea curentă selectată pentru contur
let currentFillColor = '#ffffff'; // Culoarea curentă pentru fundal
let currentWidth = 2;        // Grosimea curentă a liniei

// Event listeners pentru controalele de stil
strokeColorInput.addEventListener('input', (e) => {
    currentColor = e.target.value;
    if (selectedElement) {
        selectedElement.setAttribute('stroke', currentColor);
    }
});

fillColorInput.addEventListener('input', (e) => {
    currentFillColor = e.target.value;
    if (selectedElement && selectedElement.tagName !== 'line') {  // Nu aplicăm fill pentru linii
        selectedElement.setAttribute('fill', currentFillColor);
        selectedElement.style.fill = currentFillColor; // Adăugăm și stil direct pentru compatibilitate
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
                const fillColor = selectedElement.getAttribute('fill') || 
                                selectedElement.style.fill || 
                                '#ffffff';
                fillColorInput.value = fillColor;
                currentFillColor = fillColor;
            }
            
            const width = selectedElement.getAttribute('stroke-width') || 2;
            strokeWidthInput.value = width;
            strokeWidthValue.textContent = width;
            currentWidth = width;
        } else {
            selectedElement = null;
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
            currentElement.setAttribute("fill", currentFillColor); // Aplicăm culoarea de fundal
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
            currentElement.setAttribute("fill", currentFillColor); // Aplicăm culoarea de fundal
            break;
    }
    
    svgContainer.appendChild(currentElement);
};

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
    currentElement = null;    // Eliberează referința la elementul curent
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
