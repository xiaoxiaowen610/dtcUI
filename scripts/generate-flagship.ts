import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateFlagship, materializeProject } from './lib/flagship'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputRoot = resolve(repositoryRoot, '.forge-output', 'flagship')

await rm(outputRoot, { recursive: true, force: true })
await mkdir(outputRoot, { recursive: true })

const result = generateFlagship()
await materializeProject(result.project, outputRoot)

process.stdout.write(
  `Generated ${result.project.files.length} files at ${outputRoot}\nGeneration: ${result.plan.generationId}\n`
)
