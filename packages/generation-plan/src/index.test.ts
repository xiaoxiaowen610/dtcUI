import { beforeEach, describe, expect, it } from 'vitest'
import input from '../../../presets/saas/input.json'
import registryInput from '../../../presets/saas/registry.json'
import { matchComponents, validateRegistry } from '@forge-ui/component-registry'
import { createDesignDocument } from '@forge-ui/design-ir'
import { resolveTokens } from '@forge-ui/token-resolver'
import { createGenerationPlan, GenerationPlanError } from './index'

let inputFixture: typeof input

beforeEach(() => {
  inputFixture = structuredClone(input)
})

function planFor(candidate: unknown = inputFixture, registryCandidate: unknown = registryInput) {
  const document = createDesignDocument(candidate)
  const registry = validateRegistry(registryCandidate)
  return createGenerationPlan(
    document,
    registry,
    matchComponents(document, registry),
    resolveTokens(document.tokens)
  )
}

describe('Generation Plan business rules', () => {
  it('BL-PLAN-001 plans flagship copy, actions, visual and imports', () => {
    const plan = planFor()

    expect(plan.hero).toMatchObject({
      id: 'hero',
      eyebrow: 'AI OPERATIONS, COMPOSED',
      title: 'Operate at the speed of thought.'
    })
    expect(plan.hero.actions.map((action) => action.nodeId)).toEqual([
      'hero-primary-action',
      'hero-secondary-action'
    ])
    expect(plan.hero.visual?.nodeId).toBe('hero-product-preview')
    expect(plan.imports).toEqual([
      {
        path: '@forge-ui/example-external-ui',
        names: ['Button', 'ProductPreview']
      }
    ])
    expect(plan.sections).toEqual([
      expect.objectContaining({
        nodeId: 'logo-cloud',
        functionName: 'CustomerLogoCloud',
        fileName: 'CustomerLogoCloud.tsx',
        exportName: 'LogoCloud'
      }),
      expect.objectContaining({
        nodeId: 'feature-grid',
        functionName: 'FeatureGridSection',
        fileName: 'FeatureGridSection.tsx',
        exportName: 'FeatureGrid'
      }),
      expect.objectContaining({
        nodeId: 'testimonial',
        functionName: 'CustomerTestimonial',
        fileName: 'CustomerTestimonial.tsx',
        exportName: 'TestimonialSection'
      }),
      expect.objectContaining({
        nodeId: 'cta-section',
        functionName: 'ClosingCallToAction',
        fileName: 'ClosingCallToAction.tsx',
        exportName: 'CtaSection'
      })
    ])
    expect(plan.tokenResolution.tokens.length).toBeGreaterThan(3)
  })

  it('BL-PLAN-002 rejects a document without a Hero semantic section', () => {
    inputFixture.root.children[0]!.semantic = 'not-hero'
    expect(() => planFor()).toThrowError(
      expect.objectContaining<Partial<GenerationPlanError>>({ name: 'GenerationPlanError' })
    )
  })

  it('BL-PLAN-003 retains manual-review matches as non-blocking diagnostics', () => {
    inputFixture.root.children[0]!.children![3]!.componentKey = 'unknown.button'
    inputFixture.root.children[0]!.children![3]!.semantic = 'unknown-widget'
    const plan = planFor()

    expect(plan.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'COMPONENT_MANUAL_REVIEW',
        nodeId: 'hero-primary-action',
        blocking: false
      })
    )
  })

  it('BL-PLAN-004 ignores exact component matches outside Hero', () => {
    ;(inputFixture.root.children as unknown[]).push({
      id: 'outside-badge',
      name: 'Outside badge',
      type: 'component',
      componentKey: 'external.badge',
      props: {}
    })
    const plan = planFor()

    expect(plan.imports.flatMap((entry) => entry.names)).not.toContain('Badge')
  })

  it('BL-PLAN-005 uses documented metadata fallbacks', () => {
    const { metadata: _metadata, ...withoutMetadata } = inputFixture
    expect(planFor(withoutMetadata).page).toMatchObject({
      title: 'ForgeUI Generated Page',
      description: ''
    })
  })

  it('BL-PLAN-006 derives stable source and generation hashes', () => {
    expect(planFor()).toEqual(planFor())
  })

  it('BL-PLAN-007 rejects ambiguous documents with multiple Hero sections', () => {
    ;(inputFixture.root.children as unknown[]).push({
      id: 'hero-copy',
      name: 'Second Hero',
      type: 'section',
      semantic: 'hero',
      children: []
    })

    expect(() => planFor()).toThrowError(/exactly one section with semantic "hero"/)
  })

  it('BL-PLAN-008 preserves mixed default and named Registry import styles', () => {
    const registryFixture = structuredClone(registryInput)
    registryFixture.components[1]!.import.style = 'default'

    expect(planFor(inputFixture, registryFixture).imports).toEqual([
      {
        path: '@forge-ui/example-external-ui',
        defaultName: 'ProductPreview',
        names: ['Button']
      }
    ])
  })
})
