import { globSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const COVERAGE_EXCLUDE = ['**/*.test.{ts,tsx}', '**/testing/**']

// Per-file floor for the shared pages: the global thresholds below are an average, so a single untested page could
// hide behind well-tested ones. Each matching file gets its own threshold entry.
const PER_FILE_GATED = ['packages/ui/src/pages/*.tsx']
const PER_FILE_FLOOR = { lines: 40, statements: 40, functions: 30, branches: 30 }

const perFileThresholds = Object.fromEntries(
  globSync(PER_FILE_GATED, { cwd: import.meta.dirname, exclude: COVERAGE_EXCLUDE })
    .map((file) => file.replaceAll('\\', '/'))
    .sort()
    .map((file) => [file, PER_FILE_FLOOR]),
)

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Node 25+ defines its own `localStorage` global (Web Storage), which is undefined unless
    // --localstorage-file is given. Because jsdom's window is the global object in tests, that getter
    // shadows jsdom's working Storage. Turning Node's implementation off in the workers lets jsdom's through.
    execArgv: ['--no-webstorage'],
    include: ['packages/ui/src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['packages/ui/src/**/*.{ts,tsx}'],
      exclude: COVERAGE_EXCLUDE,
      thresholds: { lines: 45, functions: 40, statements: 40, branches: 40, ...perFileThresholds },
    },
  },
})
