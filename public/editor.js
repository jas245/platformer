const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');

// Editor State variables
let mapWidth = 3000;
let mapHeight = 1200;
let zoom = 0.5;
let panX = 50;
let panY = 50;

let elements = [];
let selectedType = 'ground';

let isPanning = false;
let isDrawing = false;
let lastMouseX = 0;
let lastMouseY = 0;

let drawStartX = 0;
let drawStartY = 0;
let currentMouseWorldX = 0;
let currentMouseWorldY = 0;

let activeSelectedElement = null; // Currently highlighted element
let isDraggingElement = false;    // Whether we are moving the element
let dragOffsetX = 0;              // Offset of mouse from element's top-left corner
let dragOffsetY = 0;

// Snapping value (10 pixels)
const SNAP_GRID = 10;

let fireboySpawn = null;  // { x, y }
let watergirlSpawn = null; // { x, y }

function resizeCanvas() {
    canvas.width = document.getElementById('workspace').clientWidth;
    canvas.height = document.getElementById('workspace').clientHeight;
    draw();
}

// Convert screen (canvas) coordinates to world coordinates
function screenToWorld(sx, sy) {
    return {
        x: (sx - panX) / zoom,
        y: (sy - panY) / zoom
    };
}

// Draw Grid, Map Bounds and Placed Elements
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // 1. Draw Map Boundary outline
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 3 / zoom;
    ctx.strokeRect(0, 0, mapWidth, mapHeight);

    // 2. Draw 10px dotted grid inside bounds
    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    for (let x = 0; x <= mapWidth; x += SNAP_GRID * 5) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapHeight);
    }
    for (let y = 0; y <= mapHeight; y += SNAP_GRID * 5) {
        ctx.moveTo(0, y);
        ctx.lineTo(mapWidth, y);
    }
    ctx.stroke();

    // 3. Draw Placed elements
    elements.forEach(el => {
        if (el.type === 'ground') {
            ctx.fillStyle = '#34495e';
            ctx.fillRect(el.x, el.y, el.width, el.height);
            ctx.strokeStyle = '#4e6a85';
            ctx.lineWidth = 2 / zoom;
            ctx.strokeRect(el.x, el.y, el.width, el.height);
        } 
		else if (el.type === 'lava' || el.type === 'water' || el.type === 'toxic') {
            // Setup dynamic colors based on liquid type
            let fillColor, waveColor;
            if (el.type === 'lava') {
                fillColor = 'rgba(231, 76, 60, 0.6)'; // Translucent Red
                waveColor = '#e67e22';               // Solid Orange crest
            } else if (el.type === 'water') {
                fillColor = 'rgba(52, 152, 219, 0.6)'; // Translucent Blue
                waveColor = '#3498db';               // Solid Cyan crest
            } else if (el.type === 'toxic') {
                fillColor = 'rgba(46, 204, 113, 0.6)'; // Translucent Green
                waveColor = '#2ecc71';               // Solid Light Green crest
            }

            ctx.fillStyle = fillColor;
            ctx.strokeStyle = waveColor;
            ctx.lineWidth = 3 / zoom;

             // --- 1. Draw Filled Shape with Clamped Wave ---
            ctx.beginPath();
            ctx.moveTo(el.x, el.y + el.height); // Bottom-left
            ctx.lineTo(el.x, el.y);             // Top-left (Starts perfectly flat at Y)

            const waveSpeed = Date.now() * 0.005; 
            const waveHeight = 8;  
            const waveDensity = 0.04; 

            for (let px = el.x; px <= el.x + el.width + 4; px += 4) {
                // Force last step to land exactly on the right boundary edge
                const currentX = Math.min(px, el.x + el.width);
                
                // Calculate percentage across the block (0 to 1)
                const pct = (currentX - el.x) / el.width;
                // Mathematical envelope: 0 at left/right edges, 1 in the middle
                const clampFactor = Math.sin(pct * Math.PI); 

                const py = el.y + Math.sin((currentX * waveDensity) + waveSpeed) * waveHeight * clampFactor;
                ctx.lineTo(currentX, py);

                if (currentX === el.x + el.width) break; // End cleanly on right border
            }

            ctx.lineTo(el.x + el.width, el.y + el.height); // Bottom-right
            ctx.closePath();
            ctx.fill();
            
            // --- 2. Draw Top Crest Outline with Clamped Wave ---
            ctx.beginPath();
            for (let px = el.x; px <= el.x + el.width + 4; px += 4) {
                const currentX = Math.min(px, el.x + el.width);
                const pct = (currentX - el.x) / el.width;
                const clampFactor = Math.sin(pct * Math.PI); 

                const py = el.y + Math.sin((currentX * waveDensity) + waveSpeed) * waveHeight * clampFactor;
                
                if (currentX === el.x) {
                    ctx.moveTo(currentX, py);
                } else {
                    ctx.lineTo(currentX, py);
                }

                if (currentX === el.x + el.width) break;
            }
            ctx.stroke();
        }
		else if (el.type === 'slope_lr') {
            ctx.fillStyle = '#34495e';
            ctx.strokeStyle = '#4e6a85';
            ctx.lineWidth = 2 / zoom;

            ctx.beginPath();
            ctx.moveTo(el.x, el.y + el.height);             // Bottom-Left
            ctx.lineTo(el.x + el.width, el.y);             // Top-Right
            ctx.lineTo(el.x + el.width, el.y + el.height);   // Bottom-Right
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } 
        else if (el.type === 'slope_rl') {
            ctx.fillStyle = '#34495e';
            ctx.strokeStyle = '#4e6a85';
            ctx.lineWidth = 2 / zoom;

            ctx.beginPath();
            ctx.moveTo(el.x, el.y);                         // Top-Left
            ctx.lineTo(el.x + el.width, el.y + el.height);   // Bottom-Right
            ctx.lineTo(el.x, el.y + el.height);             // Bottom-Left
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
		else if (el.type === 'box') {
            ctx.fillStyle = '#8b5a2b'; // Wooden Brown
            ctx.fillRect(el.x, el.y, el.width, el.height);
            ctx.strokeStyle = '#5c3a1a'; // Darker Brown Border
            ctx.lineWidth = 2 / zoom;
            ctx.strokeRect(el.x, el.y, el.width, el.height);

            // Draw crate "X" brace detail
            ctx.beginPath();
            ctx.moveTo(el.x + 6, el.y + 6);
            ctx.lineTo(el.x + el.width - 6, el.y + el.height - 6);
            ctx.moveTo(el.x + el.width - 6, el.y + 6);
            ctx.lineTo(el.x + 6, el.y + el.height - 6);
            ctx.stroke();
        }
		else if (el.type === 'button') {
            // Select fill color based on button color
            if (el.color === 'red') ctx.fillStyle = '#e74c3c';
            else if (el.color === 'blue') ctx.fillStyle = '#3498db';
            else if (el.color === 'green') ctx.fillStyle = '#2ecc71';

            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2 / zoom;

            // Draw Isosceles Trapezium
            ctx.beginPath();
            ctx.moveTo(el.x + 20, el.y);                         // Top-Left
            ctx.lineTo(el.x + el.width - 20, el.y);             // Top-Right
            ctx.lineTo(el.x + el.width, el.y + el.height);       // Bottom-Right
            ctx.lineTo(el.x, el.y + el.height);                 // Bottom-Left
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
		else if (el.type === 'door') {
            if (el.color === 'red') ctx.fillStyle = '#e74c3c';
            else if (el.color === 'blue') ctx.fillStyle = '#3498db';
            else if (el.color === 'green') ctx.fillStyle = '#2ecc71';

            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 1.5 / zoom;

            // A. Draw solid active door
            ctx.fillRect(el.x, el.y, el.width, el.height);
            ctx.strokeRect(el.x, el.y, el.width, el.height);

            // B. Draw Trajectory Line & Translucent Ghost Door (Only shown when selected)
            if (activeSelectedElement === el) {
                ctx.save();
                
                // Draw dotted connection path
                ctx.strokeStyle = '#f39c12';
                ctx.lineWidth = 2 / zoom;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(el.x + el.width/2, el.y + el.height/2);
                ctx.lineTo(el.targetX + el.width/2, el.targetY + el.height/2);
                ctx.stroke();

                // Draw translucent target ghost door
                if (el.color === 'red') ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
                else if (el.color === 'blue') ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
                else if (el.color === 'green') ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
                
                ctx.fillRect(el.targetX, el.targetY, el.width, el.height);
                ctx.strokeRect(el.targetX, el.targetY, el.width, el.height);

                ctx.restore();
            }
        }
    });

    // 4. Draw active rectangle draft
    if (isDrawing) {
        ctx.fillStyle = 'rgba(52, 152, 219, 0.4)';
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2 / zoom;
        
        const rectX = Math.min(drawStartX, currentMouseWorldX);
        const rectY = Math.min(drawStartY, currentMouseWorldY);
        const rectW = Math.abs(currentMouseWorldX - drawStartX);
        const rectH = Math.abs(currentMouseWorldY - drawStartY);

        ctx.fillRect(rectX, rectY, rectW, rectH);
        ctx.strokeRect(rectX, rectY, rectW, rectH);
    }
	
	// Draw orange outline around active selected element
    if (activeSelectedElement) {
        ctx.strokeStyle = '#e67e22'; // Highlight orange
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([6, 6]); // Dashed lines
        ctx.strokeRect(
            activeSelectedElement.x - 4, 
            activeSelectedElement.y - 4, 
            activeSelectedElement.width + 8, 
            activeSelectedElement.height + 8
        );
        ctx.setLineDash([]); // Reset line dashes back to solid
    }
	
	// Draw Fireboy Spawn (Radius 25)
    if (fireboySpawn) {
        ctx.beginPath();
        ctx.arc(fireboySpawn.x, fireboySpawn.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${10 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText("FIREBOY", fireboySpawn.x, fireboySpawn.y + 4);
    }

    // Draw Watergirl Spawn (Radius 25)
    if (watergirlSpawn) {
        ctx.beginPath();
        ctx.arc(watergirlSpawn.x, watergirlSpawn.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(52, 152, 219, 0.7)';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${10 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText("WATERGIRL", watergirlSpawn.x, watergirlSpawn.y + 4);
    }

    ctx.restore();
}

// Snap helper
function snap(value) {
    return Math.round(value / SNAP_GRID) * SNAP_GRID;
}

// --- Event Listeners ---

// Zooming centered on mouse cursor
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const mouseWorldBefore = screenToWorld(e.clientX, e.clientY);

    if (e.deltaY < 0) {
        zoom += zoomIntensity;
    } else {
        zoom = Math.max(0.1, zoom - zoomIntensity);
    }

    // Shift pan so mouse remains at same world location
    panX = e.clientX - mouseWorldBefore.x * zoom;
    panY = e.clientY - mouseWorldBefore.y * zoom;
    draw();
}, { passive: false });

// Mouse down handler (handles Panning, Selecting/Moving, and Drawing)
canvas.addEventListener('mousedown', (e) => {
    const mouseWorld = screenToWorld(e.clientX, e.clientY);
    
    if (e.ctrlKey) {
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        return;
    }

    // A. Check if we clicked on any existing element to select/drag first
    let clickedElement = null;
    for (let i = elements.length - 1; i >= 0; i--) {
        let el = elements[i];
        if (mouseWorld.x >= el.x && mouseWorld.x <= el.x + el.width &&
            mouseWorld.y >= el.y && mouseWorld.y <= el.y + el.height) {
            clickedElement = el;
            break;
        }
    }

    if (clickedElement) {
        activeSelectedElement = clickedElement;
        isDraggingElement = true;
        dragOffsetX = mouseWorld.x - clickedElement.x;
        dragOffsetY = mouseWorld.y - clickedElement.y;
    } 
    // B. If clicked on empty space and 'Box' is selected, place a new 50x50 box
    else if (selectedType === 'box') {
        const snappedX = snap(mouseWorld.x - 25); // Center the 50px box on cursor
        const snappedY = snap(mouseWorld.y - 25);
        const newBox = { type: 'box', x: snappedX, y: snappedY, width: 50, height: 50 };
        elements.push(newBox);
        activeSelectedElement = newBox; // Automatically highlight newly placed boxes
    } 
	else if (selectedType.startsWith('button_')) {
        const color = selectedType.split('_')[1]; // Extracts 'red', 'blue', or 'green'
        const snappedX = snap(mouseWorld.x - 50);
        const snappedY = snap(mouseWorld.y - 10);
        const newButton = { type: 'button', color: color, x: snappedX, y: snappedY, width: 100, height: 20 };
        elements.push(newButton);
        activeSelectedElement = newButton;
    }
	else if (selectedType.startsWith('door_')) {
        const parts = selectedType.split('_'); // 'door', 'red/blue/green', 'v/h'
        const color = parts[1];
        const orientation = parts[2];
        
        let w = 10;
        let h = 50;
        if (orientation === 'h') {
            w = 50;
            h = 10;
        }

        const snappedX = snap(mouseWorld.x - w / 2);
        const snappedY = snap(mouseWorld.y - h / 2);

        const newDoor = { 
            type: 'door', 
            color: color, 
            orientation: orientation, 
            x: snappedX, 
            y: snappedY, 
            width: w, 
            height: h,
            targetX: snappedX, // Target X defaults to spawning X
            targetY: snappedY  // Target Y defaults to spawning Y
        };

        elements.push(newDoor);
        activeSelectedElement = newDoor;
    }
    // C. Single-click for characters
    else if (selectedType === 'fireboy') {
        fireboySpawn = { x: snap(mouseWorld.x), y: snap(mouseWorld.y) };
    } 
    else if (selectedType === 'watergirl') {
        watergirlSpawn = { x: snap(mouseWorld.x), y: snap(mouseWorld.y) };
    } 
    // D. Drag to draw platforms/slopes/liquids
    else {
        activeSelectedElement = null;
        isDrawing = true;
        drawStartX = snap(mouseWorld.x);
        drawStartY = snap(mouseWorld.y);
        currentMouseWorldX = drawStartX;
        currentMouseWorldY = drawStartY;
    }
    draw();
});

// Mouse move handler
canvas.addEventListener('mousemove', (e) => {
    const mouseWorld = screenToWorld(e.clientX, e.clientY);
    currentMouseWorldX = snap(mouseWorld.x);
    currentMouseWorldY = snap(mouseWorld.y);

    if (isPanning) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        panX += dx;
        panY += dy;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    } else if (isDraggingElement && activeSelectedElement) {
        // Move the element snapped to the 10px grid
        activeSelectedElement.x = snap(mouseWorld.x - dragOffsetX);
        activeSelectedElement.y = snap(mouseWorld.y - dragOffsetY);
    }
    
    draw();
});

// Mouse release
canvas.addEventListener('mouseup', () => {
    isPanning = false;
    isDraggingElement = false;

    if (isDrawing) {
        isDrawing = false;
        
        let x = Math.min(drawStartX, currentMouseWorldX);
        let y = Math.min(drawStartY, currentMouseWorldY);
        let width = Math.abs(currentMouseWorldX - drawStartX);
        let height = Math.abs(currentMouseWorldY - drawStartY);
		
		// Force perfect 1:1 aspect ratio for 45-degree slopes
        if (selectedType.startsWith('slope')) {
            const size = Math.max(width, height);
            width = size;
            height = size;
            // Adjust top-left position if drawing in reverse directions
            if (currentMouseWorldX < drawStartX) x = drawStartX - size;
            if (currentMouseWorldY < drawStartY) y = drawStartY - size;
        }

        if (width >= 10 && height >= 10) {
            const newElement = { type: selectedType, x, y, width, height };
            elements.push(newElement);
            activeSelectedElement = newElement; // Automatically select newly drawn shapes
        }
        draw();
    }
});
// --- UI Actions & File Saving/Loading ---

// Width and height changes
document.getElementById('map-width').addEventListener('change', (e) => {
    mapWidth = parseInt(e.target.value);
    draw();
});

document.getElementById('map-height').addEventListener('change', (e) => {
    mapHeight = parseInt(e.target.value);
    draw();
});

// Dynamic Element Option Selector
document.querySelectorAll('.element-option').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.element-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedType = opt.getAttribute('data-type');
    });
});

