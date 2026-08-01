import { describe, expect, it } from 'vitest'
import { createDesignDocument } from '@forge-ui/design-ir'
import { matchComponents, RegistryError, validateRegistry } from './index'

const registry = {
  schemaVersion: '1.0',
  registryId: 'test',
  registryVersion: '1.0.0',
  package: {
    name: '@example/ui',
    version: '1.0.0',
    allowedImportRoots: ['@example/ui']
  },
  components: [
    {
      id: 'button',
      displayName: 'Button',
      import: { path: '@example/ui', exportName: 'Button', style: 'named' },
      sourceKeys: ['design.button'],
      semantics: ['action'],
      props: [],
      capabilities: ['action']
    }
  ]
} as const

describe('component Registry', () => {
  it('matches an exact Source Key deterministically', () => {
    const document = createDesignDocument({
      schemaVersion: '1.0',
      documentId: 'test',
      source: { type: 'preset', name: 'test' },
      root: {
        id: 'root',
        name: 'Page',
        type: 'page',
        children: [
          {
            id: 'cta',
            name: 'CTA',
            type: 'component',
            componentKey: 'design.button'
          }
        ]
      }
    })

    const matches = matchComponents(document, validateRegistry(registry))
    expect(matches).toMatchObject([
      { nodeId: 'cta', componentId: 'button', strategy: 'exact-component', confidence: 'high' }
    ])
  })

  it('rejects imports outside the Registry allowlist', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        components: [
          {
            ...registry.components[0],
            import: { path: 'untrusted-package', exportName: 'Button', style: 'named' }
          }
        ]
      })
    ).toThrowError(RegistryError)
  })
})
