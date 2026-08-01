import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { INPUT_LIMITS } from '@forge-ui/contracts'
import type { FastifyInstance } from 'fastify'
import input from '../../../presets/saas/input.json'
import registry from '../../../presets/saas/registry.json'
import { buildServer, parsePort } from './server'

let app: FastifyInstance
let inputFixture: typeof input
let registryFixture: typeof registry

beforeEach(async () => {
  app = await buildServer({ logger: false })
  inputFixture = structuredClone(input)
  registryFixture = structuredClone(registry)
})

afterEach(async () => {
  await app.close()
})

describe('Engine HTTP API', () => {
  it('API-001 returns health versions and capabilities', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      status: 'ok',
      engineVersion: '0.1.0',
      schemaVersion: '1.0',
      capabilities: ['analyze', 'generate']
    })
  })

  it('API-002 analyzes a valid request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: { input: inputFixture, registry: registryFixture }
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().summary).toEqual({
      totalNodes: 8,
      componentNodes: 3,
      exactMatches: 3,
      manualReview: 0
    })
  })

  it('API-003 generates a plan, manifest, report and source files', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: { input: inputFixture, registry: registryFixture }
    })
    const body = response.json()

    expect(response.statusCode).toBe(200)
    expect(body.plan.generationId).toMatch(/^generation_[0-9a-f]{8}$/)
    expect(body.project.files).toHaveLength(12)
    expect(body.project.manifest.registry).toEqual({
      id: 'forgeui-example-external-ui',
      version: '1.0.0'
    })
    expect(body.project.report.validation.schema).toBe('passed')
  })

  it('API-004 returns a structured schema error and preserves request ID', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      headers: { 'x-request-id': 'request-schema-1' },
      payload: { input: { ...inputFixture, schemaVersion: '2.0' }, registry: registryFixture }
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      code: 'REQUEST_SCHEMA_INVALID',
      stage: 'input',
      recoverable: true,
      requestId: 'request-schema-1'
    })
  })

  it('API-005 maps Registry validation failures', async () => {
    registryFixture.components[0]!.import.path = 'untrusted-package'
    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: { input: inputFixture, registry: registryFixture }
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ code: 'REGISTRY_INVALID', stage: 'registry' })
  })

  it('API-006 maps a missing Hero to a recoverable Generation Plan failure', async () => {
    inputFixture.root.children[0]!.semantic = 'content'
    const response = await app.inject({
      method: 'POST',
      url: '/api/generate',
      payload: { input: inputFixture, registry: registryFixture }
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      code: 'GENERATION_PLAN_FAILED',
      stage: 'generation-plan',
      recoverable: true
    })
  })

  it('API-007 allows Studio CORS and does not reflect an unknown Origin', async () => {
    const allowed = await app.inject({
      method: 'OPTIONS',
      url: '/api/generate',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'POST'
      }
    })
    const unknown = await app.inject({
      method: 'OPTIONS',
      url: '/api/generate',
      headers: {
        origin: 'https://untrusted.example',
        'access-control-request-method': 'POST'
      }
    })

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(unknown.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('API-009 rejects request bodies beyond the shared byte limit', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze',
      payload: {
        input: {
          ...inputFixture,
          metadata: { padding: 'x'.repeat(INPUT_LIMITS.maxBytes) }
        },
        registry: registryFixture
      }
    })

    expect(response.statusCode).toBe(413)
  })
})

describe('Engine startup boundaries', () => {
  it.each([
    [undefined, 4000],
    ['4001', 4001],
    ['0', 4000],
    ['-1', 4000],
    ['65536', 4000],
    ['4000garbage', 4000],
    ['3.14', 4000]
  ])('parses PORT=%s as %s', (value, expected) => {
    expect(parsePort(value)).toBe(expected)
  })
})
