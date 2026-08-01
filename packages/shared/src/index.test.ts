import { describe, expect, it } from 'vitest'
import { stableHash, stableStringify, toCssVariable } from './index'

describe('shared deterministic utilities', () => {
  it('UT-SHARED-001 returns the same eight-character hash for Unicode input', () => {
    expect(stableHash('设计 → code')).toBe(stableHash('设计 → code'))
    expect(stableHash('设计 → code')).toMatch(/^[0-9a-f]{8}$/)
  })

  it('UT-SHARED-002 differentiates different inputs', () => {
    expect(stableHash('alpha')).not.toBe(stableHash('beta'))
  })

  it('UT-SHARED-003 sorts nested object keys without reordering arrays', () => {
    const left = { z: 1, nested: { b: 2, a: 1 }, list: [{ d: 4, c: 3 }, 2] }
    const right = { list: [{ c: 3, d: 4 }, 2], nested: { a: 1, b: 2 }, z: 1 }

    expect(stableStringify(left)).toBe(stableStringify(right))
    expect(stableStringify(left, 2)).toContain('\n  "list"')
  })

  it('UT-SHARED-004 converts token paths and camelCase to CSS variable names', () => {
    expect(toCssVariable('color.brandPrimary/hover')).toBe('--color-brand-primary-hover')
  })
})
