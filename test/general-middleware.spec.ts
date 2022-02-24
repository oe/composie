import Composie from '../src/composie';

describe('general middleware', () => {
  const createComposie = (withDefaultMiddleware = true) => {
    const composie = new Composie()
    if (withDefaultMiddleware) {
      composie.use(function (ctx, next) {
        ctx.response = 'response-' + ctx.channel
        return next()
      })
    }
    return composie
  }
  
  it('should run general middleware', async () => {
    const composie = createComposie()
    const response = await composie.run('test')
    expect(response).toBe('response-test')
  })

  it('should run multi general middleware', async () => {
    const composie = createComposie()
    composie.use((ctx, next) => {
      ctx.response = ctx.channel
    })
    const response = await composie.run('test')
    expect(response).toBe('test')
  })

  it('should run only one general middleware with next', async () => {
    const composie = new Composie()
    composie.use((ctx, next) => {
      ctx.response = 'first'
    })
    composie.use((ctx, next) => {
      ctx.response = 'second'
      return next()
    })
    const response = await composie.run('abc')
    expect(response).toBe('first')
  })
})

describe('general middleware with custom context', () => { 
  it('simple context', async () => {
    const createContext = (channel: string, data: any) => {
      return {
        channel: channel,
        request: data,
        id: `${channel}-${Math.random().toString(36).slice(2)}`,
        response: ''
      }
    }
    const composie = new Composie(createContext)

    composie.use((ctx, next) => {
      ctx.response = ctx.id
      return next()
    })

    const response = await composie.run('test') as string
    expect(/^test\-[\w]+$/.test(response)).toBe(true)
  })
})