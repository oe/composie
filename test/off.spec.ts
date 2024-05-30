import Composie, { ComposieError, COMPOSIE_ERROR_CODES } from '../src/composie';

describe('remove route', () => {

  it('remove channel', async () => {
    const composie = new Composie({ throwWhenNoRoute: true })
    composie.route('test', (ctx, next) => {
      ctx.response.route = 'with route'
    })
    composie.off('test')
    try {
      await composie.run('test') as any
      return Promise.reject('should throw error')
    } catch (error) {
      expect(error).toBeInstanceOf(ComposieError)
      expect((error as ComposieError).code).toBe(COMPOSIE_ERROR_CODES.ROUTE_NOT_FOUND)
    }
  })

  it('remove channel callback', async () => {
    const composie = new Composie({ throwWhenNoRoute: true })

    const fn1 = (ctx, next) => {
      ctx.response = (ctx.response || '') + '1'
      return next()
    }
    const fn2 = (ctx, next) => {
      ctx.response = (ctx.response || '') + '2'
      return next()
    }
    composie.route('test', fn1, fn2)
    const first = await composie.emit('test')
    expect(first).toBe('12')
    composie.off('test', fn1)
    const second = await composie.emit('test')
    expect(second).toBe('2')

    composie.off('test', fn1)
    composie.off('test', fn2)

    try {
      await composie.run('test') as any
      return Promise.reject('should throw error')
    } catch (error) {
      expect(error).toBeInstanceOf(ComposieError)
      expect((error as ComposieError).code).toBe(COMPOSIE_ERROR_CODES.ROUTE_NOT_FOUND)
    }
  })

  it('remove channel', async () => {
    const composie = new Composie({ throwWhenNoRoute: true })

    // just for make the test coverage to 100%
    // @ts-ignore
    composie.routers['test'] = []
    composie.off('test')
    try {
      await composie.run('test') as any
      return Promise.reject('should throw error')
    } catch (error) {
      expect(error).toBeInstanceOf(ComposieError)
      expect((error as ComposieError).code).toBe(COMPOSIE_ERROR_CODES.ROUTE_NOT_FOUND)
    }
  })
})
