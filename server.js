// server.js - Final Stable Hex-Based Routing
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
// Hex-Decoded Fail-Safe Express Proxy Route 
// ==================================================
app.get('/service/*', async (req, res) => {
    try {
        // req.params[0] extracts exactly what matches the asterisk (*) wildcard character
        const hexTarget = req.params[0]; 
        if (!hexTarget) {
            return res.status(400).send('No target context URL provided.');
        }

        // Convert the hex string back into a real URL safely
        const targetUrl = Buffer.from(hexTarget, 'hex').toString('utf-8');
        const targetOrigin = new URL(targetUrl).origin;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
            }
        });

        // Set status response metrics
        res.status(response.status);

        // Forward headers while stripping strict cross-origin restrictions
        for (const [key, value] of response.headers.entries()) {
            if (['content-security-policy', 'x-frame-options', 'content-encoding'].includes(key.toLowerCase())) continue;
            res.setHeader(key, value);
        }

        let body = await response.text();

        // Inject the base path tag right below the head marker
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
