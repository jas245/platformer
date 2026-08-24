
// Character choices from the menu
const characters = [
    { name: "Fire Boy", color: "#e74c3c", glow: "rgba(231, 76, 60, 0.6)" },
    { name: "Water Girl", color: "#3498db", glow: "rgba(52, 152, 219, 0.6)" },
];

let loadedMapData = {
  "width": 3000,
  "height": 1200,
  "fireboySpawn": {
    "x": 100,
    "y": 970
  },
  "watergirlSpawn": {
    "x": 240,
    "y": 970
  },
  "elements": [
    {
      "type": "ground",
      "x": 50,
      "y": 1000,
      "width": 500,
      "height": 150
    },
    {
      "type": "ground",
      "x": 550,
      "y": 1100,
      "width": 200,
      "height": 50
    },
    {
      "type": "ground",
      "x": 750,
      "y": 1000,
      "width": 150,
      "height": 150
    },
    {
      "type": "lava",
      "x": 550,
      "y": 1020,
      "width": 200,
      "height": 80
    },
    {
      "type": "water",
      "x": 900,
      "y": 1020,
      "width": 200,
      "height": 80
    },
    {
      "type": "ground",
      "x": 900,
      "y": 1100,
      "width": 200,
      "height": 50
    },
    {
      "type": "ground",
      "x": 1100,
      "y": 1000,
      "width": 350,
      "height": 150
    },
    {
      "type": "button",
      "color": "red",
      "x": 1150,
      "y": 980,
      "width": 100,
      "height": 20
    },
    {
      "type": "door",
      "color": "red",
      "orientation": "h",
      "x": 1400,
      "y": 890,
      "width": 50,
      "height": 10,
      "targetX": 2050,
      "targetY": 890
    },
    {
      "type": "ground",
      "x": 1450,
      "y": 1100,
      "width": 650,
      "height": 50
    },
    {
      "type": "toxic",
      "x": 1450,
      "y": 1020,
      "width": 650,
      "height": 80
    },
    {
      "type": "ground",
      "x": 1750,
      "y": 850,
      "width": 50,
      "height": 50
    },
    {
      "type": "ground",
      "x": 2100,
      "y": 1000,
      "width": 400,
      "height": 150
    },
    {
      "type": "button",
      "color": "red",
      "x": 2150,
      "y": 980,
      "width": 100,
      "height": 20
    },
    {
      "type": "ground",
      "x": 1850,
      "y": 750,
      "width": 200,
      "height": 20
    },
    {
      "type": "lever",
      "color": "yellow",
      "x": 1900,
      "y": 700,
      "width": 100,
      "height": 70
    },
    {
      "type": "door",
      "color": "yellow",
      "orientation": "h",
      "x": 2450,
      "y": 840,
      "width": 50,
      "height": 10,
      "targetX": 2350,
      "targetY": 840
    },
    {
      "type": "ground",
      "x": 2500,
      "y": 700,
      "width": 50,
      "height": 450
    },
    {
      "type": "box",
      "x": 2450,
      "y": 730,
      "width": 50,
      "height": 50
    },
    {
      "type": "slope_rl",
      "x": 2300,
      "y": 750,
      "width": 100,
      "height": 100
    },
    {
      "type": "slope_lr",
      "x": 2400,
      "y": 600,
      "width": 100,
      "height": 100
    },
    {
      "type": "slope_rl",
      "x": 2300,
      "y": 450,
      "width": 100,
      "height": 100
    },
    {
      "type": "slope_lr",
      "x": 2400,
      "y": 300,
      "width": 100,
      "height": 100
    },
    {
      "type": "slope_rl",
      "x": 2300,
      "y": 150,
      "width": 100,
      "height": 100
    },
    {
      "type": "ground",
      "x": 1900,
      "y": 150,
      "width": 400,
      "height": 100
    },
    {
      "type": "textbox",
      "x": 1950,
      "y": 0,
      "width": 300,
      "height": 100,
      "text": "I love you baby\n<3",
      "bgColor": "#f100f5",
      "opacity": 0.3
    },
    {
      "type": "ground",
      "x": 2250,
      "y": 550,
      "width": 50,
      "height": 200,
      "text": "",
      "bgColor": "",
      "opacity": 1
    }
  ]
}


let selectedIndex = 0;
let socket = null;

// Add to your global variables at the top of client.js
const activeLiquidPools = []; // Tracks our spring-based interactive pools

let activeCameraMatrix = null;

const gameBoxes = {};          // Registry to map boxId -> Matter.js Box Body
const collidingBoxes = new Set(); // Tracks boxIds the local player is actively pushing
const submergedBoxes = new Set(); // Tracks box bodies currently inside a liquid pool
const submergedProjectiles = new Set();

const gameDoors = {};  
const gameLevers = {};  
const activeTextBoxes = [];

const grassSprite = new Image();
grassSprite.src = 'grass.png';

const bgSprite = new Image();
bgSprite.src = 'background.png';



const gameButtons = {};           // Registry to map buttonId -> Matter.js Button Body
const activePressedButtons = new Set(); // Tracks buttonIds currently pressed by local physics

const tintCanvas = document.createElement('canvas'); // Reusable offscreen canvas
const tintCtx = tintCanvas.getContext('2d');

let localSpeedX = 0;

// --- Interactive Spring-Based Liquid Pool Class ---
class LiquidPool {
    constructor(body, type, x, y, width, height) {
        this.body = body; // Matter.js body reference
        this.type = type; // 'lava', 'water', or 'toxic'
        this.x = x;       // Top-left corner X
        this.y = y;       // Top-left corner Y
        this.width = width;
        this.height = height;
        
        this.waveFreq = 8; // Spacing between springs (8px gives a highly detailed, smooth wave)
        
        // Spring & physical fluid parameters (tweaked for smooth fluid movement)
        this.k = 0.04;      // Spring stiffness constant
        this.damp = 0.035;    // Internal dampening/friction
        this.tension = 0.018; // Restoring speed
        this.spread = 0.15;  // Wave propagation speed across neighbors
        
        this.frameCount = Math.ceil(this.width / this.waveFreq) + 1;
        this.springs = [];
        
        // Initialize all individual vertical springs across the pool's width
        for (let i = 0; i < this.frameCount; i++) {
			const currentX = Math.min(this.x + this.width, this.x + (i * this.waveFreq));
            this.springs.push({
                x: currentX,
                currentY: this.y, // Current Y height of this column
                speed: 0,
                update: function(targetY, k, damp, tension) {
                    const displacement = targetY - this.currentY;
                    this.speed += (tension * displacement) - (this.speed * damp);
                    this.currentY += this.speed;
                }
            });
        }
    }
    
    // Updates spring physics and propagates wave movements to neighbors
    update() {
        for (let i = 0; i < this.springs.length; i++) {
            this.springs[i].update(this.y, this.k, this.damp, this.tension);
        }
        
        const leftDeltas = new Array(this.springs.length).fill(0);
        const rightDeltas = new Array(this.springs.length).fill(0);
        const wavPasses = 8; // Number of neighborhood pulling passes per frame
        
        // Propagate waves left and right
        for (let j = 0; j < wavPasses; j++) {
            for (let i = 0; i < this.springs.length; i++) {
                if (i > 0) {
                    leftDeltas[i] = this.spread * (this.springs[i].currentY - this.springs[i - 1].currentY);
                    this.springs[i - 1].speed += leftDeltas[i];
                }
                if (i < this.springs.length - 1) {
                    rightDeltas[i] = this.spread * (this.springs[i].currentY - this.springs[i + 1].currentY);
                    this.springs[i + 1].speed += rightDeltas[i];
                }
            }
            
            // Apply neighbor pull deltas
            for (let i = 0; i < this.springs.length; i++) {
                if (i > 0) this.springs[i - 1].currentY += leftDeltas[i];
                if (i < this.springs.length - 1) this.springs[i + 1].currentY += rightDeltas[i];
            }
        }
    }
    
    // Triggers a localized splash wave based on entering object coordinates
     splash(worldX, velocityY) {
        const localX = worldX - this.x;
        const index = Math.round(localX / this.waveFreq);
        
        if (index >= 0 && index < this.springs.length) {
            // Stronger base force multiplier for high-velocity drops
            const baseForce = velocityY * 3; 
            
            // Width of the player (Radius 25px = 50px diameter). 
            // Affecting 4 springs left/right (approx 64px total width) creates a perfect fit.
            const impactRadius = 4; 

            for (let d = -impactRadius; d <= impactRadius; d++) {
                const targetIndex = index + d;
                
                if (targetIndex >= 0 && targetIndex < this.springs.length) {
                    // Linear falloff: 1.0 (100% force) in the center, tapering off smoothly to 0.2 at the edges
                    const falloff = 1.0 - (Math.abs(d) / (impactRadius + 1));
                    
                    // Cap the maximum dip velocity to prevent extreme coordinate glitters
                    const force = Math.min(55, baseForce * falloff);
                    
                    // Push the spring speed downward
                    this.springs[targetIndex].speed = force;
                }
            }
        }
    }
}

//sounds
const sounds = {
    'sound1': new Audio('anime-ahh.mp3'),
    'sound2': new Audio('rizzbot-laugh.mp3'),
    'sound3': new Audio('fart-with-reverb.mp3'),
	'jumpscare': new Audio('jumpscare.mp3')
};

const slimeSprite = new Image();
slimeSprite.src = 'slime_move.png'; // Loads the slimes spritesheet

// Maps our selectedIndex to the correct row index of the spritesheet:
// Row 1 (Red Slime) = Fire Boy, Row 3 (Blue Slime) = Water Girl
const slimeRowMap = [1, 3];

let facingDirection = 1; // 1 = Facing Right, -1 = Facing Left

let isResetting = false;

let myId = null;
const otherPlayers = {}; // Keep track of other players' Matter.js bodies
const collidingPlayers = new Set(); // Tracks IDs of other players we are currently touching
const activeLiquids = new Set(); // Tracks liquid hazard types ('water', 'lava', 'toxic') we are touching
let activeSlopeType = null;

// --- Matter.js Collision Filters (Prevents projectile from hitting its launcher) ---
const CATEGORY_MAP = 0x0001;        // Grounds, Slopes, Liquids, Buttons, Boxes
const CATEGORY_FIREBOY = 0x0002;
const CATEGORY_WATERGIRL = 0x0004;
const CATEGORY_PROJECTILE = 0x0008;

// --- Slingshot Aim State ---
let isAiming = false;
let aimStart = { x: 0, y: 0 };
let aimCurrent = { x: 0, y: 0 };
let launchVx = 0;
let launchVy = 0;

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const charPreview = document.getElementById('character-preview');
const charName = document.getElementById('char-name');
const prevBtn = document.getElementById('prev-char-btn');
const nextBtn = document.getElementById('next-char-btn');
const playBtn = document.getElementById('play-btn');

// --- Character Selection Logic ---
function updateCharacterSelection() {
    const char = characters[selectedIndex];
    charPreview.style.backgroundColor = char.color;
    charPreview.style.boxShadow = `0 0 20px ${char.glow}`;
    charName.innerText = char.name;
}

prevBtn.addEventListener('click', () => {
    selectedIndex = (selectedIndex - 1 + characters.length) % characters.length;
    updateCharacterSelection();
});

