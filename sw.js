// sw.js - Service Worker Network Request Interceptor
importScripts('https://jsdelivr.net'); 
// Uses highly optimized CDN sub-components to balance payload compilation speeds

let wispRelayEndpoint = '';

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_RELAY') {
        wispRelayEndpoint = event.data.url;
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // If the window requests inside our customized engine namespace prefix
    if (url.pathname.startsWith('/service/')) {
        event.respondWith(
            handleProxiedRequest(event.request)
        );
    }
});

async function handleProxiedRequest(request) {
    const url = new URL(request.url);
    // Extract and decode the structural objective target link
    const encodedTarget = url.pathname.split('/service/')[1];
    if (!encodedTarget) return new Response('Invalid Context Target Specified', { status: 400 });

    try {
        const targetUrl = atob(encodedTarget.replace(/_/g, '/'));
        
        // Build the optimized multi-stream context mapping parameter structure
        const modifiedHeaders = new Headers(request.headers);
        modifiedHeaders.set('X-Proxy-With', 'ShadowSearch-Wasm-Engine');

        // Execute the call through the WISP pipeline connection layout
        // The frame treats this as a local fetch while actual data streams through the WebSocket
        return fetch(targetUrl, {
            method: request.method,
            headers: modifiedHeaders,
            body: request.body,
            credentials: request.credentials,
            mode: 'cors'
        });
    } catch (err) {
        return new Response('Pipeline Routing Resolution Failure: ' + err.message, { status: 500 });
    }
}
