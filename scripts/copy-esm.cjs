const { copyFileSync } = require('node:fs')

// Explicit extensions let native Node.js imports load both code and declarations
// as ESM without changing the existing CommonJS package or legacy filenames.
copyFileSync('dist/composie.es.js', 'dist/composie.mjs')
copyFileSync('dist/composie.d.ts', 'dist/composie.d.mts')
