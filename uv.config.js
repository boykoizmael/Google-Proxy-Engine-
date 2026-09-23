// uv.config.js - High Stability Base Routing Config Map
self.__uv$config = {
    prefix: '/service/',
    bare: '/bare/',
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
    sw: '/uv.sw.js'
};
