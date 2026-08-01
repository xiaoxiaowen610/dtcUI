import { beforeEach, describe, expect, it } from 'vitest'
import input from '../../../presets/saas/input.json'
import registry from '../../../presets/saas/registry.json'
import { GenerationPlanError } from '@forge-ui/generation-plan'
import { RegistryError } from '@forge-ui/component-registry'
import { analyzeDesign, generateDesign } from './pipeline'

let inputFixture: typeof input
let registryFixture: typeof registry

beforeEach(() => {
  inputFixture = structuredClone(input)
  registryFixture = structuredClone(registry)
})

describe('flagship pipeline', () => {
  it('BL-PIPE-001 analyzes node and match counts', () => {
    const result = analyzeDesign({ input: inputFixture, registry: registryFixture })

    expect(result.summary).toEqual({
      totalNodes: 8,
      componentNodes: 3,
      exactMatches: 3,
      manualReview: 0
    })
    expect(result.diagnostics).toEqual([])
  })

  it('BL-PIPE-002 runs input -> plan -> a stable 12-file project', () => {
    const result = generateDesign(
      { input: inputFixture, registry: registryFixture },
      '2026-08-01T00:00:00.000Z'
    )

    expect(result.summary).toMatchObject({ componentNodes: 3, exactMatches: 3, manualReview: 0 })
    expect(result.plan.hero.title).toBe('Operate at the speed of thought.')
    expect(result.project.files).toHaveLength(12)
    expect(result.project.manifest.createdAt).toBe('2026-08-01T00:00:00.000Z')
  })

  it('BL-PIPE-003 propagates manual review through analysis, plan and report', () => {
    inputFixture.root.children[0]!.children![3]!.componentKey = 'external.unknown'
    const result = generateDesign({ input: inputFixture, registry: registryFixture })

    expect(result.summary).toMatchObject({ exactMatches: 2, manualReview: 1 })
    expect(result.diagnostics[0]).toMatchObject({ code: 'COMPONENT_MANUAL_REVIEW' })
    expect(result.plan.diagnostics[0]).toMatchObject({ code: 'COMPONENT_MANUAL_REVIEW' })
    expect(result.project.report.matches).toMatchObject({ exact: 2, manual: 1 })
  })

  it('BL-PIPE-004 rejects a request without a Hero', () => {
    inputFixture.root.children[0]!.semantic = 'content'
    expect(() => generateDesign({ input: inputFixture, registry: registryFixture })).toThrowError(
      GenerationPlanError
    )
  })

  it('BL-PIPE-005 rejects an unsafe Registry import', () => {
    registryFixture.components[0]!.import.path = 'untrusted-package'
    expect(() => generateDesign({ input: inputFixture, registry: registryFixture })).toThrowError(
      RegistryError
    )
  })
})
