# Changelog

## 1.2.0

- Add optional TypeScript request/response contracts through `createTypedComposie`.
- Fix alias registration, prefix middleware ordering, special channel names, and removal of shared or frozen event callbacks.
- Reject response accessor failures without leaving pending promises, while preserving synchronous context-factory exceptions.
- Add opt-in native ESM entries at `composie/dist/composie.mjs`; preserve existing CommonJS, bundler, and deep import paths.
- Clarify operation routing, middleware, aliases, and event callback semantics in the README; add an executable operations playground.
- Migrate development to pnpm, Vite, and Vitest, with Node.js 22/24 CI and legacy TypeScript declaration checks. Runtime output still targets ES2015 and has no dependencies.

Validation: 87 runtime tests, full source coverage, generated CJS/ESM consumer checks, and TypeScript 3.0/3.9 compatibility checks. No intentional breaking API changes.
