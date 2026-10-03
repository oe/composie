import { defineConfig } from 'vitest/config'

export default defineConfig({
  build: {
    target: 'es2015',
    lib: {
      entry: 'src/composie.ts',
      name: 'Composie',
      formats: ['es', 'umd'],
      fileName: format => `composie.${format}.js`,
    },
    rolldownOptions: {
      output: { exports: 'named' },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html', 'json-summary'],
    },
  },
})
