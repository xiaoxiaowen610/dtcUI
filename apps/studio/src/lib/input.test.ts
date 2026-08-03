import { describe, expect, it } from 'vitest'
import input from '../../../../presets/saas/input.json'
import { INPUT_LIMITS } from '@forge-ui/contracts'
import { parseDesignJson, validateImportFile } from './input'

describe('Studio Design JSON import', () => {
  it('B04-UT-003 parses a valid versioned Design JSON document', () => {
    expect(parseDesignJson(JSON.stringify(input))).toMatchObject({
      ok: true,
      input: { documentId: 'forgeui-ai-saas-flagship' }
    })
  })

  it('B04-UT-004 reports a recoverable JSON syntax location', () => {
    const result = parseDesignJson('{\n  "schemaVersion": "1.0",\n  broken\n}')

    expect(result).toMatchObject({ ok: false })
    expect(result.ok ? '' : result.error).toMatch(/JSON syntax error at line 3, column/)
  })

  it('B04-UT-005 reports schema paths without accepting JSON-shaped invalid input', () => {
    const result = parseDesignJson(JSON.stringify({ ...input, schemaVersion: '2.0' }))

    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('schemaVersion')
    })
  })

  it('B04-SEC-001 rejects wrong file types, empty files, and oversized files', () => {
    expect(validateImportFile({ name: 'design.txt', type: 'text/plain', size: 10 })).toMatch(
      /\.json file/
    )
    expect(validateImportFile({ name: 'design.json', type: 'application/json', size: 0 })).toMatch(
      /empty/
    )
    expect(
      validateImportFile({
        name: 'design.json',
        type: 'application/json',
        size: INPUT_LIMITS.maxBytes + 1
      })
    ).toMatch(/exceeds/)
  })
})
