
// Character choices from the menu
const characters = [
    { name: "Fire Boy", color: "#e74c3c", glow: "rgba(231, 76, 60, 0.6)" },
    { name: "Water Girl", color: "#3498db", glow: "rgba(52, 152, 219, 0.6)" },
];

let loadedMapData = {
  "width": 3000,
  "height": 1200,
  "elements": [
    {
      "type": "ground",
      "x": 160,
      "y": 730,
      "width": 570,
      "height": 200
    },
    {
      "type": "ground",
      "x": 1180,
      "y": 730,
      "width": 620,
      "height": 230
    },
    {
      "type": "ground",
      "x": 730,
      "y": 820,
      "width": 520,
      "height": 170
    },
    {
      "type": "lava",
      "x": 730,
      "y": 730,
      "width": 450,
      "height": 90
    }
  ]
}

let selectedIndex = 0;
let socket = null;

//sounds
const sounds = {
    'sound1': new Audio('anime-ahh.mp3'),
    'sound2': new Audio('rizzbot-laugh.mp3'),
    'sound3': new Audio('fart-with-reverb.mp3'),
	'jumpscare': new Audio('jumpscare.mp3')
};

let myId = null;
const otherPlayers = {}; // Keep track of other players' Matter.js bodies
const collidingPlayers = new Set(); // Tracks IDs of other players we are currently touching
const activeLiquids = new Set(); // Tracks liquid hazard types ('water', 'lava', 'toxic') we are touching

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
	const gameWidth = 1000;
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
	// --- Custom Liquid Renderer (Draws animated waves in real-time) ---
    Events.on(render, 'afterRender', () => {
        const ctx = render.context;
        
        // 1. Start camera viewport transformation
        Render.startViewTransform(render);

        // Find all active bodies in the physical simulation
        const bodies = Matter.Composite.allBodies(engine.world);
        const liquids = bodies.filter(b => b.liquidType);

        liquids.forEach(body => {
            // Find top-left coordinates of the physical sensor box
            const lx = body.position.x - body.liquidWidth / 2;
            const ly = body.position.y - body.liquidHeight / 2;

            let fillColor, waveColor;
            if (body.liquidType === 'lava') {
                fillColor = 'rgba(231, 76, 60, 0.6)'; // Translucent Fire Red
                waveColor = '#e67e22';               // Solid Orange crest
            } else if (body.liquidType === 'water') {
                fillColor = 'rgba(52, 152, 219, 0.6)'; // Translucent Water Blue
                waveColor = '#3498db';               // Solid Cyan crest
            } else if (body.liquidType === 'toxic') {
                fillColor = 'rgba(46, 204, 113, 0.6)'; // Translucent Green
                waveColor = '#2ecc71';               // Solid Light Green crest
            }

            ctx.fillStyle = fillColor;
            ctx.strokeStyle = fillColor;
            ctx.lineWidth = 3;

            // 1. Draw Filled Wave shape
            ctx.beginPath();
            ctx.moveTo(lx, ly + body.liquidHeight);
            ctx.lineTo(lx, ly);

            const waveSpeed = Date.now() * 0.005;
            const waveHeight = 8;
            const waveDensity = 0.04;

            for (let px = lx; px <= lx + body.liquidWidth + 4; px += 4) {
                const currentX = Math.min(px, lx + body.liquidWidth);
                const pct = (currentX - lx) / body.liquidWidth;
                const clampFactor = Math.sin(pct * Math.PI); // Keep edges flat on platforms

                const py = ly + Math.sin((currentX * waveDensity) + waveSpeed) * waveHeight * clampFactor;
                ctx.lineTo(currentX, py);

                if (currentX === lx + body.liquidWidth) break;
            }

            ctx.lineTo(lx + body.liquidWidth, ly + body.liquidHeight);
            ctx.closePath();
            ctx.fill();

            // 2. Draw Top Crest Outline
            ctx.beginPath();
            for (let px = lx; px <= lx + body.liquidWidth + 4; px += 4) {
                const currentX = Math.min(px, lx + body.liquidWidth);
                const pct = (currentX - lx) / body.liquidWidth;
                const clampFactor = Math.sin(pct * Math.PI);

                const py = ly + Math.sin((currentX * waveDensity) + waveSpeed) * waveHeight * clampFactor;

                if (currentX === lx) {
                    ctx.moveTo(currentX, py);
                } else {
                    ctx.lineTo(currentX, py);
                }

                if (currentX === lx + body.liquidWidth) break;
            }
            ctx.stroke();
        });

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
                    { isStatic: true, render: { fillStyle: '#34495e' } }
                );
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
                
                // Attach custom properties to retrieve during drawing loop
                liquid.liquidType = el.type;
                liquid.liquidWidth = el.width;
                liquid.liquidHeight = el.height;

                platformsToCreate.push(liquid);
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
    playerBody = Bodies.circle(
        mapWidth / 2,            // Spawn in the horizontal center of the map
        mapHeight - 600,         // Spawn safely above the platform heights
        25, 
        {
			friction: 0,       // Disable native sliding friction
            frictionStatic: 0, // Disable native standing friction
            restitution: 0.1, 
            inertia: Infinity, 
            render: { fillStyle: playerColor }
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
            character: characters[selectedIndex]
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

        const remoteBody = Bodies.circle(
            playerData.x, 
            playerData.y, 
            25, 
            {
                isStatic: false, 
                inertia: Infinity, 
                friction: 0.05,
                restitution: 0.1,
                render: { fillStyle: playerData.character.color }
            }
        );
		
		// Attach network ID to identify this body during collisions
        remoteBody.playerId = playerData.id;

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
    });
    
    Events.on(engine, 'collisionActive', (event) => {
        checkGrounded(event);
        trackPlayerCollisions(event);
    });
    
    Events.on(engine, 'collisionEnd', (event) => {
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
            if (pair.bodyA === playerBody || pair.bodyB === playerBody) {
                let other = pair.bodyA === playerBody ? pair.bodyB : pair.bodyA;
                
                // Remove player from active collisions when we stop touching them
                if (other.playerId) {
                    collidingPlayers.delete(other.playerId);
                }
				// Stop tracking liquid contact when we exit a pool
                if (other.liquidType) {
                    activeLiquids.delete(other.liquidType);
                }
                isGrounded = false;
            }
        }
    });
	
	// Helper to register who we are currently pushing/touching
    function trackPlayerCollisions(event) {
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
            if (pair.bodyA === playerBody || pair.bodyB === playerBody) {
                let other = pair.bodyA === playerBody ? pair.bodyB : pair.bodyA;
                if (other.playerId) {
                    collidingPlayers.add(other.playerId);
                }
            }
        }
    }

    function checkGrounded(event) {
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
            
            if (pair.bodyA === playerBody || pair.bodyB === playerBody) {
                let other = pair.bodyA === playerBody ? pair.bodyB : pair.bodyA;
				
				// SKIP grounding logic if the object is a liquid hazard!
                if (other.liquidType) {
                    // Track that we are currently inside this liquid
                    activeLiquids.add(other.liquidType);
                    continue; 
                }
                
                // 1. Verify player is vertically above the top surface of the platform
                const isAbovePlatform = playerBody.position.y < other.bounds.min.y + 10;

                // 2. Verify player is horizontally aligned over the platform's top surface 
                // (We allow a small 10px buffer for landing on the very edge of the platform)
                const isHorizontallyAligned = (playerBody.position.x > other.bounds.min.x - 10) && 
                                              (playerBody.position.x < other.bounds.max.x + 10);

                // Both must be true to count as grounded
                if (isAbovePlatform && isHorizontallyAligned) {
                    isGrounded = true;
                }
            }
        }
    }

    let networkTick = 0;

    // 6. Game Loop Update (Movement Force, Smoothing, & Network Broadcast)
    Events.on(engine, 'beforeUpdate', () => {
        if (!playerBody) return;

        let maxSpeed = 8;      // Maximum self-powered walking speed
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

        if (keys.Left) {
            if (currentVelocity.x > -maxSpeed) {
                targetVx = Math.max(-maxSpeed, currentVelocity.x - accel);
            } else {
                targetVx *= dragAir; 
            }
        } else if (keys.Right) {
            if (currentVelocity.x < maxSpeed) {
                targetVx = Math.min(maxSpeed, currentVelocity.x + accel);
            } else {
                targetVx *= dragAir; 
            }
        } else {
            const activeDrag = isGrounded ? dragGround : dragAir;
            targetVx *= activeDrag;
            
            if (Math.abs(targetVx) < 0.05) targetVx = 0;
        }

        Matter.Body.setVelocity(playerBody, { x: targetVx, y: currentVelocity.y });

		 // --- Apply Buoyancy (Cushions falling speed when submerged in water) ---
        if (inLiquid && playerBody.velocity.y > 1.5) {
            // Smoothly damp downward vertical speed to simulate sinking slowly
            Matter.Body.setVelocity(playerBody, { 
                x: playerBody.velocity.x, 
                y: playerBody.velocity.y * 0.85 
            });
        }

        // --- Smoothly Interpolate (Slide) Other Players ---
        for (let id in otherPlayers) {
            const remoteBody = otherPlayers[id];
            if (remoteBody && remoteBody.targetX !== undefined) {
				
				// SKIP network position overrides if we are actively pushing them!
                // This lets Matter.js handle the collision physics naturally.
				if (collidingPlayers.has(id)) {
                    continue; 
                }
				
                let dx = remoteBody.targetX - remoteBody.position.x;
                let dy = remoteBody.targetY - remoteBody.position.y;

                // Teleport if too far to prevent extreme rubberbanding (e.g. on spawn)
                if (Math.abs(dx) > 150 || Math.abs(dy) > 150) {
                    Matter.Body.setPosition(remoteBody, { x: remoteBody.targetX, y: remoteBody.targetY });
                } else {
                    // Slide 25% closer to their true server coordinates every frame
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
                        y: playerBody.position.y
                    }));
                    // Record our last sent coordinates
                    lastSentX = playerBody.position.x;
                    lastSentY = playerBody.position.y;
                }
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

if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-device');
}

// Initialize Menu on Startup
updateCharacterSelection();

