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
      '@forge-ui/code-generator': packageAlias('code-generator')
    }
  },
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html']
    }
  }
})
