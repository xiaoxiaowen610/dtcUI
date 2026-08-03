import { describe, expect, it } from 'vitest'
import input from '../../presets/saas/input.json'
import registry from '../../presets/saas/registry.json'
import { generateDesign } from '../../apps/engine/src/pipeline'
import {
  exportGeneratedProject,
  validateGeneratedProject
} from '../../packages/validation-export/src/index'

describe('Batch 05 end-to-end contract', () => {
  it('B05-INT-001 generates, validates and exports both build-compatible modes', async () => {
    const generated = generateDesign({ input, registry }, '2026-08-03T00:00:00.000Z')
    const report = await validateGeneratedProject(generated.project)

    expect(report.exportGate.allowed).toBe(true)
    expect(report.checks.find((check) => check.name === 'typescript')?.status).toBe('passed')
    expect(report.checks.find((check) => check.name === 'build')?.status).toBe('passed')

    const standalone = exportGeneratedProject(generated.project, report, {
      mode: 'standalone'
    })
    const integration = exportGeneratedProject(generated.project, report, {
      mode: 'integration'
    })

    expect(standalone.entries.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        'package.json',
        'index.html',
        'src/main.tsx',
        'forge/manifest.json',
        'forge/validation-report.json'
      ])
    )
    expect(integration.entries.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        'src/main.tsx',
        'src/LandingPage.tsx',
        'README.integration.md',
        'forge/dependencies.json'
      ])
    )
    expect(integration.entries.some((entry) => entry.path === 'package.json')).toBe(false)
    expect(standalone.archiveHash).not.toBe(integration.archiveHash)
  })
})
