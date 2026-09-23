// sw.js - Clean Script Router Mapping
importScripts('/uv.bundle.js');
importScripts('/uv.config.js');
importScripts('https://jsdelivr.net');

const uv = new UVServiceWorker();

self.addEventListener('fetch', (event) => {
    if (event.request.url.startsWith(self.location.origin + __uv$config.prefix)) {
        event.respondWith(uv.fetch(event));
    }
});
