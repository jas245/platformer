const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Keep track of connected players
const players = {};

wss.on('connection', (ws) => {
    // Generate a unique ID for the connected player
    const playerId = Math.random().toString(36).substr(2, 9);
    console.log(`Player connected: ${playerId}`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'join') {
                // Save player metadata with dynamic starting coordinates sent by client
                players[playerId] = {
                    id: playerId,
                    character: data.character,
					charIndex: data.charIndex,
                    x: data.x || 400,
                    y: data.y || 100
                };
                
                // 1. Tell the new player their own ID and send existing players
                ws.send(JSON.stringify({ type: 'welcome', id: playerId, players }));

                // 2. Broadcast to everyone else that a new player joined
                broadcast(JSON.stringify({ type: 'playerJoined', player: players[playerId] }), ws);
            }

            if (data.type === 'update') {
                // Update player position in database
                if (players[playerId]) {
                    players[playerId].x = data.x;
                    players[playerId].y = data.y;
					players[playerId].facing = data.facing;
					players[playerId].moving = data.moving;
                    
                    // Broadcast updated position to all other players
                    broadcast(JSON.stringify({ type: 'playerMoved', id: playerId, x: data.x, y: data.y, facing: data.facing, moving: data.moving   }), ws);
                }
            }
			
			if (data.type === 'boxUpdate') {
                // Broadcast box positions and angles to the other client
                broadcast(JSON.stringify({ type: 'boxUpdate', boxes: data.boxes }), ws);
            }
			
			if (data.type === 'buttonPress') {
                // Broadcast button state change to the other client
                broadcast(JSON.stringify({ type: 'buttonPress', id: data.id, pressed: data.pressed }), ws);
            }
			
			if (data.type === 'spawnProjectile') {
                // Broadcast projectile spawn data to the other player
                broadcast(JSON.stringify({ 
                    type: 'spawnProjectile', 
                    x: data.x, 
                    y: data.y, 
                    vx: data.vx, 
                    vy: data.vy, 
                    launcherIndex: data.launcherIndex 
                }), ws);
            }
			
			if (data.type === 'playerDeath') {
                // Broadcast death reset trigger to the other client
                broadcast(JSON.stringify({ type: 'playerDeath' }), ws);
            }
			
			if (data.type === 'playAudio') {
                // Broadcast to everyone else on the server
                broadcast(JSON.stringify({ type: 'playAudio', soundId: data.soundId }), ws);
            }
			
			if (data.type === 'jumpscare') {
                // Broadcast specifically to the OTHER player
                broadcast(JSON.stringify({ type: 'jumpscare' }), ws);
            }
			
        } catch (e) {
            console.error("Error processing message: ", e);
        }
    });

    ws.on('close', () => {
        console.log(`Player disconnected: ${playerId}`);
        delete players[playerId];
        // Notify other clients about the disconnection
        broadcast(JSON.stringify({ type: 'playerLeft', id: playerId }));
    });
});

// Helper function to send messages to all clients except the sender
function broadcast(message, senderWs) {
    wss.clients.forEach((client) => {
        if (client !== senderWs && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});