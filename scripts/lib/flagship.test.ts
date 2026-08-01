import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { GeneratedProject } from '@forge-ui/contracts'
import expectedEval from '../../evals/flagship-saas/expected.json'
import { generateFlagship, materializeProject } from './flagship'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

async function outputDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'forgeui-test-'))
  directories.push(directory)
  return directory
}

describe('generated project materialization', () => {
  it('INT-001 writes the flagship project without changing file content', async () => {
    const directory = await outputDirectory()
    const project = generateFlagship('2026-08-01T00:00:00.000Z')
    const matchMap = Object.fromEntries(
      project.matches.map((match) => [match.nodeId, match.componentId])
    )
    const strategyMap = Object.fromEntries(
      project.matches.map((match) => [match.nodeId, match.strategy])
    )

    expect(matchMap).toEqual(expectedEval.expected.expectedMatches)
    expect(strategyMap).toEqual(expectedEval.expected.expectedStrategies)

    await materializeProject(project.project, directory)

    const expectedContent = project.project.files.find(
      (file) => file.path === 'src/sections/Hero.tsx'
    )!.content
    await expect(readFile(join(directory, 'src/sections/Hero.tsx'), 'utf8')).resolves.toBe(
      expectedContent
    )
  })

  it('UT-CODEGEN-008 rejects output path traversal', async () => {
    const directory = await outputDirectory()
    const generated = generateFlagship('2026-08-01T00:00:00.000Z')
    const project: GeneratedProject = {
      ...generated.project,
      files: [
        {
          path: '../escaped.txt',
          language: 'markdown',
          content: 'escape',
          contentHash: 'test'
        }
      ]
    }

    await expect(materializeProject(project, directory)).rejects.toThrow(/escaped output directory/)
  })
})
