import Composie, { createEventBus, createTypedComposie, IBaseContext, ITypedMiddleware, ITypedContext } from '../../src/composie'

interface User { id: string; name: string }
interface Channels {
  'users/get': { request: { id: string }; response: User }
  'users/list': { request: void; response: User[] }
  'system/ping': { request: undefined; response: string }
  'maybe': { request: { id: string } | undefined; response: boolean }
}
interface Context extends IBaseContext { traceId: string }

const app = createTypedComposie<Channels, Context>({
  createContext: (channel, request) => ({ channel, request, response: undefined, traceId: 'trace' })
})
app.use((ctx, next) => { const trace: string = ctx.traceId; return next() })
app.use('users/', (ctx, next) => next())
app.route('users/get', (ctx, next) => {
  const id: string = ctx.request.id
  const trace: string = ctx.traceId
  const originalChannel: string = ctx.channel
  const pending: Promise<unknown> = next()
  ctx.response = { id, name: trace }
  // @ts-expect-error response must match this operation
  ctx.response = 'wrong'
  // @ts-expect-error request fields are checked
  ctx.request.id = 123
  return pending
}).on({
  'users/list': ctx => { ctx.response = [] },
  'system/ping': [ctx => { ctx.response = 'pong' }],
})
const user: Promise<User | undefined> = app.run('users/get', { id: '1' })
const users: Promise<User[] | undefined> = app.emit('users/list')
const pong: Promise<string | undefined> = app.call('system/ping')
app.run('maybe')
app.run('maybe', { id: '1' })
app.run('users/list', undefined)
// @ts-expect-error unknown channel
app.run('users/missing', { id: '1' })
// @ts-expect-error required request omitted
app.run('users/get')
// @ts-expect-error mismatched request
app.emit('users/get', { id: 1 })
// @ts-expect-error request of a different channel
app.call('users/list', { id: '1' })
// @ts-expect-error result is not guaranteed to be assigned
const definite: Promise<User> = app.run('users/get', { id: '1' })
// @ts-expect-error inferred result type
const wrongResult: Promise<string | undefined> = app.run('users/get', { id: '1' })
// @ts-expect-error unknown registration key
app.on('unknown', () => {})
// @ts-expect-error unknown object registration key
app.route({ unknown: () => {} })
// @ts-expect-error object registration response type
app.route({ 'users/get': ctx => { ctx.response = 42 } })
const callback: ITypedMiddleware<ITypedContext<Channels['users/get'], Context>> = ctx => {
  ctx.response = { id: ctx.request.id, name: ctx.traceId }
}
app.on('users/get', callback)
app.off('users/get', callback)
app.removeRoute('users/get', callback)
// @ts-expect-error callback belongs to another channel
app.on('users/list', callback)
// @ts-expect-error removal callback belongs to another channel
app.off('users/list', callback)
// @ts-expect-error unknown removal key
app.removeRoute('missing')
const aliased = app.alias('users/get', 'profile')
const profile: Promise<User | undefined> = aliased.run('profile', { id: '1' })
aliased.on('profile', ctx => { ctx.response = { id: ctx.request.id, name: 'alias' } })
// @ts-expect-error alias keeps its request type
aliased.run('profile', { id: false })
// @ts-expect-error cannot alias an unknown operation
app.alias('missing', 'alias')
// @ts-expect-error aliases are typed on the returned instance
app.run('profile', { id: '1' })

// Existing APIs still accept dynamic channel names and custom event callbacks.
new Composie().on('dynamic', (ctx, next) => next()).run('anything', 42)
createEventBus().on('dynamic', value => value).emit('anything', 42)

const dispose: () => boolean = app.subscribe('users/get', callback)
const removed: boolean = app.removeMiddleware('users/')
app.removeMiddleware((ctx, next) => next())
// @ts-expect-error unknown subscription channel
app.subscribe('missing', callback)
// @ts-expect-error subscription callback belongs to another channel
app.subscribe('users/list', callback)
// @ts-expect-error subscription context response is checked
app.subscribe('users/get', ctx => { ctx.response = 123 })
