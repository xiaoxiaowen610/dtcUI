import type { EvalCase } from '@forge-ui/contracts'
import flagshipInput from '../presets/saas/input.json'
import flagshipRegistry from '../presets/saas/registry.json'

function clone<T>(value: T): T {
  return structuredClone(value)
}

const degradedInput = clone(flagshipInput)
const degradedPrimaryAction = degradedInput.root.children[0]?.children?.find(
  (node) => node.id === 'hero-primary-action'
)
if (degradedPrimaryAction) {
  degradedPrimaryAction.componentKey = 'unknown.button'
}

const malformedInput: unknown = {
  ...clone(flagshipInput),
  root: {
    ...clone(flagshipInput.root),
    name: '   '
  }
}

export const fixedEvalCases: EvalCase[] = [
  {
    id: 'flagship-valid',
    name: 'AI SaaS flagship valid pipeline',
    kind: 'valid',
    input: flagshipInput,
    registry: flagshipRegistry,
    expected: {
      generationSuccess: true,
      expectedMatches: {
        'hero-primary-action': 'external-button',
        'hero-secondary-action': 'external-button',
        'hero-product-preview': 'external-product-preview'
      },
      expectedStrategies: {
        'hero-primary-action': 'exact-component',
        'hero-secondary-action': 'exact-component',
        'hero-product-preview': 'exact-component'
      },
      expectedDiagnostics: []
    }
  },
  {
    id: 'unknown-component-degraded',
    name: 'Unknown component degrades to manual review',
    kind: 'degraded',
    input: degradedInput,
    registry: flagshipRegistry,
    expected: {
      generationSuccess: true,
      expectedMatches: {
        'hero-secondary-action': 'external-button',
        'hero-product-preview': 'external-product-preview'
      },
      expectedStrategies: {
        'hero-primary-action': 'manual-review',
        'hero-secondary-action': 'exact-component',
        'hero-product-preview': 'exact-component'
      },
      expectedDiagnostics: ['COMPONENT_MANUAL_REVIEW']
    }
  },
  {
    id: 'malformed-design-invalid',
    name: 'Malformed design is rejected before generation',
    kind: 'invalid',
    input: malformedInput,
    registry: flagshipRegistry,
    expected: {
      errorCode: 'DESIGN_SCHEMA_INVALID',
      generationSuccess: false
    }
  }
]
