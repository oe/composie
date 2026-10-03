/** middleware */
export interface IMiddleware<C> {
  /**
   * middleware function
   * @param ctx context object with channel, request, response property
   * @param next function to call next middleware
   */
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
export interface IRouteParam<F> {
  [k: string]: F[] | F
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


/**
 * create context used by middleware
 * @param evt message event
 */
function createDefaultContext<T extends IBaseContext> (channel: string, request?: any) {
  return {
    channel,
    request,
  } as T
}

/**
 * composie error codes
 */
export const COMPOSIE_ERROR_CODES = {
  /**
   * route not found
   */
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',

  /**
   * route exists, throw when add a alias which has a route with the same name
   */
  ROUTE_EXISTS: 'ROUTE_EXISTS',
  /**
   * unknown error
   */
  UNKNOWN: 'UNKNOWN'
} as const


/**
 * Composie error object constructor options
 */
export interface IComposieErrorOptions<T = unknown> {
  /**
   * error code
   */
  code: string
  /**
   * error message
   */
  message: string
  /**
   * original error object
   */
  originalError?: Error
  /**
   * additional data
   */
  data?: T
}

/**
 * Composie error class
 */
export class ComposieError<T = unknown> extends Error {
  code: string
  originalError: Error
  data?: T
  constructor (options: IComposieErrorOptions<T>) {
    super(options.message)
    this.code = options.code
    this.originalError = options.originalError || new Error(options.message)
    this.data = options.data
    this.name = 'ComposieError'
  }
  /**
   * alias of COMPOSIE_ERROR_CODES
   */
  static CODES = COMPOSIE_ERROR_CODES
}

/**
 * create context function
 */
export type ICreateContext<C extends IBaseContext> = (channel: string, request: any) => C

/**
 * Composie options for normal route style
 */
export interface INormalComposeOptions<C extends IBaseContext> {
  /**
   * create context function
   */
  createContext?: ICreateContext<C>
  /**
   * throw when no route found
   */
  throwWhenNoRoute?: boolean
}


/**
 * Composie options
 */
export type IComposieOptions<C extends IBaseContext> = INormalComposeOptions<C> | ICreateContext<C>


/**
 * generate a uuid, if crypto.randomUUID exists, use it, otherwise generate a random string
 * @returns uuid
 */
function getUUID () {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Math.random().toString(36)}-${Math.random().toString(36)}`.replace(/\./g, '')
}

/**
 * Composie
 */
export default class Composie<
  IContext extends IBaseContext,
  IRouterFn = IMiddleware<IContext>
  > {

  /**
   * use an uuid as the root middleware key
   */
  private wildcard = getUUID()
  /**
   * global middlewares
   */
  private middlewares: IGlobalMiddleware<IContext> = Object.create(null)
  /**
   * router map
   */
  private routers: IRouters<IContext> = Object.create(null)
  /**
   * create context function
   */
  private createContext: ICreateContext<IContext>
  /**
   * throw when no route found
   */
  private throwWhenNoRoute: boolean
  /**
   * convert a normal callback to a route handler
   */
  private fn2middleware?: (fn: Function) => IMiddleware<IContext>

  /**
   * route alias map
   */
  private aliasMap: { [k: string]: string } = Object.create(null)

  /** Original callbacks for converted handlers, isolated to this instance. */
  private originalCallbacks = new WeakMap<IMiddleware<IContext>, { original: IRouterFn; converted: IMiddleware<IContext> }>()

  constructor (options: IComposieOptions<IContext> = createDefaultContext) {
    if (typeof options === 'function') {
      this.createContext = options
      this.throwWhenNoRoute = false
    } else {
      this.createContext = options.createContext || createDefaultContext
      this.throwWhenNoRoute = options.throwWhenNoRoute || false
      // @ts-expect-error inner process only
      if (typeof options.convertCallback2Middleware === 'function') {
        // @ts-expect-error inner process only
        this.fn2middleware = options.convertCallback2Middleware
      }
    }
  }

  /**
   * add global middleware
   * @param cb middleware
   */
  use (cb: IMiddleware<IContext>): any
  use (prefix: string, cb: IMiddleware<IContext>): any
  /**
   * add global middleware focus on specific channel prefix
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
  /** Remove matching middleware from the global group or one exact prefix. */
  removeMiddleware(cb?: IMiddleware<IContext>): boolean
  removeMiddleware(prefix: string, cb?: IMiddleware<IContext>): boolean
  removeMiddleware(prefix?: string | IMiddleware<IContext>, cb?: IMiddleware<IContext>) {
    const key = typeof prefix === 'string' ? prefix : this.wildcard
    const callback = typeof prefix === 'function' ? prefix : cb
    const remove = (tree: IGlobalMiddleware<IContext>): boolean => {
      for (const name of Object.keys(tree)) {
        const node = tree[name]
        let removed = false
        if (name === key) {
          const remaining = callback ? node.mdlws.filter(fn => fn !== callback) : []
          removed = remaining.length !== node.mdlws.length
          node.mdlws = remaining
        } else if (node.children) {
          removed = remove(node.children)
        }
        if (removed) {
          if (!node.mdlws.length && (!node.children || !Object.keys(node.children).length)) {
            delete tree[name]
          }
          return true
        }
      }
      return false
    }
    return remove(this.middlewares)
  }

  /**
   * add router
   * @param routers router map
   */
  route (routers: IRouteParam<IRouterFn>): any
  /**
   * add router
   * @param channel channel name
   * @param cbs channel handlers
   */
  route (channel: string, ...cbs: IRouterFn[]): any
  route (routers: IRouteParam<IRouterFn> | string, ...cbs: IRouterFn[]) {
    if (typeof routers === 'string') {
      routers = {
        [routers]: cbs
      }
    }
    Object.keys(routers).forEach((k) => {
      const channel = this.aliasMap[k] ?? k
      let cbs = routers[k]
      if (!Array.isArray(cbs)) cbs = [cbs]
      if (!cbs.length) return
      if (!this.routers[channel]) {
        this.routers[channel] = []
      }
      if (this.fn2middleware) {
        // @ts-ignore
        cbs = cbs.map(cb => {
          const converted = this.fn2middleware!(cb as Function)
          const middleware: IMiddleware<IContext> = (ctx, next) => converted(ctx, next)
          this.originalCallbacks.set(middleware, { original: cb, converted })
          return middleware
        })
      }
      // @ts-ignore
      this.routers[channel].push(...cbs)
    })
    return this
  }

  /**
   * add router, alias of route
   */
  on: Composie<IContext, IRouterFn>['route'] = this.route

  /** Register one handler and return an idempotent disposer for that registration. */
  subscribe(channel: string, cb: IRouterFn): () => boolean {
    if (typeof cb !== 'function') throw new TypeError('Subscription callback must be a function')
    const target = this.aliasMap[channel] ?? channel
    const converted = this.fn2middleware
      ? this.fn2middleware(cb as unknown as Function)
      : cb as unknown as IMiddleware<IContext>
    let subscription: IMiddleware<IContext> | undefined = (ctx, next) => converted(ctx, next)
    this.originalCallbacks.set(subscription, { original: cb, converted })
    if (!this.routers[target]) this.routers[target] = []
    this.routers[target].push(subscription)
    return () => {
      if (!subscription) return false
      const registered = subscription
      subscription = undefined
      const handlers = this.routers[target]
      if (!handlers || handlers.indexOf(registered) < 0) return false
      const remaining = handlers.filter(handler => handler !== registered)
      if (remaining.length) this.routers[target] = remaining
      else delete this.routers[target]
      return true
    }
  }

  /**
   * add alias for a channel
   * @param existing existing channel name
   * @param alias    alias name
   */
  alias (existing: string, alias: string) {
    // same alias, do nothing
    if (existing === alias) return this
    if (this.routers[alias]) {
      throw new ComposieError({
        code: COMPOSIE_ERROR_CODES.ROUTE_EXISTS,
        message: `route for ${alias} already exists`,
      })
    }
    this.aliasMap[alias] = existing
    return this
  }

  /**
   * remove callback for a channel
   * Middleware registered with `use()` is managed by `removeMiddleware()`.
   * @param channel channel name
   * @param cb callback, if not set, remove all callbacks for the channel
   * @returns true if removed, false if not found
   */
  removeRoute(channel: string, cb?: IRouterFn) {
    // remove alias if exists
    if (this.aliasMap[channel] !== undefined) {
      delete this.aliasMap[channel]
      return true
    }
    return this.removeHandlers(channel, cb)
  }

  private removeHandlers(channel: string, cb?: IRouterFn) {
    const cbs = this.routers[channel]
    if (!cbs || !cbs.length) return false
    if (!cb) {
      delete this.routers[channel]
      return true
    }
    const newCbs = cbs.filter(c => {
      const registration = this.originalCallbacks.get(c)
      return c !== cb && registration?.original !== cb && registration?.converted !== cb
    })
    if (newCbs.length === cbs.length) return false
    if (newCbs.length) {
      this.routers[channel] = newCbs
    } else {
      delete this.routers[channel]
    }
    return true
  }

  /**
   * remove callback for a channel, alias of removeRoute
   */
  off: Composie<IContext, IRouterFn>['removeRoute'] = this.removeRoute

  /**
   * run middlewares
   *
   * @param channel channel to run
   * @param data ctx.request when run
   */
  run (channel: string, data?: any) {
    const ctx: IContext = this.createContext(channel, data)
    const method = this.aliasMap[ctx.channel] ?? ctx.channel
    const routerCbs = this.routers[method] || []
    if (!routerCbs.length) {
      if (this.throwWhenNoRoute) {
        routerCbs.push((ctx) => {
          throw new ComposieError({
            code: COMPOSIE_ERROR_CODES.ROUTE_NOT_FOUND,
            message: `route ${method} not found`,
            data: { channel: method, request: ctx.request, originalChannel: ctx.channel}
          })
        })
      }
    }
    const cbs = this.getMiddlewares(method)
    cbs.push(...routerCbs)
    return new Promise((resolve, reject) => {
      if (cbs.length) {
        this.composeMiddlewares(cbs)(ctx).then(() => resolve(ctx.response)).catch(reject)
      } else {
        resolve(undefined)
      }
    })
  }

  /**
   * run middlewares, alias of run
   */
  emit: Composie<IContext, IRouterFn>['run'] = this.run
  /**
   * run middlewares, alias of run
   */
  call: Composie<IContext, IRouterFn>['run'] = this.run


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
        this.middlewares = Object.create(null)
        this.middlewares[channel] = { mdlws: [], children: middlewares }
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
          middlewares[key].children = Object.create(null)
          middlewares[key].children![channel] = { mdlws: [cb] }
          return
        }
        // channel contains existing tree
        //  e.g. key = 'a/b', channel = 'a'
        if (key.indexOf(channel) === 0) {
          // Move every matching sibling so registration order cannot hide a parent.
          const children: IGlobalMiddleware<IContext> = Object.create(null)
          for (const childKey of keys) {
            if (childKey.indexOf(channel) === 0) {
              children[childKey] = middlewares[childKey]
              delete middlewares[childKey]
            }
          }
          middlewares[channel] = { mdlws: [cb], children }
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
      function dispatch (i: number): Promise<any> {
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


/**
 * convert a normal callback to a route handler
 * @param fn normal callback
 *  fn: (request: any) => response
 * fn receives a request object and returns a response object(can be a promise) or undefined
 *    if response is undefined, then it will be ignored
 */
const convert2middleware = (fn: Function): IMiddleware<IBaseContext> => {
  return async function (ctx: IBaseContext, next: Function) {
    const response = await fn(ctx.request)
    if (typeof response !== 'undefined') {
      ctx.response = response
    }
    return next()
  }
}


export interface IEventBusOptions<C extends IBaseContext> extends INormalComposeOptions<C> {
  /**
   * convert a normal callback to a route handler
   */
  convertCallback2Middleware?: ((fn: Function) => IMiddleware<C>)
}


export type IEventCallback = (params: any) => any

/**
 * create a event bus
 */
export function createEventBus<
  C extends IBaseContext,
  IFn extends ((params: any) => any) = ((params: C['request']) => any)
> (options: IEventBusOptions<C> = { createContext: createDefaultContext, convertCallback2Middleware: convert2middleware }) {
  const newOptions = Object.assign({}, options)
  newOptions.createContext = options.createContext || createDefaultContext
  newOptions.convertCallback2Middleware = options.convertCallback2Middleware || convert2middleware
  return new Composie<C, IFn>(newOptions)
}

/** Request and response types for one named operation. */
export interface IChannelDefinition<Request = unknown, Response = unknown> {
  request: Request
  response: Response
}

type ChannelNames<Channels> = Extract<keyof Channels, string>
type RequestArguments<Request> = undefined extends Request
  ? [Request?]
  : [Request]

/** Route context. The channel remains a string because calls may use aliases. */
export type ITypedContext<Definition extends IChannelDefinition, C extends IBaseContext = IBaseContext> =
  Pick<C, Exclude<keyof C, 'channel' | 'request' | 'response'>> & {
    readonly channel: string
    readonly request: Definition['request']
    response: Definition['response'] | undefined
  }

export type ITypedMiddleware<C> = (ctx: C, next: () => Promise<unknown>) => unknown

type TypedRoutes<Channels, C extends IBaseContext> = {
  [K in ChannelNames<Channels>]?: Channels[K] extends IChannelDefinition
    ? ITypedMiddleware<ITypedContext<Channels[K], C>> | ITypedMiddleware<ITypedContext<Channels[K], C>>[]
    : never
}

type TypedRun<Channels extends { [K in keyof Channels]: IChannelDefinition }> =
  <K extends ChannelNames<Channels>>(
    channel: K,
    ...args: RequestArguments<Channels[K]['request']>
  ) => Promise<Channels[K]['response'] | undefined>

/** An opt-in typed view of the existing Composie runtime. */
export interface ITypedComposie<
  Channels extends { [K in keyof Channels]: IChannelDefinition },
  C extends IBaseContext = IBaseContext
> {
  use(cb: IMiddleware<C>): ITypedComposie<Channels, C>
  use(prefix: string, cb: IMiddleware<C>): ITypedComposie<Channels, C>
  removeMiddleware(cb?: IMiddleware<C>): boolean
  removeMiddleware(prefix: string, cb?: IMiddleware<C>): boolean
  subscribe<K extends ChannelNames<Channels>>(
    channel: K,
    callback: ITypedMiddleware<ITypedContext<Channels[K], C>>
  ): () => boolean
  route(routers: TypedRoutes<Channels, C>): ITypedComposie<Channels, C>
  route<K extends ChannelNames<Channels>>(
    channel: K,
    ...handlers: ITypedMiddleware<ITypedContext<Channels[K], C>>[]
  ): ITypedComposie<Channels, C>
  on: ITypedComposie<Channels, C>['route']
  run: TypedRun<Channels>
  emit: TypedRun<Channels>
  call: TypedRun<Channels>
  removeRoute<K extends ChannelNames<Channels>>(
    channel: K,
    callback?: ITypedMiddleware<ITypedContext<Channels[K], C>>
  ): boolean
  off: ITypedComposie<Channels, C>['removeRoute']
  alias<K extends ChannelNames<Channels>, Alias extends string>(
    existing: K,
    alias: Alias
  ): ITypedComposie<Channels & Record<Alias, Channels[K]>, C>
}

/**
 * Define operation contracts without changing the middleware execution model.
 * Contracts are checked by TypeScript; payloads are not validated at runtime.
 */
export function createTypedComposie<
  Channels extends { [K in keyof Channels]: IChannelDefinition },
  C extends IBaseContext = IBaseContext
>(options?: IComposieOptions<C>): ITypedComposie<Channels, C> {
  return new Composie<C>(options) as unknown as ITypedComposie<Channels, C>
}
