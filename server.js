// server.js - High Performance WISP Relay Backend (Fixed for Node v24 Native Fetch)
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

// Serve frontend interface static files cleanly
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// ==================================================
// Wildcard Catch-All Express Proxy Route
// ==================================================
app.get('/service/*', async (req, res) => {
    try {
        // Extract everything following the /service/ path namespace prefix
        const encodedTarget = req.params[0];
        if (!encodedTarget) {
            return res.status(400).send('No target context URL provided.');
        }

        // Reconstruct the structural base64 string mapping orientation safely
        const base64Clean = encodedTarget.replace(/_/g, '/');
        const targetUrl = Buffer.from(base64Clean, 'base64').toString('utf-8');

        // Using Node v24 native global fetch engine
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
            }
        });

        // Set status response metrics
        res.status(response.status);

        // Pipe active headers smoothly while removing strict cross-origin blockers
        for (const [key, value] of response.headers.entries()) {
            if (['content-security-policy', 'x-frame-options', 'content-encoding'].includes(key.toLowerCase())) continue;
            res.setHeader(key, value);
        }

        const body = await response.text();
        res.send(body);

    } catch (err) {
        res.status(500).send('Proxy Routing Connection Crash: ' + err.message);
    }
});

// Configure the live high-performance WebSocket proxy socket mapping layer
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
    console.log(`ShadowSearch Proxy engine actively parsing on Port: ${PORT}`);
});
