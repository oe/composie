import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";

const config = [
  {
    input: 'src/composie.ts',
    output: {
      file: 'dist/composie.umd.js',
      format: 'umd',
      name: 'Composie',
      sourcemap: false,
    },
    plugins: [typescript()]
  },
  {
    input: 'src/composie.ts',
    output: {
      file: 'dist/composie.es.js',
      format: 'es',
      sourcemap: false,
    },
    plugins: [typescript()]
  },
  {
    input: 'src/composie.ts',
    output: {
      file: 'dist/composie.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];
export default config;
