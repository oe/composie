/** middleware define */
export interface IMiddleware {
    (ctx: IContext, next: Function): any;
}
/** worker route map */
export interface IRouters {
    [k: string]: IMiddleware[];
}
/** param for route */
export interface IRouteParam {
    [k: string]: IMiddleware[] | IMiddleware;
}
/** request context for middleware */
export interface IContext {
    channel: string;
    request: any;
    [k: string]: any;
    [k: number]: any;
}
/**
 * Call Router
 */
export default class Composie {
    private wildcard;
    private middlewares;
    private routers;
    /**
     * add global middleware
     * @param cb middleware
     */
    use(cb: IMiddleware): any;
    use(prefix: string, cb: IMiddleware): any;
    /**
     * add router
     * @param routers router map
     */
    route(routers: IRouteParam): any;
    /**
     * add router
     * @param channel channel name
     * @param cbs channel handlers
     */
    route(channel: string, ...cbs: IMiddleware[]): any;
    /**
     * run middlewares
     *
     * @param ctx custom context as defined in interface IContext
     */
    run(ctx: IContext): any;
    /**
     * run middlewares
     *
     * @param channel channel to run
     * @param data ctx.request when run
     */
    run(channel: string, data?: any): any;
    /**
     * add a prefix for a channel
     * @param channel channel prefix
     * @param cb middleware
     */
    protected addMiddleware(channel: string, cb: IMiddleware): void;
    /**
     * compose middlewares into one function
     *  copy form https://github.com/koajs/compose/blob/master/index.js
     *  made some tiny changes
     * @param middlewares middlewares
     */
    protected composeMiddlewares(middlewares: IMiddleware[]): (context: IContext, next?: Function | undefined) => Promise<any>;
    /**
     * create context used by middleware
     * @param evt message event
     */
    protected createContext(channel: string, data: any): IContext;
    /**
     * get all middlewares match the channel
     * @param channel channel name
     */
    private getMiddlewares;
}
