'use strict';


var dustjs = require('dustjs-linkedin'),
    engine = require('express-dustjs'),
    cache = require('./lib/cache'),
    views = require('./lib/view'),
    provider = require('./lib/provider'),
    translator = require('./lib/translator');


function isExpress(obj) {
    return typeof obj === 'function' && obj.handle && obj.set;
}


var proto = {

    getBundle: function (name, locale, callback) {
        this.contentProvider.getBundle(name, locale).load(callback);
    },

    localize: function (name, locale, views, callback) {
        this.templateTranslator.localize(name, locale, views, callback);
    }

};


exports.create = function (app, config) {
    var contentProvider, templateTranslator;

    if (!isExpress(app)) {
        config = app;
        app = undefined;
    }

    config.templateRoot = app ? app.get('views') : (config.templatePath || config.templateRoot);
    contentProvider = exports.createProvider(config);
    templateTranslator = exports.createTranslator(contentProvider, config);

    if (app) {
        var ext, viewCache;

        // For i18n we silently switch to the JS engine for all requests.
        ext = app.get('view engine');
        app.engine(ext, engine.js({ cache: false }));

        dustjs.onLoad = views[ext].create(app, templateTranslator);

        if (this.cache) {
            viewCache = cache.create(dustjs.onLoad, contentProvider.fallbackLocale);
            dustjs.onLoad = viewCache.get.bind(viewCache);
        }
    }

    return Object.create(proto, {

        cache: {
            enumerable: true,
            writable: false,
            value: !!config.cache
        },

        contentProvider: {
            enumerable: true,
            writable: false,
            value: contentProvider
        },

        templateTranslator: {
            enumerable: true,
            writable: false,
            value: templateTranslator
        }

    });
};


exports.createTranslator = function (provider, config) {
    var enableMetadata = config.enableMetadata || config.enableHtmlMetadata;
    return translator.create(provider, (config.templatePath || config.templateRoot), enableMetadata);
};


exports.createProvider = function (config) {
    var contentRoot, fallbackLocale;

    contentRoot = config.contentPath || config.contentRoot;
    fallbackLocale = config.fallback || config.fallbackLocale;

    return provider.create(contentRoot, fallbackLocale, config.cache);
};