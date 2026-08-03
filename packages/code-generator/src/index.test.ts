import { describe, expect, it } from 'vitest'
import type { ComponentRegistryManifest, GenerationPlan } from '@forge-ui/contracts'
import { stableHash } from '@forge-ui/shared'
import { generateProject } from './index'

const plan: GenerationPlan = {
  schemaVersion: '1.0',
  generationId: 'generation_test',
  sourceHash: 'source_test',
  versions: { inputSchema: '1.0', registry: '1.0.0', generator: '0.1.0' },
  page: { title: 'Test', description: 'Test page', rootNodeId: 'root' },
  imports: [{ path: '@forge-ui/example-external-ui', names: ['Button'] }],
  tokenResolution: {
    schemaVersion: '1.0',
    tokens: [
      {
        path: 'color.brand.primary',
        type: 'color',
        level: 'semantic',
        cssVariable: '--color-brand-primary',
        cssValue: '#7c5cff',
        resolvedValue: '#7c5cff'
      }
    ],
    summary: { total: 1, referenced: 0, reused: 0, created: 1, conflicts: 0 },
    diagnostics: []
  },
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
  const options = {
    createdAt: '2026-08-01T00:00:00.000Z',
    nodeCount: 3,
    matches: [
      {
        nodeId: 'cta',
        componentId: 'button',
        strategy: 'exact-component' as const,
        confidence: 'high' as const,
        reasons: [],
        incompatibilities: [],
        warnings: []
      }
    ]
  }

  it('UT-CODEGEN-001 produces stable files and hashes for the same plan', () => {
    const first = generateProject(plan, registry, options)
    const second = generateProject(plan, registry, options)

    expect(first.files).toEqual(second.files)
    expect(
      first.files.find((generatedFile) => generatedFile.path.endsWith('Hero.tsx'))?.content
    ).toContain('data-forge-node-id="hero"')
  })

  it('UT-CODEGEN-002 escapes untrusted HTML metadata', () => {
    const project = generateProject(
      {
        ...plan,
        page: {
          ...plan.page,
          title: '<script>"owned"</script>',
          description: "A&B <unsafe> 'quoted'"
        }
      },
      registry,
      options
    )
    const html = project.files.find((generatedFile) => generatedFile.path === 'index.html')!.content

    expect(html).toContain('&lt;script&gt;&quot;owned&quot;&lt;/script&gt;')
    expect(html).toContain('A&amp;B &lt;unsafe&gt; &#039;quoted&#039;')
    expect(html).not.toContain('<script>"owned"</script>')
  })

  it('UT-CODEGEN-003 emits JSX-looking hero text as a string expression', () => {
    const project = generateProject(
      {
        ...plan,
        hero: { ...plan.hero, title: '</h1><script>alert("x")</script>' }
      },
      registry,
      options
    )
    const hero = project.files.find((generatedFile) => generatedFile.path.endsWith('Hero.tsx'))!

    expect(hero.content).toContain('{"</h1><script>alert(\\"x\\")</script>"}')
    expect(hero.content).not.toContain('</h1>\n<script>')
  })

  it('UT-CODEGEN-004 sorts file paths and hashes every exact content string', () => {
    const project = generateProject(plan, registry, options)
    const paths = project.files.map((generatedFile) => generatedFile.path)

    expect(paths).toEqual([...paths].sort((left, right) => left.localeCompare(right)))
    for (const generatedFile of project.files) {
      expect(generatedFile.contentHash).toBe(stableHash(generatedFile.content))
    }
  })

  it('UT-CODEGEN-005 isolates the brand hex literal to tokens.css', () => {
    const project = generateProject(plan, registry, options)
    const containingBrand = project.files
      .filter((generatedFile) => generatedFile.content.includes('#7c5cff'))
      .map((generatedFile) => generatedFile.path)

    expect(containingBrand).toEqual(['src/tokens.css'])
  })

  it('UT-CODEGEN-006 emits an aria-hidden placeholder without a visual match', () => {
    const project = generateProject({ ...plan, hero: { ...plan.hero } }, registry, options)
    const hero = project.files.find((generatedFile) => generatedFile.path.endsWith('Hero.tsx'))!

    expect(hero.content).toContain('aria-hidden={true}')
    expect(hero.content).toContain('styles.visualPlaceholder')
  })

  it('UT-CODEGEN-007 records explicit versions, counts and deferred validators', () => {
    const project = generateProject(plan, registry, options)

    expect(project.manifest).toMatchObject({
      generationId: 'generation_test',
      createdAt: options.createdAt,
      registry: { id: 'test', version: '1.0.0' }
    })
    expect(project.report).toMatchObject({
      nodes: { total: 3, eligibleForComponentMatch: 1 },
      matches: { exact: 1, manual: 0 },
      tokens: { total: 1, referenced: 0, reused: 0, created: 1, conflicts: 0 },
      validation: { schema: 'passed', runtime: 'skipped', visual: 'skipped' }
    })
  })

  it('UT-CODEGEN-009 emits mixed default and named imports from the Generation Plan', () => {
    const project = generateProject(
      {
        ...plan,
        imports: [
          {
            path: '@forge-ui/example-external-ui',
            defaultName: 'ProductPreview',
            names: ['Button']
          }
        ],
        hero: {
          ...plan.hero,
          visual: {
            nodeId: 'visual',
            exportName: 'ProductPreview',
            importPath: '@forge-ui/example-external-ui'
          }
        }
      } as GenerationPlan,
      registry,
      options
    )
    const hero = project.files.find((generatedFile) => generatedFile.path.endsWith('Hero.tsx'))!

    expect(hero.content).toContain(
      'import ProductPreview, { Button } from "@forge-ui/example-external-ui";'
    )
  })
})
