import { afterEach, describe, expect, it, vi } from 'vitest'
import input from '../../../../presets/saas/input.json'
import registry from '../../../../presets/saas/registry.json'
import { analyzeRequestSchema, type GenerateResponse } from '@forge-ui/contracts'
import { EngineRequestError, generateFlagship } from './engine'

const request = analyzeRequestSchema.parse({ input, registry })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Studio Engine client', () => {
  it('returns a successful generated response and sends JSON', async () => {
    const result = { schemaVersion: '1.0' } as GenerateResponse
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateFlagship(request)).resolves.toEqual(result)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
    )
  })

  it('UI-008 preserves a structured error code, message, request ID and status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'REGISTRY_INVALID',
            stage: 'registry',
            message: 'Registry is unsafe.',
            recoverable: true,
            fallbackApplied: false,
            suggestedActions: [],
            requestId: 'req-42'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )

    const error = await generateFlagship(request).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(EngineRequestError)
    expect(error).toMatchObject({
      code: 'REGISTRY_INVALID',
      message: 'REGISTRY_INVALID: Registry is unsafe.',
      requestId: 'req-42',
      status: 400
    })
  })

  it('UI-009 maps non-JSON errors to a safe fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>gateway failure</html>', {
          status: 502,
          headers: { 'x-request-id': 'gateway-7' }
        })
      )
    )

    await expect(generateFlagship(request)).rejects.toMatchObject({
      code: 'ENGINE_REQUEST_FAILED',
      message: 'ENGINE_REQUEST_FAILED: Engine request failed with HTTP 502.',
      requestId: 'gateway-7',
      status: 502
    })
  })

  it('maps malformed JSON error objects to a safe fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ unexpected: true }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    )

    await expect(generateFlagship(request)).rejects.toMatchObject({
      code: 'ENGINE_REQUEST_FAILED',
      status: 500
    })
  })
})
