import Composie, { createEventBus } from '../src/composie'

function permutations<T>(items: T[]): T[][] {
  if (!items.length) return [[]]
  return items.flatMap((item, index) =>
    permutations(items.filter((_, i) => i !== index)).map(rest => [item, ...rest]))
}

describe('registration regressions', () => {
  it.each(permutations(['', 'api/', 'api/users', 'api/posts']).map(order => [order]))(
    'matches prefixes regardless of registration order: %j', async order => {
      const app = new Composie()
      for (const prefix of order) {
        app.use(prefix, (ctx, next) => {
          ctx.response = [...(ctx.response || []), prefix]
          return next()
        })
      }
      expect(await app.run('api/users/detail')).toEqual(['', 'api/', 'api/users'])
      expect(await app.run('api/posts/detail')).toEqual(['', 'api/', 'api/posts'])
      expect(await app.run('unrelated')).toEqual([''])
    }
  )

  it.each(['string', 'object'])('adds handlers through an alias using %s registration', async style => {
    const app = new Composie()
    app.route('original', (ctx, next) => { ctx.response = 'first'; return next() })
    app.alias('original', 'alias')
    const handler = ctx => { ctx.response += '-second' }
    if (style === 'string') app.route('alias', handler)
    else app.route({ alias: handler })
    expect(await app.run('original')).toBe('first-second')
    expect(await app.run('alias')).toBe('first-second')
  })

  it.each(['__proto__', 'constructor', 'toString'])('supports the channel name %s', async channel => {
    const app = new Composie({ throwWhenNoRoute: true })
    await expect(app.run(channel)).rejects.toMatchObject({ code: 'ROUTE_NOT_FOUND' })
    app.use(channel, (ctx, next) => { ctx.response = 'prefix'; return next() })
    app.on(channel, (ctx, next) => { ctx.response += '-route'; return next() })
    app.alias(channel, 'alias')
    expect(await app.run('alias')).toBe('prefix-route')
    expect(app.off('alias')).toBe(true)
    expect(app.off(channel)).toBe(true)
  })

  it('supports a prototype-like alias name and an empty target channel', async () => {
    const app = new Composie()
    app.route('', ctx => { ctx.response = 'empty' })
    app.alias('', '__proto__')
    expect(await app.run('__proto__')).toBe('empty')
    expect(app.off('__proto__')).toBe(true)
    expect(await app.run('')).toBe('empty')
  })

  it.each([false, true])('keeps every sibling under a newly added parent (global: %s)', async global => {
    const app = new Composie()
    const record = (name: string) => (ctx, next) => {
      ctx.response = [...(ctx.response || []), name]
      return next()
    }
    app.use('api/users', record('users'))
    app.use('api/posts', record('posts'))
    app.use('other', record('other'))
    if (global) app.use(record('global'))
    app.use('api/', record('parent'))
    for (const child of ['users', 'posts']) {
      expect(await app.run(`api/${child}`)).toEqual([...(global ? ['global'] : []), 'parent', child])
    }
    expect(await app.run('other')).toEqual([...(global ? ['global'] : []), 'other'])
  })

  it('removes all registrations of a shared callback independently across channels and buses', async () => {
    const first = createEventBus()
    const second = createEventBus()
    const callback = vi.fn(value => value)
    first.on('a', callback).on('a', callback).on('b', callback)
    second.on('a', callback)
    expect(first.off('a', callback)).toBe(true)
    expect(await first.emit('a', 'removed')).toBeUndefined()
    expect(await first.emit('b', 'first')).toBe('first')
    expect(await second.emit('a', 'second')).toBe('second')
    expect(first.off('b', callback)).toBe(true)
    expect(second.off('a', callback)).toBe(true)
    expect(first.off('a', callback)).toBe(false)
    expect(callback.mock.calls).toEqual([['first'], ['second']])
  })

  it.each([false, true])('removes frozen callbacks with a custom converter: %s', async custom => {
    const app = createEventBus(custom ? {
      convertCallback2Middleware: fn => async (ctx, next) => {
        ctx.response = await fn(ctx.request)
        return next()
      }
    } : undefined)
    const callback = Object.freeze((value: string) => value)
    app.on('event', callback)
    expect(await app.emit('event', 'value')).toBe('value')
    expect(app.off('event', callback)).toBe(true)
    expect(await app.emit('event')).toBeUndefined()
  })
})

describe('execution regressions', () => {
  it('preserves synchronous context factory errors', () => {
    const error = new Error('context failed')
    const app = new Composie(() => { throw error })
    expect(() => app.run('event')).toThrow(error)
  })

  it('preserves onion order and isolates concurrent contexts', async () => {
    const app = new Composie()
    app.use(async (ctx, next) => {
      ctx.response = [ctx.request, 'before']
      await next()
      ctx.response.push('after')
    })
    app.route('event', async (ctx, next) => {
      await Promise.resolve()
      ctx.response.push('route')
      return next()
    })
    expect(await Promise.all([app.run('event', 'one'), app.run('event', 'two')])).toEqual([
      ['one', 'before', 'route', 'after'], ['two', 'before', 'route', 'after']
    ])
  })
})

describe('context accessor compatibility', () => {
  it('rejects errors thrown while reading a completed response', async () => {
    const error = new Error('response getter failed')
    const app = new Composie((channel, request) => ({
      channel, request,
      get response() { throw error },
    }))
    app.on('event', () => {})
    await expect(app.run('event')).rejects.toBe(error)
  })

  it('preserves synchronous channel accessor errors during preparation', () => {
    const error = new Error('channel getter failed')
    const app = new Composie(() => ({
      get channel(): string { throw error },
      request: undefined, response: undefined,
    }))
    expect(() => app.run('event')).toThrow(error)
  })
})
