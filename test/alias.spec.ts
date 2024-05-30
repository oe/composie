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

  it('should throw when add alias to existing route', async () => {
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

})
