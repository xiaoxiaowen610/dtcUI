import { describe, expect, it } from 'vitest'
import type { ComponentRegistryManifest, GenerationPlan } from '@forge-ui/contracts'
import { generateProject } from './index'

const plan: GenerationPlan = {
  schemaVersion: '1.0',
  generationId: 'generation_test',
  sourceHash: 'source_test',
  versions: { inputSchema: '1.0', registry: '1.0.0', generator: '0.1.0' },
  page: { title: 'Test', description: 'Test page', rootNodeId: 'root' },
  imports: [{ path: '@forge-ui/example-external-ui', names: ['Button'] }],
  hero: {
    id: 'hero',
    eyebrow: 'ForgeUI',
    title: 'Deterministic by design',
    description: 'A generated page.',
    actions: [
      {
        nodeId: 'cta',
        label: 'Start building',
        exportName: 'Button',
        importPath: '@forge-ui/example-external-ui',
        props: { variant: 'primary' }
      }
    ]
  },
  diagnostics: []
}

const registry: ComponentRegistryManifest = {
  schemaVersion: '1.0',
  registryId: 'test',
  registryVersion: '1.0.0',
  package: {
    name: '@forge-ui/example-external-ui',
    version: '0.1.0',
    allowedImportRoots: ['@forge-ui/example-external-ui']
  },
  components: [
    {
      id: 'button',
      displayName: 'Button',
      import: {
        path: '@forge-ui/example-external-ui',
        exportName: 'Button',
        style: 'named'
      },
      sourceKeys: ['button'],
      semantics: ['action'],
      props: [],
      capabilities: ['action']
    }
  ]
}

describe('generateProject', () => {
  it('produces stable source files for the same plan', () => {
    const options = { createdAt: '2026-08-01T00:00:00.000Z', nodeCount: 3, matches: [] }
    const first = generateProject(plan, registry, options)
    const second = generateProject(plan, registry, options)

    expect(first.files).toEqual(second.files)
    expect(
      first.files.find((generatedFile) => generatedFile.path.endsWith('Hero.tsx'))?.content
    ).toContain('data-forge-node-id="hero"')
  })
})
