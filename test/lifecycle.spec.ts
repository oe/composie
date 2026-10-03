import Composie, { createEventBus } from '../src/composie'

const record = (name: string) => (ctx, next) => {
  ctx.response = [...(ctx.response || []), name]
  return next()
}

describe('middleware cleanup', () => {
  it('removes only the selected global registrations and keeps prefix middleware', async () => {
    const app = new Composie()
    const shared = record('global')
    app.use('api/', record('prefix')).use(shared).use(shared).use(record('other'))
    expect(app.removeMiddleware(shared)).toBe(true)
    expect(await app.run('api/get')).toEqual(['other', 'prefix'])
    expect(app.removeMiddleware(shared)).toBe(false)
    expect(app.removeMiddleware()).toBe(true)
    expect(app.removeMiddleware()).toBe(false)
    expect(await app.run('api/get')).toEqual(['prefix'])
    app.use(shared)
    expect(await app.run('api/get')).toEqual(['global', 'prefix'])
  })

  it.each([false, true])('preserves child prefixes when their parent is removed (global: %s)', async global => {
    const app = new Composie()
    const parent = record('parent')
    const child = record('child')
    app.use('', record('empty')).use('api/', parent).use('api/users', child).use('api/posts', record('posts'))
    if (global) app.use(record('global'))
    expect(app.removeMiddleware('api/', child)).toBe(false)
    expect(app.removeMiddleware('api/', parent)).toBe(true)
    expect(app.removeMiddleware('api/')).toBe(false)
    expect(await app.run('api/users/get')).toEqual([...(global ? ['global'] : []), 'empty', 'child'])
    app.use('api/', parent)
    expect(await app.run('api/posts')).toEqual([...(global ? ['global'] : []), 'empty', 'parent', 'posts'])
    expect(app.removeMiddleware('api/')).toBe(true)
    expect(app.removeMiddleware('api/users')).toBe(true)
    expect(app.removeMiddleware('api/posts')).toBe(true)
    expect(app.removeMiddleware('')).toBe(true)
    if (global) expect(app.removeMiddleware()).toBe(true)
    expect(await app.run('api/users/get')).toBeUndefined()
    // Repeated mount/unmount must not retain empty prefix nodes.
    expect(Object.keys((app as any).middlewares)).toEqual([])
    expect(app.removeMiddleware('missing')).toBe(false)
    expect(app.removeMiddleware()).toBe(false)
    app.use('api/', parent)
    expect(await app.run('api/users/get')).toEqual(['parent'])
  })

  it('removes an exact leaf prefix and every copy of a selected callback', async () => {
    const app = new Composie()
    const shared = record('shared')
    app.use('api/', shared).use('api/', shared).use('api/', record('retained')).use('api/users', shared)
    expect(app.removeMiddleware('api', shared)).toBe(false)
    expect(app.removeMiddleware('api/', shared)).toBe(true)
    expect(await app.run('api/users')).toEqual(['retained', 'shared'])
    expect(app.removeMiddleware('api/users', shared)).toBe(true)
    expect(app.removeMiddleware('api/')).toBe(true)
    expect(await app.run('api/users')).toBeUndefined()
  })
})

describe('disposable subscriptions', () => {
  it.each([false, true])('isolates identical callbacks and existing on registrations (event bus: %s)', async eventBus => {
    const app = eventBus ? createEventBus() : new Composie()
    const callback = vi.fn((ctx, next?) => next ? next() : ctx)
    app.on('event', callback)
    const first = app.subscribe('event', callback)
    const second = app.subscribe('event', callback)
    const other = app.subscribe('other', callback)
    expect(first()).toBe(true)
    expect(first()).toBe(false)
    await app.run('event', 'value')
    expect(callback).toHaveBeenCalledTimes(2)
    expect(second()).toBe(true)
    expect(app.off('event', callback)).toBe(true)
    expect(other()).toBe(true)
  })

  it('lets off remove all subscriptions by their original frozen callback', async () => {
    const app = createEventBus()
    const callback = Object.freeze((value: string) => value)
    const first = app.subscribe('event', callback)
    const second = app.subscribe('event', callback)
    const other = app.subscribe('other', callback)
    expect(await app.emit('event', 'value')).toBe('value')
    expect(app.off('event', callback)).toBe(true)
    expect(first()).toBe(false)
    expect(second()).toBe(false)
    expect(await app.emit('other', 'other')).toBe('other')
    expect(other()).toBe(true)
  })

  it('keeps aliases and captures the original target through alias changes', async () => {
    const app = createEventBus()
    const retained = vi.fn(value => value)
    app.on('original', retained).alias('original', 'alias')
    const dispose = app.subscribe('alias', value => value + '-subscribed')
    expect(await app.emit('alias', 'value')).toBe('value-subscribed')
    app.alias('different', 'alias')
    expect(dispose()).toBe(true)
    app.alias('original', 'alias')
    expect(await app.emit('alias', 'value')).toBe('value')
    expect(app.off('alias')).toBe(true)
    const direct = app.subscribe('original', value => value)
    expect(app.off('original')).toBe(true)
    expect(direct()).toBe(false)
  })

  it('preserves one-level alias semantics when disposing alias-chain subscriptions', async () => {
    const app = createEventBus()
    app.alias('target', 'middle').alias('middle', 'entry')
    const dispose = app.subscribe('entry', value => value)
    expect(await app.emit('entry', 'value')).toBe('value')
    expect(dispose()).toBe(true)
    expect(app.off('middle')).toBe(true)
    expect(app.off('entry')).toBe(true)
  })

  it('isolates custom converters which reuse one middleware', async () => {
    const middleware = (ctx, next) => { ctx.response = 'converted'; return next() }
    const app = createEventBus({ convertCallback2Middleware: () => middleware })
    const callback = vi.fn()
    const first = app.subscribe('event', callback)
    const second = app.subscribe('event', callback)
    expect(first()).toBe(true)
    expect(await app.emit('event')).toBe('converted')
    expect(second()).toBe(true)
    expect(await app.emit('event')).toBeUndefined()
  })

  it('rejects invalid subscription callbacks before registering a handler', () => {
    const app = new Composie()
    expect(() => app.subscribe('event', null as any)).toThrow(TypeError)
    expect(app.off('event')).toBe(false)
  })

  it('keeps an in-flight dispatch snapshot and cleans up subsequent calls', async () => {
    const app = new Composie()
    let resume!: () => void
    const ready = new Promise<void>(resolve => { resume = resolve })
    const gate = async (ctx, next) => { await ready; return next() }
    app.use(gate)
    const callback = vi.fn(ctx => { ctx.response = 'completed' })
    const dispose = app.subscribe('event', callback)
    const pending = app.run('event')
    expect(app.removeMiddleware(gate)).toBe(true)
    expect(dispose()).toBe(true)
    resume()
    expect(await pending).toBe('completed')
    expect(await app.run('event')).toBeUndefined()
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
