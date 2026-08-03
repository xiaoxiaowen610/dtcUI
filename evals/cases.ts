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

const tokenCycleInput = clone(flagshipInput)
;(tokenCycleInput.tokens as unknown[]).push(
  {
    path: 'color.cycle.a',
    type: 'color',
    value: { ref: 'color.cycle.b' },
    level: 'semantic'
  },
  {
    path: 'color.cycle.b',
    type: 'color',
    value: { ref: 'color.cycle.a' },
    level: 'semantic'
  }
)

const tokenMissingInput = clone(flagshipInput)
;(tokenMissingInput.tokens as unknown[]).push({
  path: 'color.missing.alias',
  type: 'color',
  value: { ref: 'color.does.not.exist' },
  level: 'semantic'
})

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
    id: 'token-alias-valid',
    name: 'Semantic token alias resolves into generated CSS',
    kind: 'valid',
    input: flagshipInput,
    registry: flagshipRegistry,
    expected: {
      generationSuccess: true,
      expectedTokens: {
        'color.brand.primary': 'var(--color-purple-500)',
        'color.purple.500': '#7c5cff'
      }
    }
  },
  {
    id: 'token-alias-cycle-invalid',
    name: 'Token alias cycle is rejected',
    kind: 'invalid',
    input: tokenCycleInput,
    registry: flagshipRegistry,
    expected: {
      errorCode: 'TOKEN_ALIAS_CYCLE',
      generationSuccess: false
    }
  },
  {
    id: 'token-reference-missing-invalid',
    name: 'Missing token reference is rejected',
    kind: 'invalid',
    input: tokenMissingInput,
    registry: flagshipRegistry,
    expected: {
      errorCode: 'TOKEN_REFERENCE_MISSING',
      generationSuccess: false
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
