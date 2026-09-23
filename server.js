// server.js - Final Stabilized Production Server
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

// Clear security headers to allow the service worker to match browser scoping
app.use((req, res, next) => {
    res.setHeader('Service-Worker-Allowed', '/');
    next();
});

// Serve your root project folder files cleanly as static elements
app.use(express.static(__dirname));

// =========================================================================
// FIXED ROUTE: Resolves the infinite flashing loop
// =========================================================================
app.get('/service/*', (req, res) => {
    // Instead of forcing a blind window reload loop, this feeds the target 
    // context straight into the ultraviolet handler to display the site layout safely
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <script src="/uv.bundle.js"></script>
            <script src="/uv.config.js"></script>
            <script src="/uv.handler.js"></script>
            <script>
                async function registerAndRun() {
                    if ('serviceWorker' in navigator) {
                        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                        // Resolves the true location request directly without resetting the app iframe shell
                        window.location.href = window.location.href; 
                    }
                }
                if (!navigator.serviceWorker.controller) {
                    registerAndRun();
                }
            </script>
        </head>
        <body style="background:#0d1117;"></body>
        </html>
    `);
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
