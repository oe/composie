import { createTypedComposie, IBaseContext } from '../src/composie'

export interface User { id: string; name: string }
export interface Operations {
  'users/get': { request: { id: string; token: string }; response: User }
  'users/list': { request: { token: string }; response: User[] }
  'system/ping': { request: void; response: string }
}
interface Context extends IBaseContext { trace: string[] }

/** In-memory demo: the token check illustrates a boundary, not production auth. */
export function createUserOperations(
  onTrace: (channel: string, trace: string[]) => void = () => {}
) {
  const users: User[] = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]
  const cache = new Map<string, User>()
  const app = createTypedComposie<Operations, Context>({
    throwWhenNoRoute: true,
    createContext: (channel, request) => ({ channel, request, response: undefined, trace: [] }),
  })

  // One logging boundary for all operations, including errors and cache hits.
  app.use(async (ctx, next) => {
    ctx.trace.push('log:start')
    try {
      await next()
    } finally {
      ctx.trace.push('log:end')
      onTrace(ctx.channel, [...ctx.trace])
    }
  })

  // Shared authentication for users/get and users/list. It runs before the cache.
  app.use('users/', (ctx, next) => {
    ctx.trace.push('auth')
    if (ctx.request.token !== 'demo-token') throw new Error('Unauthorized')
    return next()
  })

  app.on('users/get', (ctx, next) => {
    const cached = cache.get(ctx.request.id)
    if (!cached) return next()
    ctx.trace.push('cache:hit')
    ctx.response = cached
    // Short-circuit: the next handler is not needed.
    return
  }, ctx => {
    ctx.trace.push('load:user')
    const user = users.find(user => user.id === ctx.request.id)
    if (!user) throw new Error('User not found')
    cache.set(user.id, user)
    ctx.response = user
  })
  app.on('users/list', ctx => {
    ctx.trace.push('load:users')
    ctx.response = [...users]
  })
  app.on('system/ping', ctx => { ctx.response = 'pong' })

  // Use the returned instance to retain the alias's request/response types.
  return app.alias('users/get', 'profile')
}
