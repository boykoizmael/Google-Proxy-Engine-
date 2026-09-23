// server.js - Integrated Proxy Search Engine Module Server
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

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// ==================================================
// FIXED: Live Search Aggregator Engine API
// ==================================================
app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Missing query parameters' });

        // Querying an open HTML search node endpoint interface
        const rawFeed = await fetch(`https://duckduckgo.com{encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const htmlText = await rawFeed.text();

        const compiledResults = [];
        
        // Robust string extractor loop to grab raw URLs and descriptive snippets
        const urlMatches = htmlText.match(/<a class="result__url" href="([^"]+)"/g) || [];
        const snippetMatches = htmlText.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g) || [];
        
        for (let i = 0; i < Math.min(urlMatches.length, 10); i++) {
            try {
                let rawUrl = urlMatches[i].match(/href="([^"]+)"/)[1];
                
                // Strip the tracking routing redirections out cleanly
                if (rawUrl.includes('uddg=')) {
                    rawUrl = decodeURIComponent(rawUrl.split('uddg=')[1].split('&')[0]);
                }
                
                let snippet = snippetMatches[i] ? snippetMatches[i].replace(/<[^>]*>/g, '').trim() : '';
                let parsedTitle = new URL(rawUrl).hostname.replace('www.', '');

                compiledResults.push({
                    title: parsedTitle.toUpperCase(),
                    url: rawUrl,
                    snippet: snippet || "Click to launch this web endpoint inside the custom unblocked proxy runtime container."
                });
            } catch(e) {}
        }

        res.json({ results: compiledResults });
    } catch(err) {
        res.status(500).json({ error: 'Search Engine parsing error', details: err.message });
    }
});

// ==================================================
// Hex-Decoded Proxy Route Content Interceptor
// ==================================================
app.get('/service/*', async (req, res) => {
    try {
        // Correctly isolates the exact matching parameter string index from the wildcard character (*)
        const hexTarget = req.params[0]; 
        if (!hexTarget) return res.status(400).send('No target context URL provided.');

        // Decompile Hex string back into target clean web layout domain
        const targetUrl = Buffer.from(hexTarget, 'hex').toString('utf-8');
        const targetOrigin = new URL(targetUrl).origin;

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });

        res.status(response.status);

        for (const [key, value] of response.headers.entries()) {
            if (['content-security-policy', 'x-frame-options', 'content-encoding'].includes(key.toLowerCase())) continue;
            res.setHeader(key, value);
        }

        let body = await response.text();

        // Force browser frames to look up relative assets directly via base injections
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
    console.log(`ShadowSearch Dashboard Engine active on Port: ${PORT}`);
});
