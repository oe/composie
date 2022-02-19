import Composie from '../../src/composie'
const harbor = new Composie((channel, data) => {
  return {
    channel,
    request: data,
    name: 'title',
  }
})
// wait to get data
const getData = () => new Promise((resolve, reject) => {
  setTimeout(() => resolve('data retrieved'), 2000)
})
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

harbor.use(one).use(two).use(one).use(three)

harbor.run('api/user-info').then((response) => {
  console.log('done', response)
}, (e) => console.log('failed', e))
