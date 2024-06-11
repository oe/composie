import Composie, { ComposieError, COMPOSIE_ERROR_CODES } from '../src/composie';

describe('route alias', () => {
  const createComposie = (withDefaultMiddleware = true) => {
    const composie = new Composie()
    if (withDefaultMiddleware) {
      composie.use(function (ctx, next) {
        ctx.response = {
          middleware: 'response-' + ctx.channel
        }
        return next()
      })
    }
    return composie
  }

  it('should run simple route', async () => {
    const composie = createComposie()
    composie.route('test', (ctx, next) => {
      ctx.response.route = 'with route'
    })
    composie.alias('test', 'demo')
    const response = await composie.run('demo') as any

    expect(response.route).toBe('with route')
  })

  it('should throw when add alias to existing routed', async () => {
    const composie = createComposie()
    composie.route('test', (ctx, next) => {
      ctx.response.route = 'with route'
    })
    try {
      composie.alias('ddd', 'test')
      return Promise.reject('should throw error')
    } catch (error) {
      expect(error).toBeInstanceOf(ComposieError)
      expect((error as ComposieError).code).toBe(COMPOSIE_ERROR_CODES.ROUTE_EXISTS)
    }
  })

  it('should not add alias when name duplicated', async () => {
    const composie = createComposie()
    composie.alias('demo', 'demo')
    // @ts-ignore
    expect(composie.aliasMap['demo']).toBeUndefined()
  })

  it('should throw when run alias has been removed', async () => {
    const composie = new Composie({ throwWhenNoRoute: true })
    try {
      composie.on('route:remove', (ctx) => {
        ctx.response = 'xxxx'
      })
      composie.alias('route:remove', 'demo')
      composie.off('demo')
      await composie.run('demo')
      return Promise.reject('should throw error')
    } catch (error) {
      expect(error).toBeInstanceOf(ComposieError)
      expect((error as ComposieError).code).toBe(COMPOSIE_ERROR_CODES.ROUTE_NOT_FOUND)
    }
  })

})
