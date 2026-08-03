import { describe, expect, it } from 'vitest'
import { fixedEvalCases } from '../../evals/cases'
import { EvalSuiteError, runEvaluation, validateEvalCases } from './evaluation'

describe('fixed evaluation suite', () => {
  it('B01-UT-001 rejects duplicate case IDs', () => {
    expect(() => validateEvalCases([fixedEvalCases[0], fixedEvalCases[0]])).toThrowError(
      expect.objectContaining({ name: EvalSuiteError.name })
    )
  })

  it('B01-UT-002 sorts cases and produces byte-stable normalized reports', () => {
    const reversed = [...fixedEvalCases].reverse()
    const first = runEvaluation(reversed)
    const second = runEvaluation(fixedEvalCases)

    expect(first.cases.map((evalCase) => evalCase.id)).toEqual([
      'flagship-valid',
      'malformed-design-invalid',
      'unknown-component-degraded'
    ])
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('B01-UT-003 reports exact expectation differences', () => {
    const result = runEvaluation([
      {
        ...fixedEvalCases[0],
        expected: {
          ...fixedEvalCases[0]!.expected,
          expectedMatches: { 'hero-primary-action': 'wrong-component' }
        }
      }
    ])

    expect(result.totals.failed).toBe(1)
    expect(result.cases[0]?.differences).toContain(
      'matches.hero-primary-action: expected wrong-component, received external-button.'
    )
  })

  it('B01-BL-001/B01-BL-002/B01-BL-003 passes valid, degraded and invalid cases', () => {
    const result = runEvaluation(fixedEvalCases)

    expect(result.totals).toEqual({
      cases: 3,
      passed: 3,
      failed: 0,
      valid: 1,
      degraded: 1,
      invalid: 1
    })
    expect(result.cases.every((evalCase) => evalCase.status === 'passed')).toBe(true)
  })
})
