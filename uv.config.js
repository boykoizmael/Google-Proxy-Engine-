// uv.config.js - Root-Level Safe Configuration Map
self.__uv$config = {
    prefix: '/service/',
    bare: '/bare/',
    encodeUrl: function(url) { return encodeURIComponent(url); },
    decodeUrl: function(url) { return decodeURIComponent(url); },
    handler: '/uv.handler.js',
    bundle: '/uv.bundle.js',
    config: '/uv.config.js',
    sw: '/sw.js'
};