nextBtn.addEventListener('click', () => {
    selectedIndex = (selectedIndex + 1) % characters.length;
    updateCharacterSelection();
});

playBtn.addEventListener('click', () => {
	// "Unlock" the audio element for iOS Safari/Chrome on user interaction
    for (let id in sounds) {
        sounds[id].play().then(() => {
            sounds[id].pause();
            sounds[id].currentTime = 0;
        }).catch(err => console.log(`Bypassed unlock for ${id}:`, err));
    }
	
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    startGame();
});

// --- Physics & Game Logic ---
let engine, render, runner;
let playerBody = null;
let isGrounded = false;
let lastSentX = 0;
let lastSentY = 0;

// Control states
const keys = { Left: false, Right: false };


function startGame() {
    // 1. Initialize Matter.js Physics Engine FIRST
    const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;
	const gameWidth = 1400;
    const gameHeight = 600;
    engine = Engine.create();
    engine.gravity.y = 1.5; // Adjust gravity for responsive jumping

    // Setup Renderer
    const canvas = document.getElementById('game-canvas');
	canvas.width = gameWidth;
    canvas.height = gameHeight;
	
    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: gameWidth,
            height: gameHeight,
            wireframes: false, 
            background: '#111',
			pixelRatio: 1
        }
    });

    Render.run(render);
	
	// Replace your entire Events.on(render, 'afterRender', ...) inside startGame() in client.js
    // --- Custom World-Space Renderer (Draws Background, Buttons, Boxes, Slimes & Liquids in correct layers) ---
    Events.on(render, 'afterRender', () => {
        const ctx = render.context;
        
        // 1. Start camera viewport transformation
        Render.startViewTransform(render);

        // --- LAYER 1: Draw World-Space Scrolling Background ---
        if (bgSprite.complete) {
            const scaleX = mapWidth / bgSprite.width;
            const scaleY = mapHeight / bgSprite.height;
            const scale = Math.max(scaleX, scaleY);

            const drawW = bgSprite.width * scale;
            const drawH = bgSprite.height * scale;

            ctx.drawImage(bgSprite, 0, 0, drawW, drawH);
        }


		// --- LAYER 4: Draw Interactive Buttons ---
        for (let id in gameButtons) {
            const btn = gameButtons[id];
            
            ctx.save();
            // Translate origin to button center
            ctx.translate(btn.position.x, btn.position.y);

            let btnColor = '#e74c3c'; 
            if (btn.color === 'blue') btnColor = '#3498db';
            else if (btn.color === 'green') btnColor = '#2ecc71';

            ctx.fillStyle = btnColor;
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;

            // Draw Isosceles Trapezium relative to center (Width 100, Height 20)
            ctx.beginPath();
            ctx.moveTo(-30, -10); // Top-Left
            ctx.lineTo(30, -10);  // Top-Right
            ctx.lineTo(50, 10);   // Bottom-Right
            ctx.lineTo(-50, 10);  // Bottom-Left
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }


        // --- LAYER 2: Draw Tiled Ground & Slopes (Standard 50x50 Tiles) ---
        if (grassSprite.complete) {
            const tileW = 50;
            const tileH = 50;
            const bodies = Matter.Composite.allBodies(engine.world);

            // A. TILE SOLID GROUND
            const grounds = bodies.filter(b => b.isGround);
            grounds.forEach(ground => {
                const gx = ground.position.x - ground.groundWidth / 2;
                const gy = ground.position.y - ground.groundHeight / 2;

                const cols = ground.groundWidth / tileW;
                const rows = ground.groundHeight / tileH;

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        ctx.drawImage(
                            grassSprite,
                            0, 0, 96, 96,
                            gx + (c * tileW), gy + (r * tileH),
                            tileW, tileH
                        );
                    }
                }
            });

            // B. TILE TRAPEZIUM SLOPES
            const slopes = bodies.filter(b => b.isMapSlope);
            slopes.forEach(slope => {
                const sx = slope.bounds.min.x;
                const sy = slope.bounds.min.y;
                const sw = slope.slopeWidth;
                const sh = slope.slopeHeight;

                ctx.save();
                ctx.beginPath();
                if (slope.slopeType === 'slope_lr') {
                    ctx.moveTo(sx, sy + sh);
                    ctx.lineTo(sx + sw, sy);
                    ctx.lineTo(sx + sw, sy + sh);
                } else {
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx + sw, sy + sh);
                    ctx.lineTo(sx, sy + sh);
                }
                ctx.closePath();
                ctx.clip();

                const cols = Math.ceil(sw / tileW);
                const rows = Math.ceil(sh / tileH);

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        ctx.drawImage(
                            grassSprite,
                            0, 0, 96, 96,
                            sx + (c * tileW), sy + (r * tileH),
                            tileW, tileH
                        );
                    }
                }
                ctx.restore();
            });
        }

        // --- LAYER 3: Draw Spring-Based Interactive Liquids ---
        activeLiquidPools.forEach(pool => {
            pool.update();

            let fillColor, waveColor;
            if (pool.type === 'lava') {
                fillColor = 'rgba(231, 76, 60, 0.6)'; 
                waveColor = '#e67e22';               
            } else if (pool.type === 'water') {
                fillColor = 'rgba(52, 152, 219, 0.6)'; 
                waveColor = '#3498db';               
            } else if (pool.type === 'toxic') {
                fillColor = 'rgba(46, 204, 113, 0.6)'; 
                waveColor = '#2ecc71';               
            }

            ctx.fillStyle = fillColor;
            ctx.strokeStyle = waveColor;
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(pool.x, pool.y + pool.height);
            ctx.lineTo(pool.springs[0].x, pool.springs[0].currentY);

            for (let i = 1; i < pool.springs.length; i++) {
                ctx.lineTo(pool.springs[i].x, pool.springs[i].currentY);
            }

            ctx.lineTo(pool.x + pool.width, pool.y + pool.height);
            ctx.closePath();
            ctx.fill();

            ctx.save();
            ctx.strokeStyle = waveColor;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = waveColor;

            ctx.beginPath();
            ctx.moveTo(pool.springs[0].x, pool.springs[0].currentY);
            for (let i = 1; i < pool.springs.length; i++) {
                ctx.lineTo(pool.springs[i].x, pool.springs[i].currentY);
            }
            ctx.stroke();
            ctx.restore();
        });

         // --- LAYER 3.5: Draw Custom Visual Text Boxes (Purely Visual, Non-Physical) ---
        activeTextBoxes.forEach(el => {
            const lines = (el.text || "").split('\n');
            ctx.save();

            // 1. Dynamic Auto-scaling Font Size Algorithm (Matches Editor perfectly)
            let fontSize = 100;
            ctx.font = `${fontSize}px Arial`;

            while (fontSize > 6) {
                ctx.font = `${fontSize}px Arial`;
                const lineHeight = fontSize * 1.2;
                const totalHeight = lines.length * lineHeight;

                let maxLineWidth = 0;
                lines.forEach(line => {
                    const measure = ctx.measureText(line).width;
                    if (measure > maxLineWidth) maxLineWidth = measure;
                });

                const padding = 10;
                if (maxLineWidth <= el.width - padding * 2 && totalHeight <= el.height - padding * 2) {
                    break;
                }
                fontSize--;
            }

            // 2. Draw Translucent Background Box
            ctx.globalAlpha = el.opacity;
            ctx.fillStyle = el.bgColor;
            ctx.fillRect(el.x, el.y, el.width, el.height);
            ctx.restore(); // Restore globalAlpha back to 1.0 for outline

            // 3. Draw Box Outline
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.strokeRect(el.x, el.y, el.width, el.height);

            // 4. Draw Centered Multi-Line Text
            ctx.fillStyle = '#ffffff';
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const lineHeight = fontSize * 1.2;
            const totalHeight = lines.length * lineHeight;
            let startY = el.y + el.height / 2 - totalHeight / 2 + lineHeight / 2;

            lines.forEach((line, index) => {
                ctx.fillText(line, el.x + el.width / 2, startY + index * lineHeight);
            });
        });
		
		// --- LAYER 4.5: Draw Sliding Doors ---
        for (let id in gameDoors) {
            const door = gameDoors[id];

            ctx.save();
            // Translate origin to door's active center position
            ctx.translate(door.position.x, door.position.y);

            if (door.color === 'red') ctx.fillStyle = '#e74c3c';
            else if (door.color === 'blue') ctx.fillStyle = '#3498db';
            else if (door.color === 'green') ctx.fillStyle = '#2ecc71';
			else if (door.color === 'orange') ctx.fillStyle = '#e67e22';
			else if (door.color === 'purple') ctx.fillStyle = '#9b59b6';
			else if (door.color === 'yellow') ctx.fillStyle = '#f1c40f';

            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;

            // Draw solid centered door rectangle
            ctx.fillRect(-door.doorWidth / 2, -door.doorHeight / 2, door.doorWidth, door.doorHeight);
            ctx.strokeRect(-door.doorWidth / 2, -door.doorHeight / 2, door.doorWidth, door.doorHeight);

            ctx.restore();
        }

		for (let id in gameLevers) {
            const lever = gameLevers[id];
            
            let colorHex;
            if (lever.color === 'orange') colorHex = '#e67e22';
            else if (lever.color === 'purple') colorHex = '#9b59b6';
            else if (lever.color === 'yellow') colorHex = '#f1c40f';

            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;

            // A. Draw Tilted Handle & Orb (Pivot shifted down by 5px to sink into grass)
            ctx.save();
            ctx.translate(lever.position.x, lever.position.y + 15); 
            ctx.rotate(lever.angle);                                 

            // Draw grey handle bar
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(-5, -45, 10, 45);
            ctx.strokeRect(-5, -45, 10, 45);

            // Draw colored orb (Only glows when active / lever.isPressed is true)
            if (lever.isPressed) {
                // PASS 1: Wide, soft outer color halo
                ctx.save();
                ctx.shadowBlur = 30;         // Wide, soft spread
                ctx.shadowColor = colorHex;  
                ctx.fillStyle = colorHex;    // Solid base color
                ctx.beginPath();
                ctx.arc(0, -45, 8, 0, Math.PI * 2); 
                ctx.fill();
                ctx.restore();

                // PASS 2: Tight, high-intensity colored border with a White-Hot Core
                ctx.save();
                ctx.shadowBlur = 10;         // Tight, dense glow
                ctx.shadowColor = colorHex;  
                ctx.fillStyle = '#ffffff';   // FIXED: Pure white center!
                ctx.beginPath();
                ctx.arc(0, -45, 6, 0, Math.PI * 2); // Slightly smaller (6px) to let colored edges show
                ctx.fill();
                ctx.restore();

                // Draw standard dark border over the top to keep crisp pixel-art outline
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, -45, 8, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // INACTIVE STATE: Flat color, no glow or white core
                ctx.fillStyle = colorHex;
                ctx.beginPath();
                ctx.arc(0, -45, 8, 0, Math.PI * 2); 
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();

            // B. Draw Pivot Cap Circle (Diameter 12px) to hide rotation gap
            ctx.fillStyle = '#95a5a6'; // Solid Grey
            ctx.beginPath();
            ctx.arc(lever.position.x, lever.position.y + 15, 5, 0, Math.PI * 2);
            ctx.fill();

            // C. Draw Upside-Down Isosceles Base Plate (Sunk by 5px into grass)
            ctx.fillStyle = colorHex; // Solid Grey
            ctx.beginPath();
            ctx.moveTo(lever.position.x - 50, lever.position.y + 15); // Top-Left (Wide - 50px left of center)
            ctx.lineTo(lever.position.x + 50, lever.position.y + 15); // Top-Right (Wide - 50px right of center)
            ctx.lineTo(lever.position.x + 30, lever.position.y + 35); // Bottom-Right (Narrow - 30px right of center)
            ctx.lineTo(lever.position.x - 30, lever.position.y + 35); // Bottom-Left (Narrow - 30px left of center)
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // --- LAYER 5: Draw Physical Boxes ---
        const activeBodies = Matter.Composite.allBodies(engine.world);
        const boxesOnScreen = activeBodies.filter(b => b.isBox);

        boxesOnScreen.forEach(box => {
            const boxSize = 50;

            ctx.save();
            ctx.translate(box.position.x, box.position.y);
            ctx.rotate(box.angle);

            // A. Draw solid brown block
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(-boxSize/2, -boxSize/2, boxSize, boxSize);
            ctx.strokeStyle = '#5c3a1a';
            ctx.lineWidth = 2;
            ctx.strokeRect(-boxSize/2, -boxSize/2, boxSize, boxSize);

            // B. Draw Crate "X" Brace
            ctx.strokeStyle = '#5c3a1a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-boxSize/2 + 6, -boxSize/2 + 6);
            ctx.lineTo(boxSize/2 - 6, boxSize/2 - 6);
            ctx.moveTo(boxSize/2 - 6, -boxSize/2 + 6);
            ctx.lineTo(-boxSize/2 + 6, boxSize/2 - 6);
            ctx.stroke();

            ctx.restore();
        });

        // --- LAYER 6: Draw Animated Slime Sprites ---
        if (slimeSprite.complete) {
            const frameWidth = 80;
            const frameHeight = 72;
            
            const drawW = 196;
			const drawH = 250;
			const offsetX = 15;
			const offsetY = -16;

            // Draw Local Player
            if (playerBody) {
                const rowIndex = slimeRowMap[selectedIndex] !== undefined ? slimeRowMap[selectedIndex] : 1;
                const sy = rowIndex * frameHeight;

                // 1. Calculate active animation frame based on local movement keys
                let frameIndex = 0;
                const isLocalMoving = keys.Left || keys.Right;

                if (isLocalMoving) {
                    // Running animation: Cycles index 1 to 6 fast
                    const runFrames = [1, 2, 3, 4, 5, 6];
                    const runTick = Math.floor(Date.now() / 90) % runFrames.length; // 90ms per frame
                    frameIndex = runFrames[runTick];
                } else {
                    // Idle animation: Cycles index 0 to 1 slowly
                    const idleFrames = [0, 1];
                    const idleTick = Math.floor(Date.now() / 300) % idleFrames.length; // 300ms per frame
                    frameIndex = idleFrames[idleTick];
                }
				
				const sx = frameIndex * frameWidth; // Map to spritesheet X coordinate

                ctx.save(); 
                ctx.translate(playerBody.position.x, playerBody.position.y);
                ctx.scale(facingDirection, 1);

                ctx.drawImage(
                    slimeSprite,
                    sx, sy, frameWidth, frameHeight,
                    -drawW / 2 + offsetX,  
                    -drawH / 2 + offsetY,  
                    drawW, drawH
                );
                ctx.restore();

                // Apply submerged liquid tint overlay
                activeLiquidPools.forEach(pool => {
                    const isOverlappingX = playerBody.position.x + drawW/2 > pool.x && playerBody.position.x - drawW/2 < pool.x + pool.width;
                    const isOverlappingY = playerBody.position.y + drawH/2 > pool.y;

                    if (isOverlappingX && isOverlappingY) {
                        let tintColor = 'rgba(52, 152, 219, 0.45)'; 
                        if (pool.type === 'lava') {
                            tintColor = 'rgba(230, 126, 34, 0.5)'; 
                        } else if (pool.type === 'toxic') {
                            tintColor = 'rgba(46, 204, 113, 0.5)'; 
                        }

                        generateTintedFrame(sx, sy, frameWidth, frameHeight, tintColor);

                        ctx.save();
                        clipToPoolSurface(ctx, pool);
                        ctx.translate(playerBody.position.x, playerBody.position.y);
                        ctx.scale(facingDirection, 1);

                        ctx.drawImage(
                            tintCanvas,
                            -drawW / 2 + offsetX,  
                            -drawH / 2 + offsetY,  
                            drawW, drawH
                        );
                        ctx.restore();
                    }
                });
            }

            // Draw Remote Players
            for (let id in otherPlayers) {
                const remoteBody = otherPlayers[id];
                if (remoteBody) {
                    const rIndex = remoteBody.charIndex !== undefined ? remoteBody.charIndex : 0;
                    const rowIndex = slimeRowMap[rIndex] !== undefined ? slimeRowMap[rIndex] : 1;
                    const sy = rowIndex * frameHeight;
                    const rFacing = remoteBody.facing !== undefined ? remoteBody.facing : 1;
					
					// 1. Calculate active animation frame based on stable input-driven network state
					let rFrameIndex = 0;
					const isRemoteMoving = remoteBody.moving !== undefined ? remoteBody.moving : false;

					if (isRemoteMoving) {
						// Running animation: Cycles index 1 to 6 fast
						const runFrames = [1, 2, 3, 4, 5, 6];
						const runTick = Math.floor(Date.now() / 90) % runFrames.length;
						rFrameIndex = runFrames[runTick];
					} else {
						// Idle animation: Cycles index 0 to 1 slowly
						const idleFrames = [0, 1];
						const idleTick = Math.floor(Date.now() / 300) % idleFrames.length;
						rFrameIndex = idleFrames[idleTick];
					}

					const rsx = rFrameIndex * frameWidth;

                    // A. Draw remote player normally
					ctx.save();
					ctx.translate(remoteBody.position.x, remoteBody.position.y);
					ctx.scale(rFacing, 1);

					ctx.drawImage(
						slimeSprite,
						rsx, sy, frameWidth, frameHeight,
						-drawW / 2 + offsetX,  
						-drawH / 2 + offsetY,  
						drawW, drawH
					);
					ctx.restore();

                    // Apply submerged liquid tint overlay for remote player
                    activeLiquidPools.forEach(pool => {
                        const isOverlappingX = remoteBody.position.x + drawW/2 > pool.x && remoteBody.position.x - drawW/2 < pool.x + pool.width;
                        const isOverlappingY = remoteBody.position.y + drawH/2 > pool.y;

                        if (isOverlappingX && isOverlappingY) {
                            let tintColor = 'rgba(52, 152, 219, 0.45)';
                            if (pool.type === 'lava') {
                                tintColor = 'rgba(230, 126, 34, 0.5)';
                            } else if (pool.type === 'toxic') {
                                tintColor = 'rgba(46, 204, 113, 0.5)';
                            }

                            const activeRemoteFrameX = (Math.abs(remoteBody.velocity.x) > 0.5 ? [1,2,3,4,5,6][Math.floor(Date.now() / 90) % 6] : [0,1][Math.floor(Date.now() / 300) % 2]) * frameWidth;

                            generateTintedFrame(activeRemoteFrameX, sy, frameWidth, frameHeight, tintColor);

                            ctx.save();
                            clipToPoolSurface(ctx, pool);
                            ctx.translate(remoteBody.position.x, remoteBody.position.y);
                            ctx.scale(rFacing, 1);

                            ctx.drawImage(
                                tintCanvas,
                                -drawW / 2 + offsetX,  
                                -drawH / 2 + offsetY,  
                                drawW, drawH
                            );
                            ctx.restore();
                        }
                    });
                }
            }
        }


		// --- 6.5 Draw Projectiles manually on Top of Background (With Submerged Tinting) ---
        const projectilesOnScreen = activeBodies.filter(b => b.isProjectile);
        
        projectilesOnScreen.forEach(proj => {
            const projRadius = 15;

            // A. Draw solid projectile
            ctx.save();
            ctx.translate(proj.position.x, proj.position.y);

            ctx.fillStyle = proj.launcherIndex === 0 ? '#e67e22' : '#2980b9';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(0, 0, projRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();

            // B. Apply shape-matched liquid tint overlay on submerged portion
            activeLiquidPools.forEach(pool => {
                const isOverlappingX = proj.position.x + projRadius > pool.x && proj.position.x - projRadius < pool.x + pool.width;
                const isOverlappingY = proj.position.y + projRadius > pool.y;

                if (isOverlappingX && isOverlappingY) {
                    ctx.save();
                    
                    // Clip drawing to the waving water line
                    clipToPoolSurface(ctx, pool);

                    ctx.translate(proj.position.x, proj.position.y);

                    // Setup translucent color matching the liquid
                    let tintColor = 'rgba(52, 152, 219, 0.4)'; 
                    if (pool.type === 'lava') {
                        tintColor = 'rgba(230, 126, 34, 0.45)'; 
                    } else if (pool.type === 'toxic') {
                        tintColor = 'rgba(46, 204, 113, 0.45)'; 
                    }

                    ctx.fillStyle = tintColor;
                    
                    // Draw centered 15px radius tint circle over the projectile
                    ctx.beginPath();
                    ctx.arc(0, 0, projRadius, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                }
            });
        });

        // --- LAYER 7: Draw Rotated Submerged Box Tinting ---
        boxesOnScreen.forEach(box => {
            const boxSize = 50;

            activeLiquidPools.forEach(pool => {
                const isOverlappingX = box.position.x + boxSize/2 > pool.x && box.position.x - boxSize/2 < pool.x + pool.width;
                const isOverlappingY = box.position.y + boxSize/2 > pool.y;

                if (isOverlappingX && isOverlappingY) {
                    ctx.save();
                    clipToPoolSurface(ctx, pool);

                    ctx.translate(box.position.x, box.position.y);
                    ctx.rotate(box.angle);

                    let tintColor = 'rgba(52, 152, 219, 0.4)'; 
                    if (pool.type === 'lava') {
                        tintColor = 'rgba(230, 126, 34, 0.45)'; 
                    } else if (pool.type === 'toxic') {
                        tintColor = 'rgba(46, 204, 113, 0.45)'; 
                    }

                    ctx.fillStyle = tintColor;
                    ctx.fillRect(-boxSize/2, -boxSize/2, boxSize, boxSize);

                    ctx.restore();
                }
            });
        });
		/*
        // --- LAYER 8: Draw Translucent Physics Circles (Debug Only) ---
        ctx.lineWidth = 2;
        if (playerBody) {
            ctx.beginPath();
            ctx.arc(playerBody.position.x, playerBody.position.y, 25, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(241, 196, 15, 0.6)'; 
            ctx.stroke();
            ctx.fillStyle = 'rgba(241, 196, 15, 0.8)';
            ctx.fillRect(playerBody.position.x - 2, playerBody.position.y - 2, 4, 4);
        }

        for (let id in otherPlayers) {
            const remoteBody = otherPlayers[id];
            if (remoteBody) {
                ctx.beginPath();
                ctx.arc(remoteBody.position.x, remoteBody.position.y, 25, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)'; 
                ctx.stroke();
            }
        }*/
		
		if (isAiming) {
            // Drag vector
            const dx = aimCurrent.x - playerBody.position.x;
            const dy = aimCurrent.y - playerBody.position.y;

            const forceMultiplier = 0.2;
            let tx = playerBody.position.x;
            let ty = playerBody.position.y;
            
            // Calculate starting velocities
            launchVx = dx * forceMultiplier;
            launchVy = dy * forceMultiplier;

            // Cap the launch speed safely to prevent extreme speeds
            const maxSpeed = 25;
            const speed = Math.sqrt(launchVx * launchVx + launchVy * launchVy);
            if (speed > maxSpeed) {
                launchVx = (launchVx / speed) * maxSpeed;
                launchVy = (launchVy / speed) * maxSpeed;
            }

            let tvx = launchVx;
            let tvy = launchVy;
            const gravityStepY = 0.375; // Perfectly calibrated gravity step for engine.gravity.y = 1.5
            const airDrag = 0.99;       // Matches Matter's default physical frictionAir (0.01)

            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]); // Dotted line style

            // Project 40 frames into the future
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            for (let i = 0; i < 80; i++) {
				// 1. Apply air resistance (frictionAir)
                tvx *= airDrag;
                tvy *= airDrag;

                // 2. Apply gravity acceleration
                tvy += gravityStepY;
				
                // 3. Increment future coordinates
                tx += tvx;
                ty += tvy;

                ctx.lineTo(tx, ty);
            }
            ctx.stroke();
            ctx.restore();
        };

        
		activeCameraMatrix = ctx.getTransform();
		// 2. Reset viewport matrix back to normal
        Render.endViewTransform(render);
    });
	

	
	
    // Configure the runner to use standard delta timings
    runner = Runner.create({
        isFixed: false // Adapts physics calculation dynamically to real time
    });
    Runner.run(runner, engine);

    // 3. Create Map Elements (Based on 1000x600 grid)
    let mapWidth = 3000;
    let mapHeight = 1200;
    const platformsToCreate = [];
	let boxCount = 0;
	let buttonCount = 0;
	let doorCount = 0;
	let leverCount = 0;
	
	activeLiquidPools.length = 0;
	activeTextBoxes.length = 0;
	for (let id in gameBoxes) delete gameBoxes[id]; 
	for (let id in gameButtons) delete gameButtons[id];
	for (let id in gameDoors) delete gameDoors[id];
	for (let id in gameLevers) delete gameLevers[id]
    collidingBoxes.clear();
    submergedBoxes.clear();
	activePressedButtons.clear();
	
    if (loadedMapData) {
        // A. Load Map from Uploaded File
        mapWidth = loadedMapData.width || 3000;
        mapHeight = loadedMapData.height || 1200;

        loadedMapData.elements.forEach(el => {
			const centerX = el.x + el.width / 2;
            const centerY = el.y + el.height / 2;
			
            if (el.type === 'ground') {
                // Convert top-left (x,y) coordinates to Matter.js center-based coordinate system

                const platform = Bodies.rectangle(
                    centerX, 
                    centerY, 
                    el.width, 
                    el.height, 
                    { 
						isStatic: true, 
						collisionFilter: { category: CATEGORY_MAP },
						render: { visible: false } }
                );
				
				platform.isGround = true;
                platform.groundWidth = el.width;
                platform.groundHeight = el.height;

                platformsToCreate.push(platform);
				
            }
			else if (el.type === 'lava' || el.type === 'water' || el.type === 'toxic') {
                // Create liquids as SENSORS so players can fall *into* them
                const liquid = Bodies.rectangle(
                    centerX, 
                    centerY, 
                    el.width, 
                    el.height, 
                    { 
                        isStatic: true, 
                        isSensor: true, 
                        render: { visible: false } // Hide default grey boxes
                    }
                );
				
				liquid.liquidType = el.type; // e.g., 'lava', 'water', or 'toxic'
    
				// These are needed so the renderer knows the width/height to draw the waves
				liquid.liquidWidth = el.width;
				liquid.liquidHeight = el.height;
                
                // Instantiate our spring pool and save its reference
                const pool = new LiquidPool(liquid, el.type, el.x, el.y, el.width, el.height);
                activeLiquidPools.push(pool);

                platformsToCreate.push(liquid);
            }
			else if (el.type === 'slope_lr' || el.type === 'slope_rl') {
                let vertices;
                const w = el.width;
                const h = el.height;

                if (el.type === 'slope_lr') {
                    // Slopes up from left to right (hypotenuse on top-left)
                    vertices = [{ x: 0, y: h }, { x: w, y: 0 }, { x: w, y: h }];
                } else {
                    // Slopes down from left to right (hypotenuse on top-right)
                    vertices = [{ x: 0, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
                }

                // Create the slope starting at (0,0) to let Matter calculate the shape centroid
                const slopeBody = Bodies.fromVertices(0, 0, [vertices], {
                    isStatic: true,
					collisionFilter: { category: CATEGORY_MAP },
                    render: { visible: false }
                });
				
				slopeBody.isSlope = true;
				slopeBody.isMapSlope = true;
                slopeBody.slopeType = el.type; // 'slope_lr' or 'slope_rl'
				
                slopeBody.slopeWidth = w;
                slopeBody.slopeHeight = h;

                // Calculate Matter centroid offset and align perfectly with editor (x,y) coordinates
                const offsetX = el.x - slopeBody.bounds.min.x;
                const offsetY = el.y - slopeBody.bounds.min.y;
                Matter.Body.translate(slopeBody, { x: offsetX, y: offsetY });

                platformsToCreate.push(slopeBody);
            }
			else if (el.type === 'box') {
                const centerX = el.x + el.width / 2;
                const centerY = el.y + el.height / 2;

                const boxBody = Bodies.rectangle(
                    centerX, 
                    centerY, 
                    el.width, 
                    el.height, 
                    { 
                        isStatic: false,   // Dynamic (movable & rotatable)
                        friction: 0.1,     // Slidability friction
                        frictionAir: 0.02, 
                        restitution: 0.15, // Slight bounce
                        density: 0.0005,   // FIXED: Half default density makes it lighter than player
						collisionFilter: { category: CATEGORY_MAP },
                        render: { visible: false }
                    }
                );

                // Tag the body for collision and rendering checks
                boxBody.isBox = true;
				
				boxBody.initialX = centerX;
                boxBody.initialY = centerY;
				
				const boxId = 'box_' + boxCount;
                boxBody.boxId = boxId;
                gameBoxes[boxId] = boxBody; // Register in global lookup
                boxCount++;

                platformsToCreate.push(boxBody);
            }
			else if (el.type === 'button') {
                const centerX = el.x + el.width / 2;
                const centerY = el.y + el.height / 2;

                // Isosceles Trapezium Vertices relative to center (Width 50, Height 20)
                const vertices = [
                    { x: -30, y: -10 }, // Top-Left (Center 60 = 30px left)
                    { x: 30, y: -10 },  // Top-Right (Center 60 = 30px right)
                    { x: 50, y: 10 },   // Bottom-Right
                    { x: -50, y: 10 }   // Bottom-Left
                ];

                // Determine native fill color based on map settings
                let btnColor = '#e74c3c'; // Red (Default)
                if (el.color === 'blue') btnColor = '#3498db';
                else if (el.color === 'green') btnColor = '#2ecc71';

                const btnBody = Bodies.fromVertices(0, 0, [vertices], {
                    isStatic: true,
                    render: { visible: false }
                });

                // Align Matter centroid to exactly (el.x, el.y)
                const offsetX = el.x - btnBody.bounds.min.x;
                const offsetY = el.y - btnBody.bounds.min.y;
                Matter.Body.translate(btnBody, { x: offsetX, y: offsetY });

                // Attach custom properties
                const btnId = 'button_' + buttonCount;
                btnBody.isButton = true;
                btnBody.buttonId = btnId;
                btnBody.color = el.color;
                btnBody.initialY = btnBody.position.y;
                btnBody.isPressed = false;
                btnBody.networkPressed = false; // Sync state from other client

                gameButtons[btnId] = btnBody;
                buttonCount++;

                platformsToCreate.push(btnBody);
            }
			else if (el.type === 'door') {
                const centerX = el.x + el.width / 2;
                const centerY = el.y + el.height / 2;

                const doorBody = Bodies.rectangle(
                    centerX, 
                    centerY, 
                    el.width, 
                    el.height, 
                    { 
                        isStatic: true, 
                        render: { visible: false } // FIXED: Hide default solid blocks
                    }
                );

                // Attach custom properties
                const doorId = 'door_' + doorCount;
                doorBody.isDoor = true;
                doorBody.doorId = doorId;
                doorBody.color = el.color;
                doorBody.initialX = centerX;
                doorBody.initialY = centerY;
                // Convert top-left target coords from editor to Matter's center-of-mass coordinates
                doorBody.targetX = el.targetX + el.width / 2;
                doorBody.targetY = el.targetY + el.height / 2;
                doorBody.doorWidth = el.width;
                doorBody.doorHeight = el.height;

                gameDoors[doorId] = doorBody;
                doorCount++;

                platformsToCreate.push(doorBody);
            }
			else if (el.type === 'lever') {
                const centerX = el.x + el.width / 2;
                const centerY = el.y + el.height / 2;

                const leverBody = Bodies.rectangle(
                    centerX, 
                    centerY, 
                    el.width, 
                    el.height, 
                    { 
                        isStatic: true, 
                        isSensor: true, // Sensors so players can walk through to trigger
                        render: { visible: false } 
                    }
                );
				
				// 3. Solid Walkable Handle Body (Tag as slope so player can run up it!)
                const handleBody = Bodies.rectangle(
                    centerX,
                    centerY - 10,
                    12, // 12px thickness
                    55, // 55px height
                    {
                        isStatic: true,
                        isSlope: true,        // Enable climbing
                        slopeType: 'slope_lr', // Starts pointing right
                        slopeWidth: 55,
                        slopeHeight: 55,
                        render: { visible: false }
                    }
                );

                // Attach custom properties
                const leverId = 'lever_' + leverCount;
                leverBody.isLever = true;
                leverBody.leverId = leverId;
                leverBody.color = el.color;
                leverBody.isPressed = false;    // Normal state is inactive (pointing right)
				leverBody.isPressedLocalState = false;
                leverBody.angle = 0.5;          // Current visual angle (rad)
                leverBody.networkPressed = false; 
				leverBody.handleBody = handleBody; 
				
				// TAG the handle so we can detect player & box pushes
                handleBody.isLeverHandle = true;
                handleBody.leverParentId = leverId;
                leverBody.handleBody = handleBody; 

                gameLevers[leverId] = leverBody;
                leverCount++;

                platformsToCreate.push(leverBody, handleBody);
            }
			else if (el.type === 'textbox') {
                // Skip physics completely! Push directly into visual array
                activeTextBoxes.push({
                    x: el.x,
                    y: el.y,
                    width: el.width,
                    height: el.height,
                    text: el.text || "Sample Text",
                    bgColor: el.bgColor || "#34495e",
                    opacity: el.opacity !== undefined ? el.opacity : 0.8
                });
            }
		
		});
    } else {
        // B. Default Fallback Map Layout
        const ground = Bodies.rectangle(
            mapWidth / 2, 
            mapHeight - 30, 
            mapWidth, 
            60, 
            { isStatic: true, render: { fillStyle: '#2c3e50' } }
        );
        platformsToCreate.push(ground);

        const defaultPlatforms = [
            Bodies.rectangle(400, mapHeight - 220, 250, 30, { isStatic: true, render: { fillStyle: '#34495e' } }),
            Bodies.rectangle(1000, mapHeight - 380, 250, 30, { isStatic: true, render: { fillStyle: '#34495e' } }),
            Bodies.rectangle(1500, mapHeight - 200, 300, 30, { isStatic: true, render: { fillStyle: '#34495e' } })
        ];
        platformsToCreate.push(...defaultPlatforms);
    }

    
    // 4. Create the Player Body
    const playerColor = characters[selectedIndex].color;
	
	// Set default coordinates in case map file is blank
    let spawnX = mapWidth / 2;
    let spawnY = mapHeight - 300;
	
	if (loadedMapData) {
        // Index 0 = Fire Boy, Index 1 = Water Girl
        if (selectedIndex === 0 && loadedMapData.fireboySpawn) {
            spawnX = loadedMapData.fireboySpawn.x;
            spawnY = loadedMapData.fireboySpawn.y;
        } else if (selectedIndex === 1 && loadedMapData.watergirlSpawn) {
            spawnX = loadedMapData.watergirlSpawn.x;
            spawnY = loadedMapData.watergirlSpawn.y;
        } else {
            // Earth Stone spawns in center by default
            spawnX = mapWidth / 2;
            spawnY = mapHeight - 300;
        }
    }
	
	const myCategory = selectedIndex === 0 ? CATEGORY_FIREBOY : CATEGORY_WATERGIRL;
    const myMask = CATEGORY_MAP | (selectedIndex === 0 ? CATEGORY_WATERGIRL : CATEGORY_FIREBOY) | CATEGORY_PROJECTILE;
	
    playerBody = Bodies.circle(
        spawnX,            // Spawn in the horizontal center of the map
        spawnY,         // Spawn safely above the platform heights
        25, 
        {
			friction: 0,       // Disable native sliding friction
            frictionStatic: 0, // Disable native standing friction
            restitution: 0.1, 
            inertia: Infinity, 
			collisionFilter: {
                category: myCategory, // Fireboy (0x0002) or Watergirl (0x0004)
                mask: myMask          // Collides with map, other player, and projectiles
            },
            render: { visible: false  }
        }
    );

    // Add bodies to the world
    Composite.add(engine.world, [...platformsToCreate, playerBody]);

    // 4. Establish WebSocket Connection & Event Listeners
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const socketUrl = `${protocol}${window.location.host}`;
    socket = new WebSocket(socketUrl);

    socket.onopen = () => {
        socket.send(JSON.stringify({
            type: 'join',
            character: characters[selectedIndex],
			charIndex: selectedIndex,
            x: playerBody.position.x, // Send exact spawned physics coordinates
            y: playerBody.position.y
        }));
    };
	
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Store assigned ID and spawn existing players
        if (data.type === 'welcome') {
            myId = data.id;
            for (let id in data.players) {
                if (id !== myId) {
                    spawnOtherPlayer(data.players[id]);
                }
            }
        }

        // Handle another player joining
        if (data.type === 'playerJoined') {
            spawnOtherPlayer(data.player);
        }

        // Update target position of another player (instead of snapping instantly)
        if (data.type === 'playerMoved') {
            const remoteBody = otherPlayers[data.id];
            if (remoteBody) {
                remoteBody.targetX = data.x;
                remoteBody.targetY = data.y;
				remoteBody.facing = data.facing;
				remoteBody.moving = data.moving;
            }
        }

        // Clean up when a player exits
        if (data.type === 'playerLeft') {
            const remoteBody = otherPlayers[data.id];
            if (remoteBody) {
                Composite.remove(engine.world, remoteBody);
                delete otherPlayers[data.id];
            }
        }
		if (data.type === 'boxUpdate') {
            data.boxes.forEach(update => {
                const box = gameBoxes[update.id];
                if (box) {
                    const lerpFactor = 0.25;
                    const dx = update.x - box.position.x;
                    const dy = update.y - box.position.y;
                    
                    // Smoothly slide position and sync velocity
                    Matter.Body.setVelocity(box, { x: dx * lerpFactor, y: dy * lerpFactor });
                    Matter.Body.setPosition(box, { 
                        x: box.position.x + (dx * lerpFactor), 
                        y: box.position.y + (dy * lerpFactor) 
                    });

                    // Smoothly slide rotation angle
                    const da = update.angle - box.angle;
                    Matter.Body.setAngle(box, box.angle + (da * lerpFactor));
                }
            });
        }
		
		if (data.type === 'buttonPress') {
            const btn = gameButtons[data.id];
            if (btn) {
                btn.networkPressed = data.pressed; // Sync state from other client
            }
        }
		
		 if (data.type === 'leverToggle') {
            const lever = gameLevers[data.id];
            if (lever) {
                lever.networkPressed = data.pressed; // Sync state from other client
            }
        }
		
		if (data.type === 'spawnProjectile') {
            spawnLocalProjectile(data.x, data.y, data.vx, data.vy, data.launcherIndex);
        }
		
		if (data.type === 'playerDeath') {
            isResetting = true;
            setTimeout(resetLevel, 1000); // Reset local screen 1 second later
        }
		
		if (data.type === 'playAudio') {
            const sound = sounds[data.soundId];
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(e => console.log("Playback blocked:", e));
            }
        }
		
		if (data.type === 'jumpscare') {
            executeJumpscareLocally();
        }
		
    };

    // Helper function to spawn remote player avatars
    function spawnOtherPlayer(playerData) {
        if (otherPlayers[playerData.id]) return;
		
		const rIndex = playerData.charIndex !== undefined ? playerData.charIndex : 0;
		const rCategory = rIndex === 0 ? CATEGORY_FIREBOY : CATEGORY_WATERGIRL;
		const rMask = CATEGORY_MAP | (rIndex === 0 ? CATEGORY_WATERGIRL : CATEGORY_FIREBOY) | CATEGORY_PROJECTILE;

        const remoteBody = Bodies.circle(
            playerData.x, 
            playerData.y, 
            25, 
            {
                isStatic: false, 
                inertia: Infinity, 
                friction: 0.05,
                restitution: 0.1,
				collisionFilter: {
					category: rCategory,
					mask: rMask
				},
                render: { visible: false }
            }
        );
		
		// Attach network ID to identify this body during collisions
        remoteBody.playerId = playerData.id;
		remoteBody.charIndex = playerData.charIndex; 
		remoteBody.facing = playerData.facing !== undefined ? playerData.facing : 1;
		remoteBody.moving = playerData.moving !== undefined ? playerData.moving : false;

        // Initialize target coordinates for smooth rendering
        remoteBody.targetX = playerData.x;
        remoteBody.targetY = playerData.y;

        otherPlayers[playerData.id] = remoteBody;
        Composite.add(engine.world, remoteBody);
    }

    // 5. Collision Detection to Handle Grounding
    Events.on(engine, 'collisionStart', (event) => {
        checkGrounded(event);
        trackPlayerCollisions(event);
		handleLiquidSplashes(event); 
		handleLeverCollisions(event);
		
		// --- NEW: Projectile Impact & Shockwave Detector ---
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
            let bodyA = pair.bodyA.parent;
            let bodyB = pair.bodyB.parent;

            if (bodyA.isProjectile || bodyB.isProjectile) {
                const proj = bodyA.isProjectile ? bodyA : bodyB;
                const target = bodyA.isProjectile ? bodyB : bodyA;

                // If projectile hits a player, apply shockwave force and delete the projectile
                const isPlayer = target === playerBody || otherPlayers[target.playerId];

                if (isPlayer) {
                    applyShockwaveForce(target, proj);
                    console.log("PROJECTILE HIT! Applying shockwave force.");
                    
                    // Instantly remove projectile from game world
					submergedProjectiles.delete(proj);
                    Matter.Composite.remove(engine.world, proj);
                }
            }
        }
    });
    
    Events.on(engine, 'collisionActive', (event) => {
        checkGrounded(event);
        trackPlayerCollisions(event);
		handleActiveLiquidSplashes(event);
		handleLeverCollisions(event);
    });
    
    Events.on(engine, 'collisionEnd', (event) => {
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
            if (pair.bodyA.parent === playerBody || pair.bodyB.parent === playerBody) {
                let otherPart = pair.bodyA.parent === playerBody ? pair.bodyB : pair.bodyA;
                let other = otherPart.parent; // Resolve to topmost parent body
                
                // Remove player from active collisions when we stop touching them
                if (other.playerId) {
                    collidingPlayers.delete(other.playerId);
                }
				// Stop tracking liquid contact when we exit a pool
                if (other.liquidType) {
                    activeLiquids.delete(other.liquidType);
                }
				if (other.isSlope) {
                    activeSlopeType = null; // Reset slope tracking when exiting
                }
                isGrounded = false;
				
				let bodyA = pair.bodyA.parent;
				let bodyB = pair.bodyB.parent;
				if (bodyA.isBox && bodyB.liquidType) {
					submergedBoxes.delete(bodyA);
				} else if (bodyB.isBox && bodyA.liquidType) {
					submergedBoxes.delete(bodyB);
				}

				// Remove Box-Player Push tracking
				if (bodyA === playerBody && bodyB.isBox) {
					collidingBoxes.delete(bodyB.boxId);
				} else if (bodyB === playerBody && bodyA.isBox) {
					collidingBoxes.delete(bodyA.boxId);
				}
				
				// NEW: Remove Projectile-Liquid Submersion tracking
				if (bodyA.isProjectile && bodyB.liquidType) {
					submergedProjectiles.delete(bodyA);
				} else if (bodyB.isProjectile && bodyA.liquidType) {
					submergedProjectiles.delete(bodyB);
				}
				
            }
        }
    });
	
	// Helper to register who we are currently pushing/touching
    function trackPlayerCollisions(event) {
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
            
            let bodyA = pair.bodyA.parent;
            let bodyB = pair.bodyB.parent;

            // Track Player-Player contacts
            if (bodyA === playerBody || bodyB === playerBody) {
                let other = bodyA === playerBody ? bodyB : bodyA;
                if (other.playerId) {
                    collidingPlayers.add(other.playerId);
                }
            }

            // Track Box-Liquid Submersion contact
            if (bodyA.isBox && bodyB.liquidType) {
                submergedBoxes.add(bodyA);
            } else if (bodyB.isBox && bodyA.liquidType) {
                submergedBoxes.add(bodyB);
            }

            // Track Box-Player Push contact (Local player takes authority over this box)
            if (bodyA === playerBody && bodyB.isBox) {
                collidingBoxes.add(bodyB.boxId);
            } else if (bodyB === playerBody && bodyA.isBox) {
                collidingBoxes.add(bodyA.boxId);
            }
			
			// NEW: Track Projectile-Liquid Submersion contact
            if (bodyA.isProjectile && bodyB.liquidType) {
                submergedProjectiles.add(bodyA);
            } else if (bodyB.isProjectile && bodyA.liquidType) {
                submergedProjectiles.add(bodyB);
            }
        }
    }
	
	// Helper to calculate impact positions and trigger ripples in active pools
    // UPDATED: Calculates initial entry splashes using combined horizontal and vertical speeds
    function handleLiquidSplashes(event) {
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
            
            let bodyA = pair.bodyA.parent;
            let bodyB = pair.bodyB.parent;

            // Check Local Player Impact
            if (bodyA === playerBody || bodyB === playerBody) {
                let other = bodyA === playerBody ? bodyB : bodyA;
                if (other.liquidType) {
                    const pool = activeLiquidPools.find(p => p.body === other);
                    if (pool) {
                        const combinedSpeed = Math.abs(playerBody.velocity.y) + (Math.abs(playerBody.velocity.x) * 0.4);
                        pool.splash(playerBody.position.x, combinedSpeed * 1.8);
                    }
                }
            }

            // Check Remote Player Impacts
            for (let id in otherPlayers) {
                const remoteBody = otherPlayers[id];
                if (bodyA === remoteBody || bodyB === remoteBody) {
                    let other = bodyA === remoteBody ? bodyB : bodyA;
                    if (other.liquidType) {
                        const pool = activeLiquidPools.find(p => p.body === other);
                        if (pool) {
                            const combinedSpeed = Math.abs(remoteBody.velocity.y) + (Math.abs(remoteBody.velocity.x) * 0.4);
                            pool.splash(remoteBody.position.x, combinedSpeed * 1.8);
                        }
                    }
                }
            }

            // NEW: Check Box Impacts (Allows boxes falling into pools to trigger ripples!)
            if (bodyA.isBox && bodyB.liquidType) {
                const pool = activeLiquidPools.find(p => p.body === bodyB);
				const combinedSpeed = Math.abs(bodyA.velocity.y) + (Math.abs(bodyA.velocity.x) * 0.4);
                if (pool) pool.splash(bodyA.position.x, combinedSpeed * 1.4);
            } else if (bodyB.isBox && bodyA.liquidType) {
                const pool = activeLiquidPools.find(p => p.body === bodyA);
				const combinedSpeed = Math.abs(bodyB.velocity.y) + (Math.abs(bodyB.velocity.x) * 0.4);
                if (pool) pool.splash(bodyB.position.x, combinedSpeed * 1.4);
            }
			
			// --- NEW: Check Projectile Impacts (Allows fired energy balls to splash!) ---
            if (bodyA.isProjectile && bodyB.liquidType) {
                const pool = activeLiquidPools.find(p => p.body === bodyB);
                if (pool) {
                    // Triggers splash using projectile's high entry velocity
					const scaledImpactSpeed = Math.abs(bodyA.velocity.y) * 0.3;
                    pool.splash(bodyA.position.x, scaledImpactSpeed);
                }
            } else if (bodyB.isProjectile && bodyA.liquidType) {
                const pool = activeLiquidPools.find(p => p.body === bodyA);
                if (pool) {
					const scaledImpactSpeed = Math.abs(bodyB.velocity.y) * 0.3;
                    pool.splash(bodyB.position.x, scaledImpactSpeed);
                }
            }
        }
    }

    function handleLeverCollisions(event) {
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
            let bodyA = pair.bodyA.parent;
            let bodyB = pair.bodyB.parent;

            if (bodyA.isLeverHandle || bodyB.isLeverHandle) {
                const handle = bodyA.isLeverHandle ? bodyA : bodyB;
                const pusher = bodyA.isLeverHandle ? bodyB : bodyA;

                // Verify the pusher is a player, remote player, or dynamic box
                const isValidPusher = pusher === playerBody || pusher.isBox || otherPlayers[pusher.playerId];

                if (isValidPusher) {
                    const lever = gameLevers[handle.leverParentId];
                    if (lever) {
                        // Check if collision is vertical (ignores clicks/climbs from on top of the ramp)
                        const isAbove = pusher.position.y < handle.position.y - 12;

                        if (!isAbove) {
                            // A. PUSH LEFT (Activate): Pusher hits the handle from the Right side
                            if (pusher.position.x > handle.position.x + 5) {
                                lever.isPressed = true;
                            }
                            // B. PUSH RIGHT (Deactivate): Pusher hits the handle from the Left side
                            else if (pusher.position.x < handle.position.x - 5) {
                                lever.isPressed = false;
                            }
                        }
                    }
                }
            }
        }
    }
	
	// NEW: Generates gentle continuous wakes/ripples at the players' feet as they walk inside the water
    function handleActiveLiquidSplashes(event) {
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
            
            // Local Player Wading
            if (pair.bodyA.parent === playerBody || pair.bodyB.parent === playerBody) {
                let otherPart = pair.bodyA.parent === playerBody ? pair.bodyB : pair.bodyA;
                let other = otherPart.parent;
                
                // Only generate ripples if actively walking (speed > 0.5) inside a liquid sensor
                if (other.liquidType && Math.abs(playerBody.velocity.x) > 0.5) {
                    const pool = activeLiquidPools.find(p => p.body === other);
                    if (pool) {
                        // Apply a subtle, gentle continuous wave (12% of horizontal walking speed)
                        pool.splash(playerBody.position.x, Math.abs(playerBody.velocity.x) * 0.12);
                    }
                }
            }

            // Remote Player Wading
            for (let id in otherPlayers) {
                const remoteBody = otherPlayers[id];
                if (pair.bodyA.parent === remoteBody || pair.bodyB.parent === remoteBody) {
                    let otherPart = pair.bodyA.parent === remoteBody ? pair.bodyB : pair.bodyA;
                    let other = otherPart.parent;

                    if (other.liquidType && Math.abs(remoteBody.velocity.x) > 0.5) {
                        const pool = activeLiquidPools.find(p => p.body === other);
                        if (pool) {
                            pool.splash(remoteBody.position.x, Math.abs(remoteBody.velocity.x) * 0.12);
                        }
                    }
                }
            }
        }
    }

    function checkGrounded(event) {
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
			
            let bodyA = pair.bodyA.parent;
            let bodyB = pair.bodyB.parent;
			
            // Check parent references
            if (pair.bodyA.parent === playerBody || pair.bodyB.parent === playerBody) {
                let otherPart = pair.bodyA.parent === playerBody ? pair.bodyB : pair.bodyA;
                let other = otherPart.parent; // Resolve to topmost parent body
                
                if (other.liquidType) {
                    activeLiquids.add(other.liquidType);
                    continue; 
                }

                if (other.isSlope) {
                    // A. SLOPES: Use parent-based collision normals (Fires console log correctly now)
                    let normal = pair.collision.normal;
                    let groundedOnSlope = false;

                    // If the collision angle is predominantly vertical (Math.abs > 0.5), you are on top
                    if (Math.abs(normal.y) > 0.5) {
                        groundedOnSlope = true;
                    }

                    if (groundedOnSlope) {
                        isGrounded = true;
                        activeSlopeType = other.slopeType;
                    }
                } else {
                    // B. FLAT GROUND: Use relative position check
                    const isAbovePlatform = playerBody.position.y < other.bounds.min.y + 10;
                    const isHorizontallyAligned = (playerBody.position.x > other.bounds.min.x - 10) && 
                                                  (playerBody.position.x < other.bounds.max.x + 10);

                    if (isAbovePlatform && isHorizontallyAligned) {
                        isGrounded = true;
                    }
                }
            }
			

		}
    }

    let networkTick = 0;

    // 6. Game Loop Update (Movement Force, Smoothing, & Network Broadcast)
    Events.on(engine, 'beforeUpdate', () => {
        if (!playerBody) return;
		
		if (isResetting) {
            Matter.Body.setVelocity(playerBody, { x: 0, y: playerBody.velocity.y });
            return;
        }
		
		 // --- HAZARD DEATH DETECTION ---
        let gotKilled = false;
        if (selectedIndex === 0) { // Local Player is Fire Boy
            // Dies in Water or Toxic Green Liquid
            if (activeLiquids.has('water') || activeLiquids.has('toxic')) {
                gotKilled = true;
            }
        } else if (selectedIndex === 1) { // Local Player is Water Girl
            // Dies in Fire (Lava) or Toxic Green Liquid
            if (activeLiquids.has('lava') || activeLiquids.has('toxic')) {
                gotKilled = true;
            }
        }

        if (gotKilled) {
            triggerDeathReset();
        }
		
		// --- Dynamic Button Spring Sinking ---
        for (let id in gameButtons) {
            const btn = gameButtons[id];
            let isLocallyPressed = false;

            // 1. Check if Local Player is standing on the button
            const pDx = Math.abs(playerBody.position.x - btn.position.x);
            const pDy = playerBody.position.y - btn.position.y;
            if (pDx < 48 && pDy > -42 && pDy < -25) {
                isLocallyPressed = true;
            }

            // 2. Check if any Box is standing on the button
            for (let bId in gameBoxes) {
                const box = gameBoxes[bId];
                const bDx = Math.abs(box.position.x - btn.position.x);
                const bDy = box.position.y - btn.position.y;
                if (bDx < 48 && bDy > -42 && bDy < -25) {
                    isLocallyPressed = true;
                }
            }

            // FIXED: Removed remote player coordinates loop to prevent circular network echoes

            // Combine local checks with remote network triggers
            const isPressed = isLocallyPressed || btn.networkPressed;
            const targetY = isPressed ? btn.initialY + 15 : btn.initialY; 

            // State transition checks
            if (isPressed && !btn.isPressed) {
                btn.isPressed = true;
                console.log(`Button PRESSED - ID: ${btn.buttonId} | Color: ${btn.color.toUpperCase()}`);
                
                // FIXED: Only broadcast to the server if the press occurred LOCALLY on our machine
                if (isLocallyPressed && socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'buttonPress', id: btn.buttonId, pressed: true }));
                }
            } else if (!isPressed && btn.isPressed) {
                btn.isPressed = false;
                console.log(`Button RELEASED - ID: ${btn.buttonId} | Color: ${btn.color.toUpperCase()}`);
                
                // FIXED: Only broadcast to the server if the release occurred LOCALLY on our machine
                if (!isLocallyPressed && socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'buttonPress', id: btn.buttonId, pressed: false }));
                }
            }

            // Smoothly compress/rebound the physical spring body position
            const dy = targetY - btn.position.y;
            if (Math.abs(dy) > 0.1) {
                Matter.Body.setPosition(btn, { x: btn.position.x, y: btn.position.y + (dy * 0.25) });
            }
        }
		
		// --- Dynamic Lever Contact Pushing ---
		
		for (let id in gameLevers) {
            const lever = gameLevers[id];
            
            // Combine local state with remote network updates
            const isPressed = lever.isPressed || lever.networkPressed;

            // State transition checks (Sends network update and prints console log exactly once)
            if (isPressed && !lever.isPressedLocalState) {
                lever.isPressedLocalState = true;
                lever.isPressed = true; // Lock state
                console.log(`Lever FLIPPED [ACTIVE] - ID: ${lever.leverId} | Color: ${lever.color.toUpperCase()}`);
                
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'leverToggle', id: lever.leverId, pressed: true }));
                }
            } else if (!isPressed && lever.isPressedLocalState) {
                lever.isPressedLocalState = false;
                lever.isPressed = false; // Lock state
                console.log(`Lever FLIPPED [INACTIVE] - ID: ${lever.leverId} | Color: ${lever.color.toUpperCase()}`);
                
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'leverToggle', id: lever.leverId, pressed: false }));
                }
            }

            // Interpolate visual angle smoothly
            const targetAngle = lever.isPressed ? -0.5 : 0.5;
            lever.angle += (targetAngle - lever.angle) * 0.15;

            // Aligns the solid physical handle body bounds with the current rotation angle
            if (lever.handleBody) {
                const pivotX = lever.position.x;
                const pivotY = lever.position.y + 15; 
                const halfLength = 27.5; 

                const nextCenterX = pivotX + Math.sin(lever.angle) * halfLength;
                const nextCenterY = pivotY - Math.cos(lever.angle) * halfLength;

                // Reposition, rotate, and dynamically toggle ramp orientation
                Matter.Body.setPosition(lever.handleBody, { x: nextCenterX, y: nextCenterY });
                Matter.Body.setAngle(lever.handleBody, lever.angle);
                lever.handleBody.slopeType = lever.isPressed ? 'slope_rl' : 'slope_lr';
            }
        }

		for (let id in gameDoors) {
            const door = gameDoors[id];
            
            // Check if any button matching this door's color is currently pressed
            let isTriggered = false;
            for (let bId in gameButtons) {
                const btn = gameButtons[bId];
                if (btn.color === door.color && btn.isPressed) {
                    isTriggered = true;
                    break;
                }
            }
            if (!isTriggered) {
                for (let lId in gameLevers) {
                    const lever = gameLevers[lId];
                    if (lever.color === door.color && lever.isPressed) {
                        isTriggered = true;
                        break;
                    }
                }
            }
			

            // Determine target coordinates (Sinks/slides when triggered, returns when released)
            const destX = isTriggered ? door.targetX : door.initialX;
            const destY = isTriggered ? door.targetY : door.initialY;

            // Calculate directional vector and distance to target
            const dx = destX - door.position.x;
            const dy = destY - door.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.1) {
                let stepX = 0;
                let stepY = 0;
                const slideSpeed = 3; 

                if (dist <= slideSpeed) {
                    stepX = destX - door.position.x;
                    stepY = destY - door.position.y;
                } else {
                    stepX = (dx / dist) * slideSpeed;
                    stepY = (dy / dist) * slideSpeed;
                }
				
				// --- PLATFORM RIDING LOGIC ---
                
                // 1. Check if Local Player is standing on top of this door
                const pDx = Math.abs(playerBody.position.x - door.position.x);
                const pDy = playerBody.position.y - door.position.y;
                const playerTopOffset = -door.doorHeight / 2;

                const playerIsRiding = (pDx < door.doorWidth / 2 + 10) && 
                                       (pDy > playerTopOffset - 35 && pDy < playerTopOffset - 15);

                if (playerIsRiding) {
                    // Carry player position along with the platform displacement
                    Matter.Body.setPosition(playerBody, { 
                        x: playerBody.position.x + stepX, 
                        y: playerBody.position.y + stepY 
                    });
                }

                // 2. Check if any Box is standing on top of this door
                for (let bId in gameBoxes) {
                    const box = gameBoxes[bId];
                    const bDx = Math.abs(box.position.x - door.position.x);
                    const bDy = box.position.y - door.position.y;
                    const boxTopOffset = -door.doorHeight / 2;

                    const boxIsRiding = (bDx < door.doorWidth / 2 + 10) && 
                                         (bDy > boxTopOffset - 35 && bDy < boxTopOffset - 15);

                    if (boxIsRiding) {
                        // Carry box position along with the platform displacement
                        Matter.Body.setPosition(box, { 
                            x: box.position.x + stepX, 
                            y: box.position.y + stepY 
                        });
                    }
                }


                // Programmatically move the solid static body
                Matter.Body.setPosition(door, { 
                    x: door.position.x + stepX, 
                    y: door.position.y + stepY 
                });
            }
        }

        let maxSpeed = 6;      // Maximum self-powered walking speed
        let accel = 0.25;         // How quickly you reach top speed
        let dragGround = 0.88;  // Deceleration when stopping on ground (restored to 0.88)
        let dragAir = 0.99;     // Very low drag in air
		
		const inLiquid = activeLiquids.size > 0;

        // Apply water resistance / viscosity
        if (inLiquid) {
            maxSpeed = 3;        // Capped walking speed in water
            accel = 0.12;        // Slower movement build-up
            dragGround = 0.70;   // Strong fluid drag on ground
            dragAir = 0.70;      // Strong fluid drag while floating
        }

        let currentVelocity = playerBody.velocity;
        let targetVx = currentVelocity.x;
		let targetVy = currentVelocity.y; 
		
		if (Math.abs(currentVelocity.x) > maxSpeed) {
            localSpeedX = currentVelocity.x;
        }
		
        if (keys.Left) {
			facingDirection = -1;
            // Accelerate our running power leftwards independently of physical collisions
            localSpeedX = Math.max(-maxSpeed, localSpeedX - accel);
            
            if (activeSlopeType === 'slope_rl' && isGrounded) {
                targetVy = localSpeedX; 
            }
        } 
        else if (keys.Right) {
			facingDirection = 1;
            // Accelerate our running power rightwards independently of physical collisions
            localSpeedX = Math.min(maxSpeed, localSpeedX + accel);
            
            if (activeSlopeType === 'slope_lr' && isGrounded) {
                targetVy = -localSpeedX; 
            }
        } 
        else {
            // Smoothly decelerate our local accumulator when no keys are pressed
            const activeDrag = isGrounded ? dragGround : dragAir;
            localSpeedX *= activeDrag;
            
            if (Math.abs(localSpeedX) < 0.05) localSpeedX = 0;
        }

		targetVx = localSpeedX;
        Matter.Body.setVelocity(playerBody, { x: targetVx, y: targetVy  });

		 // --- Apply Buoyancy (Cushions falling speed when submerged in water) ---
        if (inLiquid && playerBody.velocity.y > 1.5) {
            // Smoothly damp downward vertical speed to simulate sinking slowly
            Matter.Body.setVelocity(playerBody, { 
                x: playerBody.velocity.x, 
                y: playerBody.velocity.y * 0.85 
            });
        }
		
		submergedBoxes.forEach(box => {
            // Apply horizontal viscous drag and upward buoyancy on the box body
            Matter.Body.setVelocity(box, { 
                x: box.velocity.x * 0.90, 
                y: box.velocity.y * 0.85 
            });
        });
		
		submergedProjectiles.forEach(proj => {
            // Smoothly damp horizontal flight and vertical gravity speed inside the pool
            Matter.Body.setVelocity(proj, { 
                x: proj.velocity.x * 0.90, 
                y: proj.velocity.y * 0.85 
            });
        });

        // --- Smoothly Interpolate (Slide) Other Players ---
       for (let id in otherPlayers) {
            const remoteBody = otherPlayers[id];
            if (remoteBody && remoteBody.targetX !== undefined) {
				
                // FIXED: Only skip network sync if we are ACTIVELY trying to move/push them.
                // If we are standing still, always let the network update them so they can move away freely!
                const isLocalPlayerMoving = keys.Left || keys.Right || Math.abs(localSpeedX) > 0.1;
                
                if (collidingPlayers.has(id) && isLocalPlayerMoving) {
                    continue; 
                }
				
                let dx = remoteBody.targetX - remoteBody.position.x;
                let dy = remoteBody.targetY - remoteBody.position.y;

                if (Math.abs(dx) > 150 || Math.abs(dy) > 150) {
                    Matter.Body.setPosition(remoteBody, { x: remoteBody.targetX, y: remoteBody.targetY });
                } else {
                    const lerpFactor = 0.25;
                    
                    Matter.Body.setVelocity(remoteBody, { 
                        x: dx * lerpFactor, 
                        y: dy * lerpFactor 
                    });
                    
                    Matter.Body.setPosition(remoteBody, { 
                        x: remoteBody.position.x + (dx * lerpFactor), 
                        y: remoteBody.position.y + (dy * lerpFactor) 
                    });
                }
            }
        }

        // --- Rate-Limit & Optimize Outgoing Updates ---
        networkTick++;
        if (networkTick % 3 === 0) {
            // Check if we have moved significantly since the last sent coordinate
            const movedDistanceX = Math.abs(playerBody.position.x - lastSentX);
            const movedDistanceY = Math.abs(playerBody.position.y - lastSentY);

            // Only allocate memory & send packet if player moved more than 0.2 pixels
            if (movedDistanceX > 0.2 || movedDistanceY > 0.2) {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'update',
                        x: playerBody.position.x,
                        y: playerBody.position.y,
						facing: facingDirection,
						moving: keys.Left || keys.Right
                    }));
                    // Record our last sent coordinates
                    lastSentX = playerBody.position.x;
                    lastSentY = playerBody.position.y;
                }
            }
			
			
			if (collidingBoxes.size > 0) {
				const boxUpdates = [];
				collidingBoxes.forEach(id => {
					const box = gameBoxes[id];
					if (box) {
						boxUpdates.push({
							id: id,
							x: box.position.x,
							y: box.position.y,
							angle: box.angle
						});
					}
				});

				socket.send(JSON.stringify({
					type: 'boxUpdate',
					boxes: boxUpdates
				}));
			}
        }
    });
	
	Events.on(engine, 'afterUpdate', () => {
        if (!playerBody) return;

        // Collect positions of the local player and all visible remote players
        let positions = [playerBody.position];
        for (let id in otherPlayers) {
            positions.push(otherPlayers[id].position);
        }

        // Find the bounding box that contains all players
        let minX = Math.min(...positions.map(p => p.x));
        let maxX = Math.max(...positions.map(p => p.x));
        let minY = Math.min(...positions.map(p => p.y));
        let maxY = Math.max(...positions.map(p => p.y));

        // Calculate the center point and dimensions of the bounding box
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const spanX = maxX - minX;
        const spanY = maxY - minY;

        // Viewport padding and bounds limits
        const minCamWidth = 1000;   // Minimum zoom-in width
        const minCamHeight = 600;   // Minimum zoom-in height
        const paddingX = 400;       // Horizontal safety margin around players
        const paddingY = 300;       // Vertical safety margin around players

        // Calculate required camera frame size based on player dispersion
        let targetWidth = Math.max(minCamWidth, spanX + paddingX);
        let targetHeight = Math.max(minCamHeight, spanY + paddingY);

        // Keep viewport aspect ratio locked to 1000:600
        const aspectRatio = 1000 / 600;
        if (targetWidth / targetHeight > aspectRatio) {
            targetHeight = targetWidth / aspectRatio;
        } else {
            targetWidth = targetHeight * aspectRatio;
        }

        // Apply camera bounds to the renderer
        Render.lookAt(render, {
            min: { x: centerX - targetWidth / 2, y: centerY - targetHeight / 2 },
            max: { x: centerX + targetWidth / 2, y: centerY + targetHeight / 2 }
        });
    });
	
    // 7. Initialize Inputs
    setupControls();
}

