import { describe, expect, it } from 'vitest'
import { starterComposerPage } from './catalog'
import { decodeComposerSnapshot, encodeComposerSnapshot } from './persistence'

describe('Composer persistence snapshots', () => {
  it('B02-PERSIST-001 round-trips a validated Composer document', () => {
    const snapshot = encodeComposerSnapshot(starterComposerPage, '2026-08-11T08:00:00.000Z')

    expect(decodeComposerSnapshot(snapshot)).toEqual({
      version: 1,
      savedAt: '2026-08-11T08:00:00.000Z',
      page: starterComposerPage
    })
  })

  it('B02-PERSIST-002 rejects unsupported persistence versions', () => {
    expect(() =>
      decodeComposerSnapshot({
        version: 2,
        savedAt: '2026-08-11T08:00:00.000Z',
        page: starterComposerPage
      })
    ).toThrowError(/Unsupported Composer snapshot version/)
  })

  it('B02-PERSIST-003 rejects invalid persisted Page Schema', () => {
    expect(() =>
      decodeComposerSnapshot({
        version: 1,
        savedAt: '2026-08-11T08:00:00.000Z',
        page: { ...starterComposerPage, schemaVersion: '2.0' }
      })
    ).toThrow()
  })
})
