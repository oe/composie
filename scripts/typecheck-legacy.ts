import Composie, { createEventBus, IBaseContext, IMiddleware } from '../dist/composie'
const app = new Composie()
const handler: IMiddleware<IBaseContext> = (ctx, next) => { ctx.response = ctx.request; return next() }
app.use(handler).route('event', handler).on('other', handler)
const result: Promise<unknown> = app.run('event', 42)
createEventBus().on('event', value => value).emit('event', 42)
class LegacySubclass extends Composie<IBaseContext> {
  use(prefix: string | IMiddleware<IBaseContext>, cb?: IMiddleware<IBaseContext>): void {
    if (typeof prefix === 'function') super.use(prefix)
    else super.use(prefix, cb!)
  }
  inspect(ctx: IBaseContext) {
    return this.composeMiddlewares([])(ctx).then(value => value.property)
  }
}