// --- Control Mapping (Desktop & Mobile) ---
function setupControls() {
	
	const canvas = document.getElementById('game-canvas');
    // A. Keyboard Listeners (Laptop)
    window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.Left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.Right = true;
        if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW')) {
            jump();
        }
		// Play the sound on both players' machines when pressing the '1' key
        if (e.code === 'Digit1' || e.code === 'Numpad1') playSoundAndSync('sound1');
        if (e.code === 'Digit2' || e.code === 'Numpad2') playSoundAndSync('sound2');
        if (e.code === 'Digit3' || e.code === 'Numpad3') playSoundAndSync('sound3');
		if (e.code === 'Digit4' || e.code === 'Numpad4') {
            sendJumpscareToServer();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.Left = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.Right = false;
    });

    // B. Touch Button Listeners (iPhone / Touch Devices)
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump = document.getElementById('btn-jump');

    // Left Button Touch Events
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.Left = true; });
    btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.Left = false; });

    // Right Button Touch Events
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.Right = true; });
    btnRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.Right = false; });

    // Jump Button Touch Event
    btnJump.addEventListener('touchstart', (e) => { 
        e.preventDefault(); 
        jump(); 
    });
	
	function getMouseWorldPosition(e) {
        if (!activeCameraMatrix) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        // Get mouse position relative to the canvas element boundary
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        // Account for internal canvas buffering resolution vs physical CSS element stretch
        const canvasX = sx * (canvas.width / rect.width);
        const canvasY = sy * (canvas.height / rect.height);

        try {
            // Invert the camera matrix to translate screen-space back to world-space
            const inverseMatrix = activeCameraMatrix.inverse();
            const screenPoint = new DOMPoint(canvasX, canvasY);
            const worldPoint = screenPoint.matrixTransform(inverseMatrix);

            return {
                x: worldPoint.x,
                y: worldPoint.y
            };
        } catch (err) {
            console.error("Matrix inversion failed:", err);
            return { x: 0, y: 0 };
        }
    }

    canvas.addEventListener('pointerdown', (e) => {
        const mouseWorld = getMouseWorldPosition(e);
        
        // Calculate dynamic, zoom-aware click tolerance (maintains a constant physical tap size on screen)
        const camWidth = render.bounds.max.x - render.bounds.min.x;
        const zoomFactor = camWidth / 1000; // 1.0 at standard zoom, larger when zoomed out
        const scaledTolerance = 45 * zoomFactor; // Scales up to match your visual size on screen

        // Check if player clicked/touched inside their scaled character boundaries
        const distToPlayer = Math.hypot(mouseWorld.x - playerBody.position.x, mouseWorld.y - playerBody.position.y);
        
        if (distToPlayer < scaledTolerance) {
            isAiming = true;
            aimStart = { x: playerBody.position.x, y: playerBody.position.y };
            aimCurrent = { x: mouseWorld.x, y: mouseWorld.y };
            canvas.setPointerCapture(e.pointerId); // Forces tracking even if dragging off-canvas
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!isAiming) return;
        const mouseWorld = getMouseWorldPosition(e);
        aimCurrent = { x: mouseWorld.x, y: mouseWorld.y };
    });

    canvas.addEventListener('pointerup', (e) => {
        if (!isAiming) return;
        isAiming = false;
        canvas.releasePointerCapture(e.pointerId);

        // Fire the projectile!
        fireProjectile(launchVx, launchVy);
		console.log('hi');
    });

    
}

