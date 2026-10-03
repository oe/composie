import { createEventBus, ComposieError, COMPOSIE_ERROR_CODES } from '../src/composie';

describe('useEventCallbackStyle', () => {
  const createComposie = (throwWhenNoRoute?: boolean, customConverter?: Function) => {
    const composie = createEventBus({
      // @ts-ignore
      convertCallback2Middleware: customConverter,
      throwWhenNoRoute,
    })
    return composie
  }

  it('should run simple route', async () => {
    const composie = createComposie()
    composie.route('test', (params) => {
      return params + '-with route'
    })
    const response = await composie.emit('test', 'test')
    expect(response).toBe('test-with route')
  })

  it('should be removed appropriately', async () => {
    const composie = createComposie(true)
    const callback =  (params) => {
      return params + '-with route'
    }
    composie.on('test', callback)
    const result = composie.off('test', callback)
    expect(result).toBe(true)
    try {
      await composie.emit('test', 'test')
      return Promise.reject('should throw error')
    } catch (error) {
      expect(error).toBeInstanceOf(ComposieError)
      expect((error as ComposieError).code).toBe(COMPOSIE_ERROR_CODES.ROUTE_NOT_FOUND)
    }
  })

  it('should return last response defined value', async () => {
    const composie = createComposie()
    composie.on('test', (params) => {
      return params + '-with route'
    })
    composie.on('test', (params) => {
      return params + '-with route2'
    })
    composie.on('test', (params) => {
      console.log('test')
    })
    const response = await composie.emit('test', 'test')
    expect(response).toBe('test-with route2')
  })

  it('using a custom converter', async () => {
    const composie = createComposie(true, (fn) => fn)

    composie.on('demo', (ctx) => ctx.response = ctx.request)
    const response = await composie.emit('demo', 'message')

    expect(response).toBe('message')
  })

  it('using default params', async () => {
    const composie = createEventBus()

    composie.on('demo', (message) => message)
    const response = await composie.emit('demo', 'message')

    expect(response).toBe('message')
  })

  it('should use custom converter', async () => {
    const composie = createComposie(true, (fn) => {
      const middleware = async (ctx, next) => {
        const res = await fn(ctx.request)
        if (!res) return next()
        if (typeof res.response !== 'undefined') {
          ctx.response = res.response
        }
        return res.cancel ? undefined : next()
      }

      return middleware
    })

    // @ts-ignore
    composie.on('demo', (message) => ({response: message, cancel: message === 'message'}))
    composie.on('demo', (message) => ({response: 'next'}))
    const res = await composie.emit('demo', 'message')
    expect(res).toBe('message')
    const res2 = await composie.emit('demo', 'message2')
    expect(res2).toBe('next')
  })

})

describe('shared custom converter output', () => {
  it('removes only the matching original callback when a converter reuses middleware', async () => {
    const shared = (ctx, next) => { ctx.response = (ctx.response || 0) + 1; return next() }
    const bus = createEventBus({ convertCallback2Middleware: () => shared })
    const first = () => 'first'
    const second = () => 'second'
    bus.on('event', first).on('event', second)
    expect(await bus.emit('event')).toBe(2)
    expect(bus.off('event', first)).toBe(true)
    expect(await bus.emit('event')).toBe(1)
    expect(bus.off('event', first)).toBe(false)
    expect(bus.off('event', second)).toBe(true)
    expect(await bus.emit('event')).toBeUndefined()
  })

  it('retains removal by the converted middleware for legacy custom converters', async () => {
    const shared = (ctx, next?: Function) => { ctx.response = ctx.request; return next!() }
    const bus = createEventBus({ convertCallback2Middleware: () => shared })
    bus.on('event', () => 'original')
    expect(bus.off('event', shared)).toBe(true)
    expect(await bus.emit('event', 'removed')).toBeUndefined()
  })
})
