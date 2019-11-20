import typescript from 'rollup-plugin-typescript2'
// @ts-ignore
import { increaseVersion } from './build/update-pkg-version.ts'
const pkg = require('./package.json')
pkg.version = increaseVersion(pkg.version)

export default [
  {
    input: 'src/composie.ts',
    output: {
      name: 'Composie',
      banner: `/*!
 * Composie v${pkg.version}
 * Copyright© ${new Date().getFullYear()} Saiya ${pkg.homepage}
 */`,
      format: 'umd',
      file: `dist/composie.umd.js`
    },
    plugins: [
      typescript({
        tsconfigOverride: {
          compilerOptions: { module: 'esnext', target: 'es5' }
        },
        typescript: require('typescript')
      })
    ]
  },
  {
    input: 'src/composie.ts',
    output: {
      name: 'Composie',
      banner: `/*!
 * Composie v${pkg.version}
 * Copyright© ${new Date().getFullYear()} Saiya ${pkg.homepage}
 */`,
      format: 'es',
      file: `dist/composie.es.js`
    },
    plugins: [
      typescript({
        tsconfigOverride: {
          compilerOptions: { module: 'esnext' }
        },
        typescript: require('typescript')
      })
    ]
  }
]
