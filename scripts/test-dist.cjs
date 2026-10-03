const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

async function check(exports) {
  const app = new exports.default()
  app.on('route', (ctx) => { ctx.response = ctx.request })
  assert.equal(await app.run('route', 'response'), 'response')
  const bus = exports.createEventBus()
  const callback = Object.freeze(value => value)
  bus.on('__proto__', callback)
  assert.equal(await bus.emit('__proto__', 'event'), 'event')
  assert.equal(bus.off('__proto__', callback), true)
  assert.equal(await bus.emit('__proto__'), undefined)
  const typed = exports.createTypedComposie()
  typed.on('operation', ctx => { ctx.response = ctx.request })
  assert.equal(await typed.run('operation', 'typed factory'), 'typed factory')
}

async function main() {
  await check(require('..'))
  const legacyNativeImport = await import(require.resolve('../dist/composie.umd.js'))
  await check(legacyNativeImport.default)
  await check(await import('../dist/composie.mjs'))
  await check(require('../dist/composie.umd.js'))
  const esm = fs.readFileSync(require.resolve('../dist/composie.es.js'), 'utf8')
  await check(await import(`data:text/javascript;base64,${Buffer.from(esm).toString('base64')}`))
  const browser = vm.createContext({})
  vm.runInContext(fs.readFileSync(require.resolve('../dist/composie.umd.js'), 'utf8'), browser)
  await check(browser.Composie)
  console.log('CommonJS, ES module, and browser UMD smoke checks passed')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
