// uv.config.js - Custom Configuration Map
self.__uv$config = {
    prefix: '/service/',
    bare: '/bare/', // FIXED: Routes traffic directly through your own hosted app server
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
