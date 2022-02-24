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
    composie.use('test', (ctx, next) => {
      ctx.response = ctx.channel
    })
    const response = await composie.run('test')
    expect(response).toBe('test')
  })

  it('should match specified middleware', async () => {
    const composie = createComposie()
    composie.use('test', (ctx, next) => {
      ctx.response = ctx.channel
      return next()
    })
    composie.use('test', (ctx, next) => {
      ctx.response = 'second'
    })
    const response = await composie.run('test')
    expect(response).toBe('second')
  })
})