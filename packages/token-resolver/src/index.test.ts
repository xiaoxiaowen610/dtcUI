import { describe, expect, it } from 'vitest'
import type { ExternalToken } from '@forge-ui/contracts'
import { resolveTokens, TokenResolverError } from './index'

function token(
  path: string,
  type: ExternalToken['type'],
  value: unknown,
  level: ExternalToken['level'] = 'primitive'
): ExternalToken {
  return { path, type, value, level }
}

function expectCode(input: ExternalToken[], code: string) {
  try {
    resolveTokens(input)
    throw new Error('Expected TokenResolverError')
  } catch (error) {
    expect(error).toBeInstanceOf(TokenResolverError)
    expect((error as TokenResolverError).diagnostics.map((item) => item.code)).toContain(code)
  }
}

describe('resolveTokens', () => {
  it('B02-UT-001 normalizes primitive colors and CSS variable names', () => {
    const result = resolveTokens([token('color.brandPrimary', 'color', '#7C5CFF')])

    expect(result.tokens[0]).toMatchObject({
      cssVariable: '--color-brand-primary',
      cssValue: '#7c5cff',
      resolvedValue: '#7c5cff'
    })
  })

  it('B02-UT-002 resolves a semantic alias and preserves a CSS var reference', () => {
    const result = resolveTokens([
      token('color.purple.500', 'color', '#7c5cff'),
      token('color.brand.primary', 'color', { ref: 'color.purple.500' }, 'semantic')
    ])

    expect(result.tokens.find((item) => item.path === 'color.brand.primary')).toMatchObject({
      cssValue: 'var(--color-purple-500)',
      resolvedValue: '#7c5cff',
      aliasRef: 'color.purple.500'
    })
    expect(result.summary).toMatchObject({ referenced: 1, reused: 1 })
  })

  it.each([
    [token('color.a', 'color', { ref: 'color.a' })],
    [token('color.a', 'color', { ref: 'color.b' }), token('color.b', 'color', { ref: 'color.a' })]
  ])('B02-UT-003 rejects alias cycles', (...input) => {
    expectCode(input.flat() as ExternalToken[], 'TOKEN_ALIAS_CYCLE')
  })

  it('B02-UT-004 rejects a missing alias reference', () => {
    expectCode(
      [token('color.brand.primary', 'color', { ref: 'color.missing' })],
      'TOKEN_REFERENCE_MISSING'
    )
  })

  it('B02-UT-005 rejects cross-type aliases', () => {
    expectCode(
      [
        token('space.4', 'dimension', { value: 1, unit: 'rem' }),
        token('color.brand.primary', 'color', { ref: 'space.4' })
      ],
      'TOKEN_TYPE_MISMATCH'
    )
  })

  it('B02-UT-006 rejects duplicate paths and CSS variable collisions', () => {
    expect.assertions(2)
    try {
      resolveTokens([
        token('color.brand.primary', 'color', '#fff'),
        token('color.brand.primary', 'color', '#000'),
        token('color-brand-primary', 'color', '#111')
      ])
      throw new Error('Expected TokenResolverError')
    } catch (error) {
      const codes = (error as TokenResolverError).diagnostics.map((item) => item.code)
      expect(codes).toContain('TOKEN_DUPLICATE_PATH')
      expect(codes).toContain('TOKEN_CSS_VARIABLE_COLLISION')
    }
  })

  it.each([
    token('color.bad', 'color', 'javascript:alert(1)'),
    token('space.bad', 'dimension', { value: Number.NaN, unit: 'rem' }),
    token('font.bad', 'fontFamily', 'Inter; color: red'),
    token('radius.bad', 'radius', { value: 2, unit: 'em' }),
    token('color.badHex', 'color', '#12345'),
    token('shadow.bad', 'shadow', 'expression(alert(1))')
  ])('B02-UT-007 rejects unsafe or invalid concrete values', (input) => {
    expectCode([input], 'TOKEN_VALUE_INVALID')
  })

  it('B02-UT-008 is deterministic when input order changes', () => {
    const input = [
      token('space.4', 'dimension', { value: 1, unit: 'rem' }),
      token('color.brand.primary', 'color', '#7c5cff')
    ]

    expect(resolveTokens(input)).toEqual(resolveTokens([...input].reverse()))
  })

  it('B02-BL-001 reports exact reuse without silently replacing semantic paths', () => {
    const result = resolveTokens([
      token('color.purple.500', 'color', '#7c5cff'),
      token('color.brand.primary', 'color', '#7c5cff', 'semantic')
    ])

    expect(result.tokens).toHaveLength(2)
    expect(result.summary.reused).toBe(1)
    expect(result.diagnostics.map((item) => item.code)).toContain('TOKEN_EXACT_VALUE_REUSE')
  })

  it('B02-BL-002 emits similarity suggestions without merging values', () => {
    const result = resolveTokens([
      token('color.purple.500', 'color', '#7c5cff'),
      token('color.purple.510', 'color', '#7d5dff')
    ])

    expect(result.tokens.map((item) => item.cssValue)).toEqual(['#7c5cff', '#7d5dff'])
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'TOKEN_SIMILAR_VALUE', blocking: false })
    ])
  })

  it('B02-PERF-001 resolves a 2,000-token alias chain within the resolver budget', () => {
    const input: ExternalToken[] = [token('space.0', 'dimension', { value: 1, unit: 'rem' })]
    for (let index = 1; index < 2_000; index += 1) {
      input.push(token(`space.${index}`, 'dimension', { ref: `space.${index - 1}` }, 'semantic'))
    }

    const started = performance.now()
    const result = resolveTokens(input)
    const duration = performance.now() - started

    expect(result.tokens).toHaveLength(2_000)
    expect(result.tokens.at(-1)?.resolvedValue).toEqual({ value: 1, unit: 'rem' })
    expect(duration).toBeLessThan(500)
  })
})
