import { describe, expect, it } from 'vitest'
import { resolveResponsiveLayout, resolveResponsiveVisibility } from './responsive'

describe('Responsive Resolver', () => {
  it('B04-UT-001 merges layout mobile-first and only overrides explicit fields', () => {
    const base = { display: 'grid' as const, columns: 3, align: 'center' as const }
    const responsive = {
      layout: {
        mobile: { columns: 1 },
        tablet: { columns: 2 },
        desktop: { align: 'stretch' as const }
      }
    }

    expect(resolveResponsiveLayout(base, responsive, 'mobile')).toEqual({
      display: 'grid',
      columns: 1,
      align: 'center'
    })
    expect(resolveResponsiveLayout(base, responsive, 'tablet')).toEqual({
      display: 'grid',
      columns: 2,
      align: 'center'
    })
    expect(resolveResponsiveLayout(base, responsive, 'desktop')).toEqual({
      display: 'grid',
      columns: 2,
      align: 'stretch'
    })
  })

  it('B04-UT-001B does not inherit visibility from an unspecified lower breakpoint', () => {
    const responsive = { visibility: { mobile: false, desktop: true } }

    expect(resolveResponsiveVisibility(responsive, 'mobile')).toBe(false)
    expect(resolveResponsiveVisibility(responsive, 'tablet')).toBe(true)
    expect(resolveResponsiveVisibility(responsive, 'desktop')).toBe(true)
  })
})
