import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

const packageAlias = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@forge-ui/contracts': packageAlias('contracts'),
      '@forge-ui/shared': packageAlias('shared'),
      '@forge-ui/design-ir': packageAlias('design-ir'),
      '@forge-ui/component-registry': packageAlias('component-registry'),
      '@forge-ui/generation-plan': packageAlias('generation-plan'),
      '@forge-ui/code-generator': packageAlias('code-generator'),
      '@forge-ui/token-resolver': packageAlias('token-resolver')
    }
  },
  test: {
    environment: 'node',
    include: [
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
      'apps/**/*.test.tsx',
      'scripts/**/*.test.ts'
    ],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'packages/*/src/index.ts',
        'packages/validation-export/src/{types,harness,jobs,bridge,export}.ts',
        'apps/engine/src/{pipeline,server,preview}.ts',
        'apps/studio/src/{App,services/engine,stores/workspace}.{ts,tsx}',
        'apps/studio/src/components/ValidationWorkbench.tsx',
        'scripts/lib/evaluation.ts'
      ],
      exclude: ['packages/example-external-ui/**'],
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 75,
        lines: 75
      }
    }
  }
})
