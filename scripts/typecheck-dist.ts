import Composie, { createEventBus, createTypedComposie } from '..'

interface Operations {
  lookup: { request: { id: string }; response: { name: string } }
  ping: { request: void; response: string }
}

const app = createTypedComposie<Operations>()
app.on('lookup', ctx => { ctx.response = { name: ctx.request.id } })
app.route({ ping: ctx => { ctx.response = 'pong' } })
const result: Promise<{ name: string } | undefined> = app.run('lookup', { id: '1' })
const aliased = app.alias('lookup', 'user')
const aliasResult: Promise<{ name: string } | undefined> = aliased.call('user', { id: '1' })
// @ts-expect-error published declarations reject invalid requests
app.run('lookup', { id: 123 })
// @ts-expect-error published declarations reject unknown channels
app.emit('missing')
// @ts-expect-error optional responses must be handled by callers
const required: Promise<{ name: string }> = app.run('lookup', { id: '1' })

new Composie().route('dynamic', ctx => { ctx.response = ctx.request }).run('dynamic', 42)
createEventBus().on('dynamic', request => request).emit('dynamic', 42)

const cleanup: () => boolean = app.subscribe('lookup', ctx => { ctx.response = { name: ctx.request.id } })
const removed: boolean = app.removeMiddleware('lookup')
// @ts-expect-error subscription declarations reject unknown channels
app.subscribe('missing', () => {})
// @ts-expect-error subscription declarations check response types
app.subscribe('lookup', ctx => { ctx.response = 42 })
