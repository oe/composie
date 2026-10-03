import Composie, { createTypedComposie } from 'composie'

new Composie().on('dynamic', ctx => { ctx.response = ctx.request })
const app = createTypedComposie<{
  lookup: { request: { id: string }; response: { name: string } }
}>()
app.on('lookup', ctx => { ctx.response = { name: ctx.request.id } })
const result: Promise<{ name: string } | undefined> = app.run('lookup', { id: '1' })
// @ts-expect-error native ESM declarations enforce payload types
app.run('lookup', { id: 1 })