function jump() {
    if (playerBody && isGrounded) {
        // Apply upward velocity
        Matter.Body.setVelocity(playerBody, { x: playerBody.velocity.x, y: -12 });
        isGrounded = false; // Prevent multi-jumps before collision update
    }
}

function playSoundAndSync(soundId) {
    const sound = sounds[soundId];
    if (!sound) return;

    // 1. Play locally
    sound.currentTime = 0;
    sound.play().catch(e => console.log("Playback blocked:", e));

    // 2. Sync to other player
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'playAudio',
            soundId: soundId // Pass the specific ID
        }));
    }
}

function sendJumpscareToServer() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'jumpscare'
        }));
    }
}

function executeJumpscareLocally() {
    const overlay = document.getElementById('jumpscare-overlay');
    const scream = sounds['jumpscare'];
    
    if (overlay && scream) {
        // 1. Play scream immediately
        scream.currentTime = 0;
        scream.play().catch(e => console.log("Audio blocked:", e));

        // 2. Flash fullscreen image on top
        overlay.classList.remove('hidden');

        // 3. Hide after 1.5 seconds and reset
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 1500);
    }
}

// Add to the bottom of public/client.js
// Helper to create a clipping path matching the dynamic, waving surface of a liquid pool
function clipToPoolSurface(ctx, pool) {
    ctx.beginPath();
    ctx.moveTo(pool.x, pool.y + pool.height); // Bottom-Left
    ctx.lineTo(pool.springs[0].x, pool.springs[0].currentY); // Top-Left (first spring)

    // Trace across the waving surface
    for (let i = 1; i < pool.springs.length; i++) {
        ctx.lineTo(pool.springs[i].x, pool.springs[i].currentY);
    }

    ctx.lineTo(pool.x + pool.width, pool.y + pool.height); // Bottom-Right
    ctx.closePath();
    ctx.clip(); // Restrict all future drawing to this shape
}

