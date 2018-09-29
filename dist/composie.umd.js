/*!
 * trancate-html v1.0.1
 * Copyright© 2018 Saiya https://github.com/evecalm/composie#readme
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.composie = factory());
}(this, (function () { 'use strict';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */













function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function getUniqID() {
    // if (typeof Symbol === 'function') {
    //   return Symbol(key)
    // } else {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    // }
}
/**
 * Call Router
 */
class Router {
    constructor() {
        this.wildcard = getUniqID();
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
    use(prefix, cb) {
        let key;
        if (typeof prefix === 'function') {
            cb = prefix;
            key = this.wildcard;
        }
        else {
            key = prefix;
        }
        this.addMiddleware(key, cb);
        return this;
    }
    route(routers, ...cbs) {
        if (typeof routers === 'string') {
            routers = {
                [routers]: cbs
            };
        }
        Object.keys(routers).forEach((k) => {
            let cbs = routers[k];
            if (!Array.isArray(cbs))
                cbs = [cbs];
            if (!cbs.length)
                return;
            if (!this.routers[k]) {
                this.routers[k] = [];
            }
            this.routers[k].push(...cbs);
        });
        return this;
    }
    /**
     * listen original message event
     * @param evt message event
     */
    run(channel, data) {
        return __awaiter(this, arguments, void 0, function* () {
            // @ts-ignore
            const ctx = this.createContext(...arguments);
            const method = ctx.channel;
            const cbs = this.getMiddlewares(method);
            const routerCbs = this.routers[method] || [];
            cbs.push(...routerCbs);
            if (cbs.length) {
                const fnMiddlewars = this.composeMiddlewares(cbs);
                yield fnMiddlewars(ctx);
                return ctx.response;
            }
            else {
                console.warn(`no corresponding router for ${channel}`);
                return;
            }
        });
    }
    /**
     * add a prefix for a channel
     * @param channel channel prefix
     * @param cb middleware
     */
    addMiddleware(channel, cb) {
        let middlewares = this.middlewares;
        if (channel === this.wildcard) {
            if (!this.middlewares[channel]) {
                this.middlewares = {
                    [channel]: {
                        mdlws: [],
                        children: middlewares
                    }
                };
            }
            this.middlewares[channel].mdlws.push(cb);
            return;
        }
        if (this.middlewares[this.wildcard]) {
            middlewares = this.middlewares[this.wildcard].children;
        }
        while (middlewares) {
            const keys = Object.keys(middlewares);
            let len = keys.length;
            let result = 0;
            let key = '';
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
                middlewares[key].children = { [channel]: { mdlws: [cb] } };
                return;
            }
            // insert node
            if (result === 3) {
                const item = middlewares[key];
                delete middlewares[key];
                middlewares[channel] = {
                    mdlws: [cb],
                    children: {
                        [key]: item
                    }
                };
                return;
            }
        }
        middlewares[channel] = { mdlws: [cb] };
    }
    /**
     * compose middlewares into one function
     *  copy form https://github.com/koajs/compose/blob/master/index.js
     * @param middlewares middlewares
     */
    composeMiddlewares(middlewares) {
        return function (context, next) {
            // last called middleware #
            let index = -1;
            return dispatch(0);
            function dispatch(i) {
                if (i <= index)
                    return Promise.reject(new Error('next() called multiple times'));
                index = i;
                let fn = middlewares[i];
                if (i === middlewares.length)
                    fn = next;
                if (!fn)
                    return Promise.resolve();
                try {
                    return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
                }
                catch (err) {
                    return Promise.reject(err);
                }
            }
        };
    }
    /**
     * create context used by middleware
     * @param evt message event
     */
    createContext(channel, data) {
        const context = {
            channel: channel,
            request: data,
        };
        return context;
    }
    /**
     * get all middlewares match the channel
     * @param channel channel name
     */
    getMiddlewares(channel) {
        let middlewares = this.middlewares;
        const result = [];
        if (middlewares[this.wildcard]) {
            result.push(...middlewares[this.wildcard].mdlws);
            middlewares = middlewares[this.wildcard].children;
        }
        while (middlewares) {
            const k = Object.keys(middlewares).find(k => channel.indexOf(k) !== -1);
            if (k === undefined)
                break;
            result.push(...middlewares[k].mdlws);
            middlewares = middlewares[k].children;
        }
        return result;
    }
}

return Router;

})));
