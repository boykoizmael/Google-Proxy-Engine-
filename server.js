// server.js - Upgraded Asset Routing Module
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
// Asset-Injecting Express Proxy Route 
// ==================================================
app.get('/service/*', async (req, res) => {
    try {
        const encodedTarget = req.params[0]; // Captures the exact route remainder payload string
        if (!encodedTarget) {
            return res.status(400).send('No target context URL provided.');
        }

        // Reconstruct the structural base64 string safely
        const base64Clean = encodedTarget.replace(/_/g, '/');
        const targetUrl = Buffer.from(base64Clean, 'base64').toString('utf-8');

        // Parse root domain parameters to configure relative fallback loops
        const targetOrigin = new URL(targetUrl).origin;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        res.status(response.status);

        // Forward headers while stripping strict cross-origin blockers
        for (const [key, value] of response.headers.entries()) {
            if (['content-security-policy', 'x-frame-options', 'content-encoding'].includes(key.toLowerCase())) continue;
            res.setHeader(key, value);
        }

        let body = await response.text();

        // INJECTION: Insert a base URL declaration right below the <head> tag
        // This forces relative asset paths (/js/app.js) to load directly from the source domain
        const baseTag = `<head><base href="${targetOrigin}/">`;
        if (body.toLowerCase().includes('<head>')) {
            body = body.replace(/<head>/i, baseTag);
        } else if (body.toLowerCase().includes('<html>')) {
            body = body.replace(/<html>/i, `<html>${baseTag}`);
        } else {
            body = baseTag + body;
        }

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