// Add to the bottom of public/client.js
// Generates a pixel-perfect solid color mask matching the slime's current frame
function generateTintedFrame(sx, sy, width, height, color) {
    tintCanvas.width = width;
    tintCanvas.height = height;
    tintCtx.clearRect(0, 0, width, height);
    
    // 1. Draw the active slime animation frame onto the offscreen canvas
    tintCtx.drawImage(slimeSprite, sx, sy, width, height, 0, 0, width, height);
    
    // 2. Fill ONLY the non-transparent pixels with the target liquid color
    tintCtx.globalCompositeOperation = 'source-in';
    tintCtx.fillStyle = color;
    tintCtx.fillRect(0, 0, width, height);
}

// Compiles and launches the projectile body
function fireProjectile(vx, vy) {
    // 1. Spawn locally
    spawnLocalProjectile(playerBody.position.x, playerBody.position.y, vx, vy, selectedIndex);

    // 2. Synchronize to the other player over the network
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'spawnProjectile',
            x: playerBody.position.x,
            y: playerBody.position.y,
            vx: vx,
            vy: vy,
            launcherIndex: selectedIndex
        }));
    }
}

// Spawns and configures the physical circular projectile
function spawnLocalProjectile(x, y, vx, vy, launcherIndex) {
    const { Bodies, Composite } = Matter;

    // Define target mask (Ignores the launcher, but collides with map, boxes, and the target player)
    const targetMask = CATEGORY_MAP | (launcherIndex === 0 ? CATEGORY_WATERGIRL : CATEGORY_FIREBOY);

    const projectile = Bodies.circle(x, y, 15, {
        isStatic: false,
        friction: 0.05,
        restitution: 0.5,
        density: 0.001,
        collisionFilter: {
            category: CATEGORY_PROJECTILE,
            mask: targetMask
        },
        render: {
            visible: false
        }
    });

    projectile.isProjectile = true;
    projectile.launcherIndex = launcherIndex;

    // Apply launching velocity force vector
    Matter.Body.setVelocity(projectile, { x: vx, y: vy });

    // Add to physical simulation
    Composite.add(engine.world, projectile);

    // Set 10-second automatic deletion timer
    setTimeout(() => {
        if (Composite.allBodies(engine.world).includes(projectile)) {
			submergedProjectiles.delete(projectile);
            Composite.remove(engine.world, projectile);
        }
    }, 10000);
}

