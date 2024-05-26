/** middleware */
export interface IMiddleware<C> {
  (ctx: C, next: Function): any
}

interface IGlobalMiddleware<C> {
  [k: string]: {
    mdlws: IMiddleware<C>[],
    children?: IGlobalMiddleware<C>
  }
}

/** worker route map */
export interface IRouters<C> {
  [k: string]: IMiddleware<C>[]
}

/** param for route */
export interface IRouteParam<C> {
  [k: string]: IMiddleware<C>[] | IMiddleware<C>
}

/** request context for middleware */
export interface IBaseContext {
  /** request channel */
  readonly channel: string
  /** request data */
  readonly request: any
  response: any
  // response?: any
  [k: string]: any
  [k: number]: any
}

type ICreateContext<C> = (channel: string, data: any) => C

/**
 * create context used by middleware
 * @param evt message event
 */
function createDefaultContext<T extends IBaseContext> (channel: string, data: any) {
  return {
    channel: channel,
    request: data,
  } as T
}

/**
 * generate a uuid, if crypto.randomUUID exists, use it, otherwise generate a random string
 * @returns uuid
 */
function getUUID () {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Math.random().toString(36)}-${Math.random().toString(36)}`.replace(/\./g, '')
}

/**
 * Composie, custructor need no arugments
 */
export default class Composie<IContext extends IBaseContext> {
  // use an uuid as the root middleware key
  private wildcard = getUUID()
  // global middlewares
  private middlewares: IGlobalMiddleware<IContext> = {}
  // router map
  private routers: IRouters<IContext> = {}

  private createContext: ICreateContext<IContext>

  constructor (createContext: ICreateContext<IContext> = createDefaultContext) {
    this.createContext = createContext
  }

  /**
   * add global middleware
   * @param cb middleware
   */
  use (cb: IMiddleware<IContext>)
  use (prefix: string, cb: IMiddleware<IContext>)
  /**
   * add global middleware foucs on specifc channel prefix
   * @param prefix channel prefix
   * @param cb     middleware
   */
  use (prefix: string | IMiddleware<IContext>, cb?: IMiddleware<IContext>) {
    let key: string
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
  route (routers: IRouteParam<IContext>)
  /**
   * add router
   * @param channel channel name
   * @param cbs channel handlers
   */
  route (channel: string, ...cbs: IMiddleware<IContext>[])
  route (routers: IRouteParam<IContext> | string, ...cbs: IMiddleware<IContext>[]) {
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
   * add router, alias of route
   */
  on: Composie<IContext>['route'] = this.route
  /**
   * run middlewares
   *
   * @param channel channel to run
   * @param data ctx.request when run
   */
  run (channel: string, data?: any) {
    const ctx: IContext = this.createContext(channel, data)
    const method = ctx.channel
    const cbs = this.getMiddlewares(method)
    const routerCbs = this.routers[method] || []
    cbs.push(...routerCbs)
    return new Promise((resolve, reject) => {
      if (cbs.length) {
        const fnMiddlewares = this.composeMiddlewares(cbs)
        fnMiddlewares(ctx).then(() => resolve(ctx.response)).catch(reject)
      } else {
        resolve(undefined)
      }
    })
  }

  /**
   * run middlewares, alias of run
   */
  emit: Composie<IContext>['run'] = this.run

  /**
   * add a prefix for a channel
   * @param channel channel prefix
   * @param cb middleware
   */
  protected addMiddleware (channel: string, cb: IMiddleware<IContext>) {
    let middlewares = this.middlewares
    if (channel === this.wildcard) {
      // if wildcard not exists, add exist middlewares to wildcard's children
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
      while (len--) {
        const key = keys[len]
        // same channel exists
        if (key === channel) {
          middlewares[key].mdlws.push(cb)
          return
        }
        // existing tree contains channel
        //  e.g. key = 'a', channel = 'a/b'
        if (channel.indexOf(key) === 0) {
          // has children, dig into it
          if (middlewares[key].children) {
            middlewares = middlewares[key].children!
            break
          }
          // no children, insert as the children
          middlewares[key].children = { [channel]: { mdlws: [cb] } }
          return
        }
        // channel contains existing tree
        //  e.g. key = 'a/b', channel = 'a'
        if (key.indexOf(channel) === 0) {
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
      // not found, add to the end
      if (len < 0) break
    }
    middlewares[channel] = { mdlws: [cb] }
  }

  /**
   * compose middlewares into one function
   *  copy form https://github.com/koajs/compose/blob/master/index.js
   *  made some tiny changes
   * @param middlewares middlewares
   */
  protected composeMiddlewares (middlewares: IMiddleware<IContext>[]) {
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
        try {
          return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
        } catch (error) {
          return Promise.reject(error)
        }
      }
    }
  }

  /**
   * get all middlewares match the channel
   * @param channel channel name
   */
  private getMiddlewares (channel: string) {
    let middlewares: IGlobalMiddleware<IContext> | undefined = this.middlewares
    const result: IMiddleware<IContext>[] = []
    if (middlewares[this.wildcard]) {
      result.push(...middlewares[this.wildcard].mdlws)
      middlewares = middlewares[this.wildcard].children
    }
    while (middlewares) {
      // find specified middlewares which is the prefix of the channel
      const k = Object.keys(middlewares).find(k => channel.indexOf(k) === 0)
      if (k === undefined) break
      result.push(...middlewares[k].mdlws)
      middlewares = middlewares[k].children
    }
    return result
  }
}

