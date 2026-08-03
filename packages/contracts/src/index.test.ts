import { describe, expect, it } from 'vitest'
import input from '../../../presets/saas/input.json'
import registry from '../../../presets/saas/registry.json'
import {
  componentRegistryManifestSchema,
  designInputEnvelopeSchema,
  evalCaseSchema,
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

  it('B01-UT-004 requires invalid eval cases to declare an error code', () => {
    expect(
      evalCaseSchema.safeParse({
        id: 'invalid-case',
        name: 'Invalid case',
        kind: 'invalid',
        input: {},
        registry: {},
        expected: {}
      }).success
    ).toBe(false)
  })

  it('B01-UT-005 rejects error expectations on non-invalid eval cases', () => {
    expect(
      evalCaseSchema.safeParse({
        id: 'valid-case',
        name: 'Valid case',
        kind: 'valid',
        input: {},
        registry: {},
        expected: { errorCode: 'SHOULD_NOT_EXIST' }
      }).success
    ).toBe(false)
  })
})
