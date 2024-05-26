import Composie from '../../src/composie'
const harbor = new Composie()
// wait to get data
const getData = () => new Promise((resolve, reject) => {
  setTimeout(() => resolve('data retrieved'), 2000)
})

async function fallback(ctx, next) {
  try {
    await next()
  } catch (error) {
    console.error('error caught', error)
    console.error('ctx', ctx)
  }
}

async function one (ctx, next) {
  console.log('first one, wait for 2s')
  await getData()
  ctx.response = (ctx.response || '') +  ' abcdefghijklmnopqrstuvwxyz'
  return next()
}
function two (ctx, next) {
  console.log('the second')
  return next()
}
function three (ctx, next) {
  console.log('the third')
  if (ctx.response) {
    ctx.response += ' from third middleware /'
  } else {
    ctx.response = 'from third middleware'
  }
  return next()
}

harbor.use(fallback).use(one).use(two).use(one).use(three)

harbor.on('test', async (ctx, next) => {
  ctx.response.route = 'with route'
  // throw new Error('test error')
  await next()
  await next()
})

harbor.on('sync-test', (ctx, next) => {
  ctx.response = 'with route'
  throw new Error('test error')
})



harbor.emit('api/user-info').then((response) => {
  console.log('done', response)
}, (e) => console.log('failed', e))

harbor.emit('test').catch((error) => {
  console.log('failed', error)
})

harbor.run('sync-test', 'aaa')
