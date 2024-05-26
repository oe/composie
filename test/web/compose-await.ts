import Composie from '../../src/composie'
const harbor = new Composie()
// wait to get data
const getData = () => new Promise((resolve, reject) => {
  setTimeout(() => resolve('data retrieved'), 2000)
})



// harbor.use(async function fallback(ctx, next) {
//   try {
//     await next()
//   } catch (error) {
//     console.error('error caught', error)
//     console.error('ctx', ctx)
//   }
// })

harbor.use('i/', async function (ctx, next) {
  console.log('middleware I: received request', ctx.channel)
  return next()
})

harbor.use('api/', async function (ctx, next) {
  console.log('middleware API: received request', ctx.channel)
  return next()
})


harbor.on('api/user', async function (ctx, next) {
  ctx.response = 'user data ' + Date.now()
})


harbor.emit('api/user').then(console.log)

