/** middleware define */
export interface IMiddleware {
  (ctx: any, next: Function): any
}

interface IGlobalMiddleware {
  [k: string]: {
    mdlws: IMiddleware[],
    children?: IGlobalMiddleware
  }
}

/** worker route map */
export interface IRouters {
  [k: string]: IMiddleware[]
}

/** param for route */
export interface IRouteParam {
  [k: string]: IMiddleware[] | IMiddleware
}

/** request context for middleware */
export interface IContext {
  channel: string
  request: any
  [k: string]: any
  [k: number]: any
}

function getUniqID () {
  // if (typeof Symbol === 'function') {
  //   return Symbol(key)
  // } else {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  // }
}

/**
 * Call Router
 */
export default class Composie {
  private wildcard = getUniqID()
  // global middlewares
  private middlewares: IGlobalMiddleware = {}
  // router map
  private routers: IRouters = {}
  /**
   * add global middleware
   * @param cb middleware
   */
  use (cb: IMiddleware)
  use (prefix: string, cb: IMiddleware)
  /**
   * add global middleware foucs on specifc channel prefix
   * @param prefix channel prefix
   * @param cb     middleware
   */
  use (prefix: string | IMiddleware, cb?: IMiddleware) {
    let key: string | Symbol
    if (typeof prefix === 'function') {
      cb = prefix
      key = this.wildcard
    } else {
      key = prefix
    }
    this.addMiddleware(key, cb!)
    return this
  }
  /**
   * add router
   * @param routers router map
   */
  route (routers: IRouteParam)
  /**
   * add router
   * @param channel channel name
   * @param cbs channel handlers
   */
  route (channel: string, ...cbs: IMiddleware[])
  route (routers: IRouteParam | string, ...cbs: IMiddleware[]) {
    if (typeof routers === 'string') {
      routers = {
        [routers]: cbs
      }
    }
    Object.keys(routers).forEach((k) => {
      let cbs = routers[k]
      if (!Array.isArray(cbs)) cbs = [cbs]
      if (!cbs.length) return
      if (!this.routers[k]) {
        this.routers[k] = []
      }
      this.routers[k].push(...cbs)
    })
    return this
  }

  /**
   * listen original message event
   * @param evt message event 
   */
  run (channel: any, data?: any) {
    // @ts-ignore
    const ctx = this.createContext(...arguments)
    const method = ctx.channel
    const cbs = this.getMiddlewares(method)
    const routerCbs = this.routers[method] || []
    cbs.push(...routerCbs)
    return new Promise((resolve, reject) => {
      if (cbs.length) {
        const fnMiddlewars = this.composeMiddlewares(cbs)
        fnMiddlewars(ctx).then(() => resolve(ctx.response)).catch(reject)
      } else {
        console.warn(`no corresponding router for ${channel}`)
        resolve()
      }
    })
  }

  /**
   * add a prefix for a channel
   * @param channel channel prefix
   * @param cb middleware
   */
  protected addMiddleware (channel: string, cb: IMiddleware) {
    let middlewares = this.middlewares
    if (channel === this.wildcard) {
      if (!this.middlewares[channel]) {
        this.middlewares = {
          [channel]: {
            mdlws: [],
            children: middlewares
          }
        }
      }
      this.middlewares[channel].mdlws.push(cb)
      return
    }
    if (this.middlewares[this.wildcard]) {
      middlewares = this.middlewares[this.wildcard].children!
    }
    while (middlewares) {
      const keys = Object.keys(middlewares)
      let len = keys.length
      let result = 0
      let key = ''
      while (len--) {
        key = keys[len]
        // same channel exists
        if (key === channel) {
          result = 1
          break
        }
        // existing tree contains channel
        if (channel.indexOf(key) === 0) {
          result = 2
          break
        }
        // channel contains existing tree
        if (key.indexOf(channel) === 0) {
          result = 3
          break
        }
      }
      // not found
      if (!result) break
      // exists
      if (result === 1) {
        middlewares[key].mdlws.push(cb)
        return
      }
      // channel be included
      if (result === 2) {
        // has children, dig into it
        if (middlewares[key].children) {
          middlewares = middlewares[key].children!
          continue
        }
        // no children, insert as the children
        middlewares[key].children = { [channel]: { mdlws: [cb] } }
        return
      }
      // insert node
      if (result === 3) {
        const item = middlewares[key]
        delete middlewares[key]
        middlewares[channel] = {
          mdlws: [cb],
          children: {
            [key]: item
          }
        }
        return
      }
    }
    middlewares[channel] = { mdlws: [cb] }
  }

  /**
   * compose middlewares into one function
   *  copy form https://github.com/koajs/compose/blob/master/index.js
   *  made some tiny changes
   * @param middlewares middlewares
   */
  protected composeMiddlewares (middlewares: IMiddleware[]) {
    return function (context: IContext, next?: Function) {
      // last called middleware #
      let index = -1
      return dispatch(0)
      function dispatch (i) {
        if (i <= index) {
          return Promise.reject(new Error('next() called multiple times'))
        }
        index = i
        let fn: Function | undefined = middlewares[i]
        if (i === middlewares.length) fn = next
        if (!fn) return Promise.resolve()
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
      }
    }
  }

  /**
   * create context used by middleware
   * @param evt message event
   */
  protected createContext (channel: any, data: any) {
    const context = {
      channel: channel,
      request: data,
    } as IContext
    return context
  }

  /**
   * get all middlewares match the channel
   * @param channel channel name
   */
  private getMiddlewares (channel: string) {
    let middlewares: IGlobalMiddleware | undefined = this.middlewares
    const result: IMiddleware[] = []
    if (middlewares[this.wildcard]) {
      result.push(...middlewares[this.wildcard].mdlws)
      middlewares = middlewares[this.wildcard].children
    }
    while (middlewares) {
      const k = Object.keys(middlewares).find(k => channel.indexOf(k) !== -1)
      if (k === undefined) break
      result.push(...middlewares[k].mdlws)
      middlewares = middlewares[k].children
    }
    return result
  }
}
