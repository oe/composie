# Composie

**Koa-style middleware for named async operations, with channel routing and request/response results.**

Use Composie when several operations need the same logging, authentication, error handling, or cache boundary. Register handlers by name, compose shared middleware, and `await` the result. It runs in Node.js and browsers, has no runtime dependencies, and does not require an HTTP server or a frontend framework.

> **New in 1.2.0:** optional channel contracts with `createTypedComposie`, a runnable operations playground, and fixes for aliases, prefix middleware, and callback removal. Existing `Composie` and `createEventBus` APIs remain compatible.

## Why use it?

Suppose `users/get`, `users/list`, and `system/ping` all need logging, but only user operations need authentication. You could repeat those checks inside every handler, or maintain a handler map plus your own middleware dispatcher. Composie supplies that dispatcher:

```text
run('users/get', request)
  → global logging
    → users/ authentication
      → cache lookup ── hit → return cached response
        → user handler ── miss → load and return response
  ← logging completes, including when a handler throws
```

- **Shared middleware:** apply it globally or to literal channel prefixes.
- **Async composition:** `await next()` wraps downstream work, including errors.
- **Short-circuiting:** set `ctx.response` and skip `next()` to stop the chain.
- **Named results:** `run()` resolves to `ctx.response`, rather than broadcasting and discarding results.
- **Optional TypeScript contracts:** check each channel's request, handler response, and call result.

## Install

```sh
pnpm add composie
# or
npm install composie
```

## Quick start

```js
import Composie from 'composie';
// CommonJS: const { default: Composie } = require('composie');
// Native Node.js ESM: import Composie from 'composie/dist/composie.mjs';

const operations = new Composie({ throwWhenNoRoute: true });

operations.use(async (ctx, next) => {
  console.log('start', ctx.channel);
  try {
    await next();
  } finally {
    console.log('end', ctx.channel);
  }
});

operations.use('users/', (ctx, next) => {
  // Demo only: replace this token check with your application's authentication.
  if (ctx.request.token !== 'demo-token') throw new Error('Unauthorized');
  return next();
});

operations.route('users/get', ctx => {
  ctx.response = { id: ctx.request.id, name: 'Alice' };
});

const user = await operations.run('users/get', { id: '1', token: 'demo-token' });
console.log(user); // { id: '1', name: 'Alice' }
```

Return or await `next()` to continue; omit it to stop. Exceptions reject the promise returned by `run()`, and upstream middleware can catch them.

## Typed operations

Declare one request/response contract per channel:

```ts
import { createTypedComposie } from 'composie';

interface User { id: string; name: string }
interface Operations {
  'users/get': { request: { id: string }; response: User }
  'system/ping': { request: void; response: string }
}

const operations = createTypedComposie<Operations>();

operations.route('users/get', ctx => {
  // ctx.request is { id: string }; ctx.response accepts User or undefined.
  ctx.response = { id: ctx.request.id, name: 'Alice' };
});
operations.on('system/ping', ctx => { ctx.response = 'pong' });

const user = await operations.run('users/get', { id: '1' }); // User | undefined
const pong = await operations.emit('system/ping');          // string | undefined

// TypeScript errors:
// operations.run('users/get', { id: 123 });
// operations.run('users/get');
// operations.run('unknown');
```

`on`, object-based route registration, `emit`, `call`, and callback removal use the same channel contracts. A request can be omitted when its type accepts `undefined` (including `void`). The result includes `undefined`, because a chain may stop without assigning a response.

Aliases retain their target's request and response types on the returned instance:

```ts
const withAlias = operations.alias('users/get', 'profile');
const profile = await withAlias.run('profile', { id: '1' }); // User | undefined
```

`ctx.channel` remains the caller's original channel string, including an alias. Global and prefix middleware use the shared context; route handlers get the channel-specific request and response types. Supply a second generic context type and `createContext` to add shared fields, as shown in the [complete example](examples/operations.ts).

These contracts are compile-time checks, not runtime payload validation. Validate untrusted input at the boundary, and ensure shared middleware preserves the declared response contracts. The existing `Composie` class and `createEventBus` remain available for dynamic channel names and callback styles.

## Runnable example

On this development branch, [examples/operations.ts](examples/operations.ts) combines logging, prefix authentication, a cache, two user operations, and an alias. The in-memory token check is illustrative; it is not a production authentication implementation.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the playground at `/test/web/` and click **Run demo**. It shows a first load, a cache hit, an alias call, a rejected request, and an operation outside the authenticated prefix. The example has regression tests that verify authentication still runs before a cached response is returned.

## When to choose Composie

