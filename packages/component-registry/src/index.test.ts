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
      props: [
        { name: 'label', type: 'string', required: true },
        { name: 'disabled', type: 'boolean' },
        { name: 'count', type: 'number' },
        { name: 'variant', type: 'enum', values: ['primary', 'secondary'] }
      ],
      capabilities: ['action']
    }
  ]
}

function documentWith(props: Record<string, unknown>, componentKey = 'design.button') {
  return createDesignDocument({
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
          componentKey,
          props
        }
      ]
    }
  })
}

function firstMatch(props: Record<string, unknown>, componentKey?: string) {
  return matchComponents(documentWith(props, componentKey), validateRegistry(registry))[0]
}

describe('component Registry validation', () => {
  it('BL-REG-002 rejects imports outside the Registry allowlist', () => {
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
    ).toThrowError(expect.objectContaining<Partial<RegistryError>>({ name: 'RegistryError' }))
  })

  it('SEC-001 rejects an import root lookalike', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        components: [
          {
            ...registry.components[0],
            import: { path: '@example/ui-evil', exportName: 'Button', style: 'named' }
          }
        ]
      })
    ).toThrowError(/non-allowlisted/)
  })

  it('BL-REG-003 rejects a duplicate Source Key', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        components: [
          registry.components[0],
          { ...registry.components[0], id: 'button-copy', displayName: 'Button Copy' }
        ]
      })
    ).toThrowError(/registered more than once/)
  })

  it('BL-REG-010 rejects an enum without allowed values', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        components: [
          {
            ...registry.components[0],
            props: [{ name: 'variant', type: 'enum' }]
          }
        ]
      })
    ).toThrowError(/enum without allowed values/)
  })

  it('rejects duplicate prop definitions', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        components: [
          {
            ...registry.components[0],
            props: [
              { name: 'label', type: 'string' },
              { name: 'label', type: 'string' }
            ]
          }
        ]
      })
    ).toThrowError(/declares prop label more than once/)
  })
})

describe('component matching compatibility', () => {
  it('BL-REG-001 exactly matches a compatible Source Key', () => {
    expect(
      firstMatch({ label: 'Start', disabled: false, count: 1, variant: 'primary' })
    ).toMatchObject({
      nodeId: 'cta',
      componentId: 'button',
      strategy: 'exact-component',
      confidence: 'high',
      incompatibilities: []
    })
  })

  it('BL-REG-004 routes an unknown Source Key to manual review', () => {
    expect(firstMatch({ label: 'Start' }, 'design.unknown')).toMatchObject({
      strategy: 'manual-review',
      confidence: 'low',
      reasons: ['No component registered for design.unknown.']
    })
  })

  it('BL-REG-005 lists a missing required prop', () => {
    expect(firstMatch({})).toMatchObject({
      strategy: 'manual-review',
      incompatibilities: ['Missing required prop: label.']
    })
  })

  it('BL-REG-006 lists wrong primitive prop types', () => {
    expect(firstMatch({ label: 'Start', disabled: 'false', count: '1' })).toMatchObject({
      strategy: 'manual-review',
      incompatibilities: [
        'Prop disabled expected boolean but received string.',
        'Prop count expected number but received string.'
      ]
    })
  })

  it('BL-REG-007 lists values outside an enum contract', () => {
    expect(firstMatch({ label: 'Start', variant: 'danger' })).toMatchObject({
      strategy: 'manual-review',
      incompatibilities: ['Prop variant must be one of primary, secondary.']
    })
  })

  it('BL-REG-008 lists unknown props in stable order', () => {
    expect(firstMatch({ label: 'Start', zeta: 1, alpha: 2 })).toMatchObject({
      strategy: 'manual-review',
      incompatibilities: ['Unknown props: alpha, zeta.']
    })
  })

  it('BL-REG-009 allows omitted optional props', () => {
    expect(firstMatch({ label: 'Start' })?.strategy).toBe('exact-component')
  })
})
