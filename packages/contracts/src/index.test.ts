import { describe, expect, it } from 'vitest'
import input from '../../../presets/saas/input.json'
import registry from '../../../presets/saas/registry.json'
import {
  componentRegistryManifestSchema,
  designInputEnvelopeSchema,
  layoutSpecSchema
} from './index'

describe('versioned contracts', () => {
  it('UT-CONTRACT-001 accepts the valid flagship input', () => {
    expect(designInputEnvelopeSchema.parse(input).schemaVersion).toBe('1.0')
  })

  it('UT-CONTRACT-002 rejects an unsupported schema version', () => {
    expect(designInputEnvelopeSchema.safeParse({ ...input, schemaVersion: '2.0' }).success).toBe(
      false
    )
  })

  it.each([0, 13])('UT-CONTRACT-003 rejects columns=%s', (columns) => {
    expect(layoutSpecSchema.safeParse({ display: 'grid', columns }).success).toBe(false)
  })

  it('UT-CONTRACT-004 requires at least one registered component', () => {
    expect(componentRegistryManifestSchema.safeParse({ ...registry, components: [] }).success).toBe(
      false
    )
  })

  it('UT-CONTRACT-005 rejects a malformed asset URL', () => {
    expect(
      designInputEnvelopeSchema.safeParse({
        ...input,
        assets: [{ id: 'hero', type: 'image', sourceUrl: 'not a URL' }]
      }).success
    ).toBe(false)
  })

  it('UT-CONTRACT-006 rejects a whitespace-only node name', () => {
    expect(
      designInputEnvelopeSchema.safeParse({
        ...input,
        root: { ...input.root, name: '   ' }
      }).success
    ).toBe(false)
  })
})
