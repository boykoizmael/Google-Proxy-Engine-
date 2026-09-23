// server.js - Final Production-Grade Fail-Safe Node Server
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

// Serve everything inside your root folder cleanly as static elements
app.use(express.static(__dirname));

// =========================================================================
// FIXED FALLBACK: Direct path catch-all to eliminate "Cannot GET" errors
// =========================================================================
app.use((req, res, next) => {
    if (req.path.startsWith('/service/')) {
        // Keeps the route open and serves the app container layout instead of crashing
        res.sendFile(join(__dirname, 'index.html'));
    } else {
        next();
    }
});

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Route active live HTTP web traffic requests through your data channel
server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, res);
    } else {
        app(req, res);
    }
});

// High-performance WebSocket proxy socket mapping pipeline for real-time multiplayer links
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
    console.log(`ShadowSearch running stable on Port: ${PORT}`);
});
