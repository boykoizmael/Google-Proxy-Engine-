// server.js - Stable Production-Grade Native Proxy Server
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

// Explicit security clearance headers so the browser allows the Service Worker scope rules
app.use((req, res, next) => {
    res.setHeader('Service-Worker-Allowed', '/');
    next();
});

// Serve everything inside your root folder cleanly as static elements
app.use(express.static(__dirname));

// =========================================================================
// FIXED FALLBACK ROUTE: Eliminates the flash loop by serving index.html natively
// =========================================================================
app.get('/service/*', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
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

// WebSocket binding pipeline configurations for real-time multiplayer links
server.on('upgrade', (request, socket, head) => {
    if (bare.shouldRoute(request)) {
        bare.routeUpgrade(request, socket, head);
    } else {
        socket.destroy();
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`ShadowSearch running stable on Port: ${PORT}`);
});