| Requirement | A suitable choice |
| --- | --- |
| Tiny, synchronous event notifications | [mitt](https://github.com/developit/mitt) |
| A familiar EventEmitter API with `once` | [EventEmitter3](https://github.com/primus/eventemitter3) |
| Async event broadcasting, including serial listener execution | [Emittery](https://github.com/sindresorhus/emittery) |
| Compose middleware for a single pipeline | [koa-compose](https://github.com/koajs/compose) |
| A fetch client with HTTP features and retry helpers | [wretch](https://github.com/elbywan/wretch) |
| Named async operations with prefix middleware, short-circuiting, and a shared response | **Composie** |

Composie is useful when those middleware and dispatch concerns appear together. It does not provide HTTP transport, URL parameters, a task queue, durable messaging, or parallel event broadcasting.

## API

### Context and execution order

A context contains `channel`, `request`, and a mutable `response`. `createContext(channel, request)` can add shared application fields. The default context starts without a response.

The execution order is **global middleware → matching prefixes from shortest to longest → route handlers**. Within a group, handlers run in registration order. Middleware after `await next()` runs in reverse order, like Koa's onion model.

Prefixes are literal string prefixes: `api` also matches `apiary`; use `api/` when a slash boundary is needed. Aliases select their target's route and prefix middleware, while `ctx.channel` keeps the original name. Aliases resolve one level; point them at the original operation instead of chaining aliases.

### Registration and removal

| Method | Behavior |
| --- | --- |
| `use(middleware)` | Add global middleware. |
| `use(prefix, middleware)` | Add middleware for matching prefixes. |
| `route(channel, ...handlers)` / `on(...)` | Append handlers for a channel. |
| `route({ channel: handlerOrArray })` | Register several channels. |
| `alias(existingChannel, aliasName)` | Add an alias; throws `ROUTE_EXISTS` if the alias name already has a route. |
| `removeRoute(channel, callback?)` / `off(...)` | Remove every registration of that callback on the channel, or all handlers when omitted. Return whether anything was removed. Removing an alias removes the alias and keeps its target. |
| `run(channel, request?)` / `emit(...)` / `call(...)` | Run the chain and return a promise for `ctx.response`. |

Registration methods support chaining. Removing route callbacks leaves their registrations on other channels and instances intact.

### Options and errors

```js
const operations = new Composie({
  createContext: (channel, request) => ({ channel, request, response: undefined }),
  throwWhenNoRoute: true,
});
```

`throwWhenNoRoute` defaults to `false`. Without a route, matching middleware still runs. When enabled, a missing route reaches an error handler after middleware, so upstream middleware can catch `ComposieError` with code `ROUTE_NOT_FOUND` or short-circuit with its own response. Middleware errors reject the returned promise. For compatibility with 1.1.0, context-factory errors throw synchronously before a promise is returned. Calling the same `next()` more than once rejects with an error.

For a fallback, continue first and assign a response only if none was produced:

```js
operations.use(async (ctx, next) => {
  await next();
  if (ctx.response === undefined) ctx.response = 'fallback';
});
```

With `throwWhenNoRoute: true`, catch `ROUTE_NOT_FOUND` if you want to turn that error into a fallback response.

### Callback-style event bus

```js
import { createEventBus } from 'composie';

const events = createEventBus();
const listener = async user => `Welcome, ${user.name}`;

events.on('user/registered', listener);
console.log(await events.emit('user/registered', { name: 'Alice' }));
events.off('user/registered', listener);
```

The default converter awaits callbacks sequentially. The last callback returning a defined value supplies the response; `undefined` does not overwrite it. A rejection stops the chain. This is different from parallel event fan-out. `use()` still accepts `(ctx, next)` middleware, and `createEventBus` supports `createContext`, `throwWhenNoRoute`, and `convertCallback2Middleware` options.

## Lifecycle cleanup — unreleased

The following additions are on the development branch and are not part of npm 1.2.0. They help applications clean up handlers and shared middleware when a component or plugin is unmounted.

```js
const dispose = events.subscribe('user/registered', listener);
// Remove this subscription only, leaving other registrations of listener intact.
const removed = dispose(); // true if the registration was still present
// Further calls return false.

const authorize = (ctx, next) => next();
operations.use('users/', authorize);
operations.removeMiddleware('users/', authorize);
```

`subscribe(channel, callback)` accepts the same handler as `on()` and returns an idempotent `() => boolean` disposer. For `createEventBus`, callbacks receive the request; normal and typed Composie callbacks receive `(ctx, next)`. A disposer removes only its own registration, even when the same callback has been registered more than once. It captures the target at registration time, so later alias removal or reassignment does not change which handler it removes. It does not remove the alias itself. Existing `off(channel, callback)` still removes all matching registrations on a canonical channel, including subscriptions; calling `off` with an alias still removes that alias.

`removeMiddleware(callback?)` removes matching global middleware, or the whole global group when the callback is omitted. `removeMiddleware(prefix, callback?)` acts on one exact prefix group, preserving its child prefixes. It removes every registration of a supplied callback in that group and returns whether anything was removed. Empty tree nodes are pruned after cleanup. Both APIs affect future dispatches; a dispatch already started keeps its middleware and handler snapshot.

## Development

Use Node.js 22.12+ or Node.js 24 and the pnpm version pinned in `package.json`. If needed, install it with `npm install --global pnpm@12.8.1`.

```sh
pnpm install --frozen-lockfile
pnpm dev          # Vite playground
pnpm test         # Vitest with coverage
pnpm typecheck    # source, tests, examples, config, and positive/negative type fixtures
pnpm build        # checks, Vite bundles, and TypeScript declarations
pnpm test:dist    # CommonJS, ES module, and browser UMD smoke checks
```

The build preserves `dist/composie.umd.js`, `dist/composie.es.js`, and `dist/composie.d.ts`, with an ES2015 JavaScript target. Additional `dist/composie.mjs` and `dist/composie.d.mts` entries provide an opt-in native ESM import: `import Composie from 'composie/dist/composie.mjs'`. The existing package entry and deep import paths remain available. Native Node.js imports of the package root keep the CommonJS namespace default (`const { default: Composie } = namespace`); bundlers continue to use the `module` entry. A publish-only validation hook checks the build and distribution before an explicit npm release.

Bug reports and focused contributions are welcome through [GitHub issues](https://github.com/oe/composie/issues) and pull requests. Include a runnable reproduction and tests for behavior changes.

## License

[MIT](LICENSE)
