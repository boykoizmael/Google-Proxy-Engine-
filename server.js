// server.js - Stable Traffic Pipeline Backend with Built-in Bare Gateway
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import wispServerPkg from 'wisp-server-node'; 
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createBareServer } from '@tomphttp/bare-server-node'; // Added fast local routing engine

const wispServer = wispServerPkg.wispServer || wispServerPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/'); // Mounts your private unblocking channel locally

app.use(express.static(__dirname));

// Host the Core Ultraviolet Dependency Files Locally
app.get('/uv.bundle.js', async (req, res) => {
    const src = await fetch('https://jsdelivr.net');
    res.type('application/javascript').send(await src.text());
});

app.get('/uv.handler.js', async (req, res) => {
    const src = await fetch('https://jsdelivr.net');
    res.type('application/javascript').send(await src.text());
});

// Fallback path handler to automatically register the background rewriter
app.get('/service/*', (req, res) => {
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

// Route network requests through either standard HTTP routing loops or the private Bare engine
server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.route(req, res);
    } else {
        app(req, res);
    }
});

// Configure the high-performance WebSocket proxy socket mapping pipeline for game streams
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
    console.log(`ShadowSearch Proxy engine online on Port: ${PORT}`);
});
