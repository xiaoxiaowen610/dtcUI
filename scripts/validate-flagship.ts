import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import react from '@vitejs/plugin-react'
import { build } from 'vite'
import { generateFlagship, materializeProject } from './lib/flagship'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const validationParent = resolve(repositoryRoot, '.forge-output')
await mkdir(validationParent, { recursive: true })
const outputRoot = await mkdtemp(join(validationParent, 'validate-'))
const executeFile = promisify(execFile)

try {
  const result = generateFlagship('2026-08-01T00:00:00.000Z')
  await materializeProject(result.project, outputRoot)

  await executeFile(process.execPath, [
    resolve(repositoryRoot, 'node_modules', 'typescript', 'bin', 'tsc'),
    '--noEmit',
    '--project',
    resolve(outputRoot, 'tsconfig.json')
  ])

  await build({
    root: outputRoot,
    configFile: false,
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: '@forge-ui/example-external-ui',
          replacement: resolve(repositoryRoot, 'packages/example-external-ui/src/index.tsx')
        },
        {
          find: 'react/jsx-runtime',
          replacement: resolve(repositoryRoot, 'apps/studio/node_modules/react/jsx-runtime.js')
        },
        {
          find: 'react-dom/client',
          replacement: resolve(repositoryRoot, 'apps/studio/node_modules/react-dom/client.js')
        },
        {
          find: /^react$/,
          replacement: resolve(repositoryRoot, 'apps/studio/node_modules/react/index.js')
        }
      ]
    },
    logLevel: 'warn'
  })

  process.stdout.write(
    `Flagship validation passed: ${result.summary.exactMatches} exact matches, TypeScript passed, Vite build passed.\n`
  )
} finally {
  await rm(outputRoot, { recursive: true, force: true })
}
