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

// Serve everything natively inside the root workspace folder
app.use(express.static(__dirname));

// =========================================================================
// FIXED ROUTE: Direct Fallback to process localized configuration paths
// =========================================================================
app.get('/service/*', (req, res) => {
    // Serves an aligned loader to trigger registration scope clearance cleanly
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
                        await navigator.serviceWorker.register('/sw.js', { scope: __uv$config.prefix });
                        window.location.reload(); 
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

// Route primary HTTP data arrays through standard Express or Bare engine
server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, res);
    } else {
        app(req, res);
    }
});

// WebSocket binding pipeline configurations for heavy multiplayer games
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