// Clear Map
document.getElementById('new-btn').addEventListener('click', () => {
    if (confirm("Clear all elements and start fresh?")) {
        elements = [];
        draw();
    }
});

// Save Map File
document.getElementById('save-btn').addEventListener('click', () => {
    const mapData = {
        width: mapWidth,
        height: mapHeight,
        fireboySpawn: fireboySpawn,   // Export spawns
        watergirlSpawn: watergirlSpawn,
        elements: elements
    };

    const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map.json';
    a.click();
    URL.revokeObjectURL(url);
});

// Load Map File trigger
document.getElementById('load-trigger-btn').addEventListener('click', () => {
    document.getElementById('load-file-input').click();
});

document.getElementById('load-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const data = JSON.parse(event.target.result);
        
        mapWidth = data.width || 3000;
        mapHeight = data.height || 1200;
        elements = data.elements || [];
        fireboySpawn = data.fireboySpawn || null;     // Import spawns
        watergirlSpawn = data.watergirlSpawn || null;

        document.getElementById('map-width').value = mapWidth;
        document.getElementById('map-height').value = mapHeight;

        draw();
    };
    reader.readAsText(file);
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Standard 60fps game loop for fluid animations
function animate() {
    draw();
    requestAnimationFrame(animate);
}
animate();

