// uv.config.js - Custom Configuration Map
self.__uv$config = {
    prefix: '/service/',
    bare: 'https://workers.dev', // Public fallback bare instance to decode game engines
    encodeUrl: function(url) {
        if (!url) return url;
        return encodeURIComponent(url);
    },
    decodeUrl: function(url) {
        if (!url) return url;
        return decodeURIComponent(url);
    },
    handler: '/uv.handler.js',
    bundle: '/uv.bundle.js',
    config: '/uv.config.js',
    sw: '/sw.js'
};
