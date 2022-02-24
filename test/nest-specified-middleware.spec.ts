import Composie from '../src/composie';

describe('specified middleware', () => {
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

  it('should match specified middleware', async () => {
    const composie = createComposie()
    composie.use('api/', (ctx, next) => {
      ctx.response = ctx.channel
      return next()
    })
    composie.use('api/demo', (ctx, next) => {
      ctx.response += '-demo'
    })
    const response = await composie.run('api/demo')
    expect(response).toBe('api/demo-demo')
  })

  it('should not match nest specified middleware', async () => {
    const composie = createComposie()
    composie.use('api/', (ctx, next) => {
      ctx.response = ctx.channel
      return next()
    })
    composie.use('api/demo', (ctx, next) => {
      ctx.response += '-demo'
    })
    const response = await composie.run('api/sample')
    expect(response).toBe('api/sample')
  })

  it('should match 2 nest specified middleware', async () => {
    const composie = createComposie()
    composie.use('api/', (ctx, next) => {
      ctx.response = ctx.channel
      return next()
    })
    composie.use('api/demo', (ctx, next) => {
      ctx.response += '-demo'
      return next()
    })
    composie.use('api/demo', (ctx, next) => {
      ctx.response += '-demo'
      return next()
    })
    const response = await composie.run('api/demo')
    expect(response).toBe('api/demo-demo-demo')
  })

  it('add nest middleware in different order', async () => {
    const composie = createComposie()
    
    composie.use('api/demo', (ctx, next) => {
      ctx.response += '-demo'
      return next()
    })
    composie.use('api/demo', (ctx, next) => {
      ctx.response += '-demo'
      return next()
    })
    composie.use('api/', (ctx, next) => {
      ctx.response = ctx.channel
      return next()
    })
    const response = await composie.run('api/demo')
    expect(response).toBe('api/demo-demo-demo')
  })
})