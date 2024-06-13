import Composie, { ComposieError, COMPOSIE_ERROR_CODES } from '../src/composie';

describe('useEventCallbackStyle', () => {
  const createComposie = (throwWhenNoRoute?: boolean, customConverter?: Function) => {
    const composie = new Composie({
      // @ts-ignore
      useEventCallbackStyle: customConverter || true,
      throwWhenNoRoute,
    })
    return composie
  }

  it('should run simple route', async () => {
    const composie = createComposie()
    composie.on('test', (params) => {
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

    composie.on('demo', (message) => message.response = message.request)
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
