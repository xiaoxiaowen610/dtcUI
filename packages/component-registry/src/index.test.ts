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

function matchNode(node: Record<string, unknown>, registryCandidate: unknown = registry) {
  const document = createDesignDocument({
    schemaVersion: '1.0',
    documentId: 'matching-test',
    source: { type: 'preset', name: 'matching-test' },
    root: {
      id: 'root',
      name: 'Page',
      type: 'page',
      children: [{ id: 'target', name: 'Target', type: 'component', ...node }]
    }
  })

  return matchComponents(document, validateRegistry(registryCandidate))[0]!
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

  it('BL-REG-012 rejects an export name that cannot be a JavaScript binding', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        components: [
          {
            ...registry.components[0],
            import: { path: '@example/ui', exportName: 'bad-name', style: 'named' }
          }
        ]
      })
    ).toThrowError(/valid JavaScript identifier/)
  })

  it('BL-REG-013 rejects prop names that cannot be emitted as safe JSX attributes', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        components: [
          {
            ...registry.components[0],
            props: [{ name: 'bad prop', type: 'string' }]
          }
        ]
      })
    ).toThrowError(/safe JSX attribute/)
  })

  it('BL-REG-014 rejects conflicting default bindings from one module', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        components: [
          {
            ...registry.components[0],
            import: { path: '@example/ui', exportName: 'Button', style: 'default' }
          },
          {
            ...registry.components[0],
            id: 'card',
            displayName: 'Card',
            sourceKeys: ['design.card'],
            import: { path: '@example/ui', exportName: 'Card', style: 'default' }
          }
        ]
      })
    ).toThrowError(/conflicting default bindings/)
  })

  it('BL-REG-015 rejects duplicate component IDs', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        components: [
          registry.components[0],
          {
            ...registry.components[0],
            displayName: 'Other Button',
            sourceKeys: ['design.other-button']
          }
        ]
      })
    ).toThrowError(/Component ID button is registered more than once/)
  })

  it('BL-REG-016 rejects local binding collisions across Registry imports', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        components: [
          registry.components[0],
          {
            ...registry.components[0],
            id: 'nested-button',
            displayName: 'Nested Button',
            sourceKeys: ['design.nested-button'],
            import: { path: '@example/ui/nested', exportName: 'Button', style: 'named' }
          }
        ]
      })
    ).toThrowError(/reuses local binding Button/)
  })

  it('B03-UT-004 rejects an Adapter that maps into an unknown target prop', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        adapters: [
          {
            id: 'invalid-adapter',
            targetComponentId: 'button',
            sourceKeys: ['legacy.button'],
            propMap: { tone: 'missingProp' }
          }
        ]
      })
    ).toThrowError(/maps to unknown prop missingProp/)
  })

  it('B03-UT-004B rejects ambiguous semantic Adapters', () => {
    const adapter = {
      id: 'action-adapter-a',
      targetComponentId: 'button',
      semantics: ['legacy-action'],
      propMap: {},
      defaults: { label: 'Start' }
    }

    expect(() =>
      validateRegistry({
        ...registry,
        adapters: [adapter, { ...adapter, id: 'action-adapter-b' }]
      })
    ).toThrowError(/Adapter semantic legacy-action is registered more than once/)
  })

  it('B03-UT-005 rejects a Recipe with an unregistered member', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        recipes: [
          {
            id: 'invalid-recipe',
            displayName: 'Invalid recipe',
            semantics: ['feature-with-cta'],
            componentIds: ['missing-card']
          }
        ]
      })
    ).toThrowError(/references unknown component missing-card/)
  })

  it('B03-SEC-001 rejects allowlisted import paths containing traversal segments', () => {
    expect(() =>
      validateRegistry({
        ...registry,
        components: [
          {
            ...registry.components[0],
            import: { path: '@example/ui/../../untrusted', exportName: 'Button', style: 'named' }
          }
        ]
      })
    ).toThrowError(/non-allowlisted path/)
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
      reasons: ['No compatible component, Adapter, Recipe, or native fallback for design.unknown.']
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

  it('B03-UT-002 never lets semantic score override a failed exact-match constraint', () => {
    const match = matchNode({
      semantic: 'action',
      componentKey: 'design.button',
      props: {}
    })

    expect(match).toMatchObject({
      componentId: 'button',
      strategy: 'manual-review',
      confidence: 'low',
      incompatibilities: ['Missing required prop: label.'],
      warnings: ['Hard constraints cannot be overridden by semantic score.']
    })
  })

  it('B03-UT-003 applies declared Adapter renames, defaults, and enum maps', () => {
    const match = matchNode(
      { componentKey: 'legacy.button', props: { tone: 'hot' } },
      {
        ...registry,
        adapters: [
          {
            id: 'legacy-button-adapter',
            targetComponentId: 'button',
            sourceKeys: ['legacy.button'],
            propMap: { tone: 'variant' },
            defaults: { label: 'Start' },
            enumMap: { tone: { hot: 'primary', quiet: 'secondary' } }
          }
        ]
      }
    )

    expect(match).toMatchObject({
      componentId: 'button',
      strategy: 'adapted-component',
      confidence: 'high',
      adaptedProps: { label: 'Start', variant: 'primary' }
    })
  })

  it('B03-UT-003B selects an unambiguous Adapter by semantic', () => {
    const match = matchNode(
      { semantic: 'legacy-action', componentKey: 'legacy.unknown', props: { tone: 'quiet' } },
      {
        ...registry,
        adapters: [
          {
            id: 'semantic-button-adapter',
            targetComponentId: 'button',
            semantics: ['legacy-action'],
            propMap: { tone: 'variant' },
            defaults: { label: 'Continue' },
            enumMap: { tone: { quiet: 'secondary' } }
          }
        ]
      }
    )

    expect(match).toMatchObject({
      componentId: 'button',
      strategy: 'adapted-component',
      adaptedProps: { label: 'Continue', variant: 'secondary' }
    })
  })

  it('B03-UT-005 selects a validated Recipe after registered candidates fail', () => {
    const match = matchNode(
      { semantic: 'feature-with-cta', componentKey: 'unknown.feature', props: {} },
      {
        ...registry,
        recipes: [
          {
            id: 'feature-action',
            displayName: 'Feature action',
            semantics: ['feature-with-cta'],
            componentIds: ['button'],
            requiredCapabilities: ['action']
          }
        ]
      }
    )

    expect(match).toMatchObject({
      recipeId: 'feature-action',
      strategy: 'registered-recipe',
      confidence: 'medium'
    })
  })

  it('B03-UT-006 resolves equal semantic scores by stable component ID', () => {
    const second = {
      ...registry.components[0],
      id: 'alpha-button',
      displayName: 'Alpha Button',
      import: { path: '@example/ui', exportName: 'AlphaButton', style: 'named' },
      sourceKeys: ['design.alpha']
    }
    const first = {
      ...registry.components[0],
      id: 'zeta-button',
      displayName: 'Zeta Button',
      import: { path: '@example/ui', exportName: 'ZetaButton', style: 'named' },
      sourceKeys: ['design.zeta']
    }
    const match = matchNode(
      { semantic: 'action', componentKey: 'design.unknown', props: { label: 'Start' } },
      { ...registry, components: [first, second] }
    )

    expect(match).toMatchObject({
      componentId: 'alpha-button',
      strategy: 'adapted-component',
      ruleScore: 100
    })
  })

  it('B03-UT-007 holds an overlapping semantic score for manual confirmation', () => {
    const match = matchNode({
      semantic: 'primary-action-extra',
      componentKey: 'design.unknown',
      props: { label: 'Start' }
    })

    expect(match).toMatchObject({
      componentId: 'button',
      strategy: 'manual-review',
      confidence: 'medium',
      ruleScore: 80
    })
  })

  it('B03-UT-008 emits a safe native element when no component is compatible', () => {
    const match = matchNode({
      semantic: 'heading',
      componentKey: 'design.unknown',
      props: {},
      content: { kind: 'text', value: 'Heading' }
    })

    expect(match).toMatchObject({
      nativeElement: 'h2',
      strategy: 'native-element',
      confidence: 'medium'
    })
  })

  it('B03-BL-001 gives an exact Source Key priority over a high-scoring candidate', () => {
    const semanticCandidate = {
      ...registry.components[0],
      id: 'semantic-button',
      displayName: 'Semantic Button',
      import: { path: '@example/ui', exportName: 'SemanticButton', style: 'named' },
      sourceKeys: ['design.semantic']
    }
    const match = matchNode(
      { semantic: 'action', componentKey: 'design.button', props: { label: 'Start' } },
      { ...registry, components: [semanticCandidate, registry.components[0]] }
    )

    expect(match).toMatchObject({
      componentId: 'button',
      strategy: 'exact-component',
      ruleScore: 100
    })
  })

  it('B03-BL-002 rejects an exact component when a required token is unavailable', () => {
    const match = matchNode(
      { componentKey: 'design.button', props: { label: 'Start' } },
      {
        ...registry,
        components: [{ ...registry.components[0], requiredTokens: ['color.action.required'] }]
      }
    )

    expect(match).toMatchObject({
      strategy: 'manual-review',
      incompatibilities: ['Missing required token: color.action.required.']
    })
  })

  it('B03-BL-003 rejects an exact component when its required slot has no material', () => {
    const match = matchNode(
      { componentKey: 'design.button', props: { label: 'Start' } },
      {
        ...registry,
        components: [
          {
            ...registry.components[0],
            slots: [{ name: 'content', accepts: ['text'], required: true }]
          }
        ]
      }
    )

    expect(match).toMatchObject({
      strategy: 'manual-review',
      incompatibilities: ['Required slot content cannot be satisfied.']
    })
  })

  it('B03-BL-004 rejects an exact component missing a required node capability', () => {
    const match = matchNode(
      {
        semantic: 'product-preview',
        componentKey: 'design.button',
        props: { label: 'Start' }
      },
      registry
    )

    expect(match).toMatchObject({
      strategy: 'manual-review',
      incompatibilities: ['Missing required capability: visual.']
    })
  })
})
