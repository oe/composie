/*!
 * Composie v0.0.11
 * Copyright© 2018 Saiya https://github.com/evecalm/composie#readme
 */
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
class Composie {
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
    run(channel, data) {
        let ctx;
        if (typeof channel === 'string') {
            ctx = this.createContext(channel, data);
        }
        else {
            ctx = channel;
        }
        const method = ctx.channel;
        const cbs = this.getMiddlewares(method);
        const routerCbs = this.routers[method] || [];
        cbs.push(...routerCbs);
        return new Promise((resolve, reject) => {
            if (cbs.length) {
                const fnMiddlewars = this.composeMiddlewares(cbs);
                fnMiddlewars(ctx).then(() => resolve(ctx.response)).catch(reject);
            }
            else {
                console.warn(`no corresponding router for ${channel}`);
                resolve();
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
     *  made some tiny changes
     * @param middlewares middlewares
     */
    composeMiddlewares(middlewares) {
        return function (context, next) {
            // last called middleware #
            let index = -1;
            return dispatch(0);
            function dispatch(i) {
                if (i <= index) {
                    return Promise.reject(new Error('next() called multiple times'));
                }
                index = i;
                let fn = middlewares[i];
                if (i === middlewares.length)
                    fn = next;
                if (!fn)
                    return Promise.resolve();
                return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
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
            request: data
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

export default Composie;
