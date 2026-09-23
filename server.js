// server.js - Complete Fixed Code
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import wispServerPkg from 'wisp-server-node'; 
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch'; // Make sure this is installed or use global fetch if on Node 18+

const wispServer = wispServerPkg.wispServer || wispServerPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Serve frontend interface static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// ==========================================
// NEW: Express Proxy Pipeline Route Handler
// ==========================================
app.get('/service/*', async (req, res) => {
    try {
        // Extract the base64 string from the URL path
        const encodedTarget = req.params[0];
        if (!encodedTarget) {
            return res.status(400).send('Invalid Context Target Specified');
        }

        // Decode the URL (reversing the frontend btoa logic)
        let targetUrl = Buffer.from(encodedTarget.replace(/_/g, '/'), 'base64').toString('utf-8');

        // Clean up accidental bad parsing strings from previous frontend versions if any
        if (targetUrl.includes('|') || targetUrl.includes('{')) {
            targetUrl = targetUrl.split('|')[0].replace(/[{}]/g, '');
        }

        // Fetch the target website data on behalf of the client
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // Forward the website headers and status code back to your browser tab
        res.status(response.status);
        for (const [key, value] of response.headers.entries()) {
            // Skip headers that block embedding or conflict with our pipeline
            if (['content-security-policy', 'x-frame-options', 'content-encoding'].includes(key.toLowerCase())) continue;
            res.setHeader(key, value);
        }

        // Send the raw site content into your search engine iframe view pane
        const body = await response.text();
        res.send(body);

    } catch (err) {
        res.status(500).send('Pipeline Routing Resolution Failure: ' + err.message);
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
