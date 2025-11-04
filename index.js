// Variabile globale pentru starea editorului
let currentTool = null;
let isDrawing = false;
let startX, startY;
let currentElement = null;

// Selectăm elementele DOM necesare
const svgContainer = document.getElementById('svgContainer');
const buttons = document.querySelectorAll('button');

// Funcție pentru selectarea instrumentului
function selectTool(toolName) {
    currentTool = toolName;
    buttons.forEach(btn => btn.classList.remove('selected'));
    document.getElementById(toolName + 'Btn').classList.add('selected');
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
            currentElement.setAttribute("stroke", "black");
            break;
        case 'rect':
            currentElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            currentElement.setAttribute("x", startX);
            currentElement.setAttribute("y", startY);
            currentElement.setAttribute("width", 0);
            currentElement.setAttribute("height", 0);
            currentElement.setAttribute("stroke", "black");
            currentElement.setAttribute("fill", "none");
            break;
        case 'ellipse':
            currentElement = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            currentElement.setAttribute("cx", startX);
            currentElement.setAttribute("cy", startY);
            currentElement.setAttribute("rx", 0);
            currentElement.setAttribute("ry", 0);
            currentElement.setAttribute("stroke", "black");
            currentElement.setAttribute("fill", "none");
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
