import { describe, expect, it } from 'vitest'
import input from '../../../presets/saas/input.json'
import registry from '../../../presets/saas/registry.json'
import { generateDesign } from './pipeline'

describe('flagship pipeline', () => {
  it('runs input -> IR -> exact match -> plan -> generated project', () => {
    const result = generateDesign({ input, registry }, '2026-08-01T00:00:00.000Z')

    expect(result.summary).toMatchObject({ componentNodes: 3, exactMatches: 3, manualReview: 0 })
    expect(result.plan.hero.title).toBe('Operate at the speed of thought.')
    expect(result.project.files.some((file) => file.path === 'src/sections/Hero.tsx')).toBe(true)
  })
})
