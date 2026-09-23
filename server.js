// server.js - Stable Backend Matrix
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