// Applies backward/upward shockwave physics push on target impact
function applyShockwaveForce(targetBody, projectileBody) {
    const dx = targetBody.position.x - projectileBody.position.x;
    const dy = targetBody.position.y - projectileBody.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.1) {
        const blastSpeed = 4; // High-velocity physical push speed
        const vx = (dx / dist) * blastSpeed;
        const vy = (dy / dist) * blastSpeed - 4; // Adds a vertical lift vector of 4px

        // Set the physical velocity vector directly
        Matter.Body.setVelocity(targetBody, { x: vx, y: vy });
        
        // FIXED: If we got hit, sync our input accumulator immediately so the movement loop preserves the slide!
        if (targetBody === playerBody) {
            localSpeedX = vx;
        }
    }
}

function triggerDeathReset() {
    isResetting = true;

    // 1. Play 'anime-ahh' sound locally and sync it across the network
    playSoundAndSync('sound3'); 

    // 2. Notify the other player to trigger their reset countdown
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'playerDeath'
        }));
    }

    // 3. Reset the level locally after 1 second
    setTimeout(resetLevel, 1000);
}

// Resets all players, boxes, and buttons to their starting coordinates
function resetLevel() {
    // 1. Reset Local Player Position
    let spawnX = loadedMapData.width / 2;
    let spawnY = loadedMapData.height - 300;

    if (loadedMapData) {
        if (selectedIndex === 0 && loadedMapData.fireboySpawn) {
            spawnX = loadedMapData.fireboySpawn.x;
            spawnY = loadedMapData.fireboySpawn.y;
        } else if (selectedIndex === 1 && loadedMapData.watergirlSpawn) {
            spawnX = loadedMapData.watergirlSpawn.x;
            spawnY = loadedMapData.watergirlSpawn.y;
        }
    }

    Matter.Body.setPosition(playerBody, { x: spawnX, y: spawnY });
    Matter.Body.setVelocity(playerBody, { x: 0, y: 0 });
    localSpeedX = 0; // Reset movement speed accumulator

    // 2. Reset All Physical Boxes to initial coordinates
    for (let id in gameBoxes) {
        const box = gameBoxes[id];
        if (box) {
            Matter.Body.setPosition(box, { x: box.initialX, y: box.initialY });
            Matter.Body.setVelocity(box, { x: 0, y: 0 });
            Matter.Body.setAngle(box, 0); // Reset box rotation back to flat
            Matter.Body.setAngularVelocity(box, 0);
        }
    }

    // 3. Reset All Buttons back to unpressed state
    activePressedButtons.clear();
    activeLiquids.clear();
    submergedBoxes.clear();
	submergedProjectiles.clear();

    for (let id in gameButtons) {
        const btn = gameButtons[id];
        if (btn) {
            btn.isPressed = false;
            btn.networkPressed = false;
            // Snaps button back up to unpressed height
            Matter.Body.setPosition(btn, { x: btn.position.x, y: btn.initialY });
        }
    }
	
	// FIXED: 3.5 Reset All Sliding Doors back to their initial coordinates instantly
    for (let id in gameDoors) {
        const door = gameDoors[id];
        if (door) {
            Matter.Body.setPosition(door, { x: door.initialX, y: door.initialY });
        }
    }
	
	// 3.7 Reset All Levers back to unpressed (pointing right) state instantly
    for (let id in gameLevers) {
        const lever = gameLevers[id];
        if (lever) {
            lever.isPressed = false;
			lever.isPressedLocalState = false;
            lever.networkPressed = false;
            lever.angle = 0.5; // Reset visual handle rotation to point right
        }
    }

    // 4. Release inputs and restore active play state
    isResetting = false;
    console.log("Level reset successfully.");
}

if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-device');
}

// Initialize Menu on Startup
updateCharacterSelection();

