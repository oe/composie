import Composie, { ComposieError, COMPOSIE_ERROR_CODES } from '../src/composie';

describe('simple route', () => {
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
    const response = await composie.run('test') as any

    expect(response.route).toBe('with route')
  })

  it('call next multi times will cause error', async () => {
    const composie = createComposie()
    composie.route('test', async (ctx, next) => {
      ctx.response.route = 'with route'
      await next()
      await next()
    })
    return expect(composie.run('test')).rejects.toThrow()
  })

   it('will catch error when throw from route', async () => {
    const composie = createComposie()
    composie.route('test', (ctx, next) => {
      ctx.response.route = 'with route'
      throw new Error('test error')
    })
    return expect(composie.run('test')).rejects.toThrow()
  })

  it('get undefined when no corresponding route found', async () => {
    const composie = new Composie()
    const response = await composie.run('test')
    expect(response).toBeUndefined()
  })

  it('get undefined when no corresponding route found', async () => {
    const composie = new Composie()
    composie.use(async function (ctx, next) {
      try {
        await next()
      } catch (e: any) {
        ctx.response = {
          error: e.message,
          stack: e.stack
        }
      }
    })

    const response = await composie.run('test')
    expect(response).toBeUndefined()
  })

  it('get default result when fallback middleware provide', async () => {
    const composie = new Composie()
    composie.use(async function (ctx, next) {
      try {
        await next()
      } catch (e: any) {
        ctx.response = {
          error: e.message,
          stack: e.stack
        }
      }
    })
    composie.use(async function (ctx, next) {
      ctx.response = '404'
    })
    const response = await composie.run('test')
    expect(response).toBe('404')
  })
  // TODO: middleware execute sequence issue
  it.skip('get route result even when fallback middleware provide', async () => {
    const composie = new Composie()
    composie.use(async function (ctx, next) {
      try {
        await next()
      } catch (e: any) {
        ctx.response = {
          error: e.message,
          stack: e.stack
        }
      }
    })
    composie.route('test', (ctx, next) => {
      ctx.response = 'test'
    })

    composie.use(async function (ctx, next) {
      ctx.response = '404'
    })
    const response = await composie.run('test')
    expect(response).toBe('test')
  })

})

describe('multi route', () => {
  it('should run multi route', async () => {
    const composie = new Composie()
    composie.route({
      'test': (ctx, next) => {
        return ctx.response = 'test'
      },
      'demo': (ctx, next) => {
        return ctx.response = 'demo'
      }
    })
    const response = await composie.run('test')
    expect(response).toBe('test')
  })

  it('should run multi route with array', async () => {
    const composie = new Composie()
    composie.route({
      'test': [(ctx, next) => {
        ctx.response = 'test'
        return next()
      }, (ctx, next) => {
        ctx.response += '-second'
      }],
    })
    const response = await composie.run('test')
    expect(response).toBe('test-second')
  })

  it('should get undefined with empty route array', async () => {
    const composie = new Composie()
    composie.route({
      'test': [],
    })
    const response = await composie.run('test')
    expect(response).toBeUndefined()
  })

  it('should get undefined with empty route array', async () => {
    const composie = new Composie({})
    composie.route({
      'test': [],
    })
    const response = await composie.run('test')
    expect(response).toBeUndefined()
  })
})


describe('route not found', () => {
  it('should throw error when route not found', async () => {
    const composie = new Composie({
      throwWhenNoRoute: true
    })
    return expect(composie.run('test')).rejects.toThrow()
  })

  it('should throw error when route not found with throwWhenNoRoute', async () => {
    const composie = new Composie()
    // @ts-ignore
    composie.throwWhenNoRoute = true
    try {
      await composie.run('test')
    } catch (error) {
      expect(error).toBeInstanceOf(ComposieError)
      expect((error as ComposieError).code).toBe(ComposieError.CODES.ROUTE_NOT_FOUND)
    }
  })

  it('should not throw error when route not found with throwWhenNoRoute false', async () => {
    const composie = new Composie()
    // @ts-ignore
    composie.throwWhenNoRoute = false
    const response = await composie.run('test')
    expect(response).toBeUndefined()
  })
})
