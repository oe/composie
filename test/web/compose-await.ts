import Composie from '../../src/composie'
const harbor = new Composie()
// wait to get data
const getData = () => new Promise((resolve, reject) => {
  setTimeout(() => resolve('data retrived'), 2000)
})
async function one (ctx, next) {
  console.log('first one, wait for 2s')
  await getData()
  ctx.response += ' abcdefghijklmnopqrstuvwxyz'
  return next()
}
function two (ctx, next) {
  console.log('the second')

  return next()
}
function three (ctx, next) {
  console.log('the third')
  return next()
}

harbor.use(one).use(two).use(one).use(three)

const context = { channel: 'api/user-info', request: '', response: '' }

harbor.run(context).then(() => {
  console.log('done', context.response)
}, (e) => console.log('failed', e))
