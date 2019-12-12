/*!
 * Composie v0.1.2
 * Copyright© 2019 Saiya https://github.com/oe/composie#readme
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Composie = factory());
}(this, (function () { 'use strict';

/**
 * Composie, custructor need no arugments
 */
var Composie = /** @class */ (function () {
    function Composie() {
        // get a uuid
        this.wildcard = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        // global middlewares
        this.middlewares = {};
        // router map
        this.routers = {};
    }
    /**
     * add global middleware foucs on specifc channel prefix
     * @param prefix channel prefix
     * @param cb     middleware
     */
    Composie.prototype.use = function (prefix, cb) {
        var key;
        if (typeof prefix === 'function') {
            cb = prefix;
            key = this.wildcard;
        }
        else {
            key = prefix;
        }
        this.addMiddleware(key, cb);
        return this;
    };
    Composie.prototype.route = function (routers) {
        var _this = this;
        var cbs = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            cbs[_i - 1] = arguments[_i];
        }
        var _a;
        if (typeof routers === 'string') {
            routers = (_a = {}, _a[routers] = cbs, _a);
        }
        Object.keys(routers).forEach(function (k) {
            var _a;
            var cbs = routers[k];
            if (!Array.isArray(cbs))
                cbs = [cbs];
            if (!cbs.length)
                return;
            if (!_this.routers[k]) {
                _this.routers[k] = [];
            }
            (_a = _this.routers[k]).push.apply(_a, cbs);
        });
        return this;
    };
    Composie.prototype.run = function (channel, data) {
        var _this = this;
        var ctx;
        if (typeof channel === 'string') {
            ctx = this.createContext(channel, data);
        }
        else {
            ctx = channel;
        }
        var method = ctx.channel;
        var cbs = this.getMiddlewares(method);
        var routerCbs = this.routers[method] || [];
        cbs.push.apply(cbs, routerCbs);
        return new Promise(function (resolve, reject) {
            if (cbs.length) {
                var fnMiddlewars = _this.composeMiddlewares(cbs);
                fnMiddlewars(ctx).then(function () { return resolve(ctx.response); }).catch(reject);
            }
            else {
                console.warn('no corresponding router for', method);
                resolve();
            }
        });
    };
    /**
     * add a prefix for a channel
     * @param channel channel prefix
     * @param cb middleware
     */
    Composie.prototype.addMiddleware = function (channel, cb) {
        var _a, _b, _c;
        var middlewares = this.middlewares;
        if (channel === this.wildcard) {
            if (!this.middlewares[channel]) {
                this.middlewares = (_a = {}, _a[channel] = {
                        mdlws: [],
                        children: middlewares
                    }, _a);
            }
            this.middlewares[channel].mdlws.push(cb);
            return;
        }
        if (this.middlewares[this.wildcard]) {
            middlewares = this.middlewares[this.wildcard].children;
        }
        while (middlewares) {
            var keys = Object.keys(middlewares);
            var len = keys.length;
            var result = 0;
            var key = '';
            while (len--) {
                key = keys[len];
                // same channel exists
                if (key === channel) {
                    result = 1;
                    break;
                }
                // existing tree contains channel
                if (channel.indexOf(key) === 0) {
                    result = 2;
                    break;
                }
                // channel contains existing tree
                if (key.indexOf(channel) === 0) {
                    result = 3;
                    break;
                }
            }
            // not found
            if (!result)
                break;
            // exists
            if (result === 1) {
                middlewares[key].mdlws.push(cb);
                return;
            }
            // channel be included
            if (result === 2) {
                // has children, dig into it
                if (middlewares[key].children) {
                    middlewares = middlewares[key].children;
                    continue;
                }
                // no children, insert as the children
                middlewares[key].children = (_b = {}, _b[channel] = { mdlws: [cb] }, _b);
                return;
            }
            // insert node
            if (result === 3) {
                var item = middlewares[key];
                delete middlewares[key];
                middlewares[channel] = {
                    mdlws: [cb],
                    children: (_c = {}, _c[key] = item, _c)
                };
                return;
            }
        }
        middlewares[channel] = { mdlws: [cb] };
    };
    /**
     * compose middlewares into one function
     *  copy form https://github.com/koajs/compose/blob/master/index.js
     *  made some tiny changes
     * @param middlewares middlewares
     */
    Composie.prototype.composeMiddlewares = function (middlewares) {
        return function (context, next) {
            // last called middleware #
            var index = -1;
            return dispatch(0);
            function dispatch(i) {
                if (i <= index) {
                    return Promise.reject(new Error('next() called multiple times'));
                }
                index = i;
                var fn = middlewares[i];
                if (i === middlewares.length)
                    fn = next;
                if (!fn)
                    return Promise.resolve();
                try {
                    return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
                }
                catch (error) {
                    return Promise.reject(error);
                }
            }
        };
    };
    /**
     * create context used by middleware
     * @param evt message event
     */
    Composie.prototype.createContext = function (channel, data) {
        var context = {
            channel: channel,
            request: data
        };
        return context;
    };
    /**
     * get all middlewares match the channel
     * @param channel channel name
     */
    Composie.prototype.getMiddlewares = function (channel) {
        var middlewares = this.middlewares;
        var result = [];
        if (middlewares[this.wildcard]) {
            result.push.apply(result, middlewares[this.wildcard].mdlws);
            middlewares = middlewares[this.wildcard].children;
        }
        while (middlewares) {
            var k = Object.keys(middlewares).find(function (k) { return channel.indexOf(k) !== -1; });
            if (k === undefined)
                break;
            result.push.apply(result, middlewares[k].mdlws);
            middlewares = middlewares[k].children;
        }
        return result;
    };
    return Composie;
}());

return Composie;

})));