// Keyboard listener to delete selected items (Backspace or Delete)
window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && activeSelectedElement) {
        // Filter out the selected element from the map list
        elements = elements.filter(el => el !== activeSelectedElement);
        activeSelectedElement = null;
        draw();
    }
});

const targetPanel = document.getElementById('door-target-panel');
const targetXInput = document.getElementById('door-target-x');
const targetYInput = document.getElementById('door-target-y');

// Monitor selection changes to toggle target panel visibility
function updateTargetPanel() {
    if (activeSelectedElement && activeSelectedElement.type === 'door') {
        targetPanel.classList.remove('hidden-panel');
        targetXInput.value = activeSelectedElement.targetX;
        targetYInput.value = activeSelectedElement.targetY;
    } else {
        targetPanel.classList.add('hidden-panel');
    }
}

// Intercept clicks to update panel visibility
canvas.addEventListener('mousedown', updateTargetPanel);
window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        updateTargetPanel();
    }
});

// Update selected door's Target X coordinates numerically
targetXInput.addEventListener('change', (e) => {
    if (activeSelectedElement && activeSelectedElement.type === 'door') {
        activeSelectedElement.targetX = snap(parseInt(e.target.value) || 0);
        draw();
    }
});

// Update selected door's Target Y coordinates numerically
targetYInput.addEventListener('change', (e) => {
    if (activeSelectedElement && activeSelectedElement.type === 'door') {
        activeSelectedElement.targetY = snap(parseInt(e.target.value) || 0);
        draw();
    }
});