// server.js - High Performance WISP Relay Backend (Fixed ESM Imports)
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import wispServerPkg from 'wisp-server-node'; // Import the full CommonJS package object
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Extract the required server handler from the package default export object
const wispServer = wispServerPkg.wispServer || wispServerPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Serve your frontend interface static code files cleanly
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Configure the live high-performance WebSocket proxy socket mapping layer
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    if (pathname === '/wisp/') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wispServer(ws, {
                blacklist: [], // Add domains here if you wish to implement custom blocking filters
                logRequests: false
            });
        });
    } else {
        socket.destroy();
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`ShadowSearch Proxy engine actively parsing on Port: ${PORT}`);
});
