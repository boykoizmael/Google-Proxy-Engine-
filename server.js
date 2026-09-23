// server.js - Final Production-Grade Native Proxy Server
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import wispServerPkg from 'wisp-server-node'; 
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createBareServer } from '@tomphttp/bare-server-node';

const wispServer = wispServerPkg.wispServer || wispServerPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/');

// Set explicit security clearance headers so the browser allows the Service Worker to run
app.use((req, res, next) => {
    res.setHeader('Service-Worker-Allowed', '/');
    next();
});

// Serve everything inside your root folder as a direct static path asset
app.use(express.static(__dirname));

// Dynamic dependency fetch loops from official CDN blocks
const CDN = 'https://jsdelivr.net';

app.get('/uv/uv.bundle.js', async (req, res) => {
    const src = await fetch(CDN + 'uv.bundle.js');
    res.type('application/javascript').send(await src.text());
});

app.get('/uv/uv.handler.js', async (req, res) => {
    const src = await fetch(CDN + 'uv.handler.js');
    res.type('application/javascript').send(await src.text());
});

app.get('/uv/uv.sw.js', async (req, res) => {
    const src = await fetch(CDN + 'uv.sw.js');
    res.type('application/javascript').send(await src.text());
});

// REMOVED THE EMBEDDED /service/* FALLBACK THAT CAUSED THE DUPLICATION LOOP
// Your main site dashboard will now load cleanly on root
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Route primary HTTP data arrays
server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, res);
    } else {
        app(req, res);
    }
});

// WebSocket binding pipeline configurations for heavy multiplayer data games
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    if (bare.shouldRoute(request)) {
        bare.routeUpgrade(request, socket, head);
    } else if (new URL(request.url, `http://${request.headers.host}`).pathname === '/wisp/') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wispServer(ws, { blacklist: [], logRequests: false });
        });
    } else {
        socket.destroy();
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`ShadowSearch active on Port: ${PORT}`);
});
