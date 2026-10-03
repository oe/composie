import Composie, { createTypedComposie } from '../src/composie'
import { createUserOperations } from '../examples/operations'

interface Channels {
  echo: { request: string; response: string }
  ping: { request: void; response: string }
}

describe('typed operations', () => {
  it('uses the existing runtime and infers object handlers and aliases', async () => {
    const app = createTypedComposie<Channels>()
    expect(app).toBeInstanceOf(Composie)
    const echo = (ctx) => { ctx.response = ctx.request }
    app.on({ echo, ping: ctx => { ctx.response = 'pong' } })
    expect(await app.run('echo', 'hello')).toBe('hello')
    expect(await app.emit('ping')).toBe('pong')
    const aliased = app.alias('echo', 'copy')
    expect(aliased).toBe(app)
    expect(await aliased.call('copy', 'alias')).toBe('alias')
    expect(aliased.off('copy')).toBe(true)
    expect(app.removeRoute('echo', echo)).toBe(true)
    expect(await app.run('echo', 'removed')).toBeUndefined()
  })

  it('retains the original channel in an aliased handler', async () => {
    const app = createTypedComposie<Channels>()
    app.route('echo', ctx => { ctx.response = ctx.channel })
    expect(await app.alias('echo', 'copy').run('copy', 'value')).toBe('copy')
  })

  it('can return undefined when a middleware short-circuits', async () => {
    const app = createTypedComposie<Channels>()
    app.use(() => {})
    app.route('ping', ctx => { ctx.response = 'unreachable' })
    expect(await app.run('ping')).toBeUndefined()
  })

  it('supports the existing function context factory option', async () => {
    const app = createTypedComposie<Channels>(
      (channel, request) => ({ channel, request, response: undefined })
    )
    app.on('echo', ctx => { ctx.response = ctx.request })
    expect(await app.run('echo', 'value')).toBe('value')
  })
})

describe('user operations example', () => {
  it('runs global logging and prefix auth before a cached short-circuit', async () => {
    const traces: string[][] = []
    const app = createUserOperations((_, trace) => traces.push(trace))
    const request = { id: '1', token: 'demo-token' }
    expect(await app.run('users/get', request)).toEqual({ id: '1', name: 'Alice' })
    expect(await app.run('profile', request)).toEqual({ id: '1', name: 'Alice' })
    expect(traces).toEqual([
      ['log:start', 'auth', 'load:user', 'log:end'],
      ['log:start', 'auth', 'cache:hit', 'log:end'],
    ])
  })

  it('rejects unauthorized requests even after the cache is populated', async () => {
    const traces: string[][] = []
    const app = createUserOperations((_, trace) => traces.push(trace))
    await app.run('users/get', { id: '1', token: 'demo-token' })
    await expect(app.run('users/get', { id: '1', token: 'invalid' })).rejects.toThrow('Unauthorized')
    expect(traces[1]).toEqual(['log:start', 'auth', 'log:end'])
  })

  it('logs handler errors and shares auth across users operations', async () => {
    const trace = vi.fn()
    const app = createUserOperations(trace)
    await expect(app.run('users/get', { id: 'missing', token: 'demo-token' })).rejects.toThrow('User not found')
    expect(trace).toHaveBeenLastCalledWith('users/get', ['log:start', 'auth', 'load:user', 'log:end'])
    expect(await app.run('users/list', { token: 'demo-token' })).toHaveLength(2)
    await expect(app.run('users/list', { token: 'invalid' })).rejects.toThrow('Unauthorized')
    expect(await app.run('system/ping')).toBe('pong')
    expect(trace).toHaveBeenLastCalledWith('system/ping', ['log:start', 'log:end'])
  })
})
