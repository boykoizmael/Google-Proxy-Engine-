// server.js - Stable Backend Matrix with Service Worker Fallback Activator
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import wispServerPkg from 'wisp-server-node'; 
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const wispServer = wispServerPkg.wispServer || wispServerPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Serve your root project folder files cleanly
app.use(express.static(__dirname));

// Host Core Ultraviolet dependency file structures locally
app.get('/uv.bundle.js', async (req, res) => {
    const src = await fetch('https://jsdelivr.net');
    res.type('application/javascript').send(await src.text());
});

app.get('/uv.handler.js', async (req, res) => {
    const src = await fetch('https://jsdelivr.net');
    res.type('application/javascript').send(await src.text());
});

// ==========================================================
// FIXED FAIL-SAFE: Wakes up the service worker if it sleeps
// ==========================================================
app.get('/service/*', (req, res) => {
    // If the browser lands here, it means the service worker fell asleep.
    // This small HTML script forces the worker to activate and instantly refreshes the page into the proxy.
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Waking up Proxy Engine...</title>
            <script src="/uv.bundle.js"></script>
            <script src="/uv.config.js"></script>
        </head>
        <body style="background:#0d1117; color:#58a6ff; font-family:sans-serif; text-align:center; padding-top:100px;">
            <h3>Initializing Network Sandbox Security Components...</h3>
            <p style="color:#c9d1d9;">Please wait a moment while we map your proxy connection pipeline.</p>
            <script>
                async function wakeWorker() {
                    if ('serviceWorker' in navigator) {
                        await navigator.serviceWorker.register('/sw.js', { scope: __uv$config.prefix });
                        // Smoothly reload the broken tab now that the gateway is officially open
                        location.reload();
                    }
                }
                wakeWorker();
            </script>
        </body>
        </html>
    `);
});

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Configure the high-performance WebSocket proxy socket mapping pipeline
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    if (pathname === '/wisp/') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wispServer(ws, {
                blacklist: [],
                logRequests: false
            });
        });
    } else {
        socket.destroy();
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`ShadowSearch Proxy engine online on Port: ${PORT}`);
});
