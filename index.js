// Variabile globale pentru starea editorului
let currentTool = null;
let isDrawing = false;
let startX, startY;
let currentElement = null;

// Culorile pentru fiecare formă
const shapeColors = {
    'line': '#FF6B6B',     // red
    'rect': '#56cd4eff',     // green
    'ellipse': '#45B7D1'   // albastru
};

// Selectăm elementele DOM necesare
const svgContainer = document.getElementById('svgContainer');
const buttons = document.querySelectorAll('button');

// Funcție pentru selectarea instrumentului
function selectTool(toolName) {
    currentTool = toolName;
    buttons.forEach(btn => {
        btn.classList.remove('selected');
        btn.style.backgroundColor = '#4CAF50'; // Resetăm culoarea la cea implicită
    });
    const selectedButton = document.getElementById(toolName + 'Btn');
    selectedButton.classList.add('selected');
    selectedButton.style.backgroundColor = shapeColors[toolName];
}

// Event listeners pentru butoane
document.getElementById('lineBtn').onclick = () => selectTool('line');
document.getElementById('rectBtn').onclick = () => selectTool('rect');
document.getElementById('ellipseBtn').onclick = () => selectTool('ellipse');

// Event listener pentru începerea desenării
svgContainer.onmousedown = (e) => {
    if (!currentTool) return;
    
    isDrawing = true;
    const rect = svgContainer.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    
    switch(currentTool) {
        case 'line':
            currentElement = document.createElementNS("http://www.w3.org/2000/svg", "line");
            currentElement.setAttribute("x1", startX);
            currentElement.setAttribute("y1", startY);
            currentElement.setAttribute("x2", startX);
            currentElement.setAttribute("y2", startY);
            currentElement.setAttribute("stroke", shapeColors.line);
            currentElement.setAttribute("stroke-width", "3");
            break;
        case 'rect':
            currentElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            currentElement.setAttribute("x", startX);
            currentElement.setAttribute("y", startY);
            currentElement.setAttribute("width", 0);
            currentElement.setAttribute("height", 0);
            currentElement.setAttribute("stroke", shapeColors.rect);
            currentElement.setAttribute("stroke-width", "2");
            currentElement.setAttribute("fill", shapeColors.rect + "33"); // Adăugăm transparență
            break;
        case 'ellipse':
            currentElement = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            currentElement.setAttribute("cx", startX);
            currentElement.setAttribute("cy", startY);
            currentElement.setAttribute("rx", 0);
            currentElement.setAttribute("ry", 0);
            currentElement.setAttribute("stroke", shapeColors.ellipse);
            currentElement.setAttribute("stroke-width", "2");
            currentElement.setAttribute("fill", shapeColors.ellipse + "33"); // Adăugăm transparență
            break;
    }
    
    svgContainer.appendChild(currentElement);
};

// Event listener pentru desenare
svgContainer.onmousemove = (e) => {
    if (!isDrawing) return;
    
    const rect = svgContainer.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
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

// Event listener pentru terminarea desenării
svgContainer.onmouseup = () => {
    isDrawing = false;
    currentElement = null;
};

// Oprește desenarea dacă mouse-ul iese din container
svgContainer.onmouseleave = () => {
    if (isDrawing) {
        isDrawing = false;
        currentElement = null;
    }
};
