// uv/uv.config.js
self.__uv$config = {
    prefix: '/service/',
    bare: '/bare/',
    encodeUrl: function(url) { return encodeURIComponent(url); },
    decodeUrl: function(url) { return decodeURIComponent(url); },
    handler: '/uv/uv.handler.js',
    bundle: '/uv/uv.bundle.js',
    config: '/uv/uv.config.js',
    sw: '/uv/uv.sw.js'
};
