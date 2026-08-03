import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import input from '../../../presets/saas/input.json'
import registry from '../../../presets/saas/registry.json'
import { ValidationJobManager } from '../../../packages/validation-export/src/index'
import { buildPreviewServer } from './preview'
import { buildServer } from './server'

let app: FastifyInstance
let preview: FastifyInstance
let jobs: ValidationJobManager
let scheduled: Promise<void>[]

beforeEach(async () => {
  jobs = new ValidationJobManager()
  scheduled = []
  app = await buildServer({
    logger: false,
    validationJobs: jobs,
    previewOrigin: 'http://127.0.0.1:4174',
    studioOrigin: 'http://127.0.0.1:5173',
    scheduleValidation: (run) => {
      scheduled.push(run())
    }
  })
  preview = await buildPreviewServer(jobs, {
    logger: false,
    previewOrigin: 'http://127.0.0.1:4174',
    studioOrigin: 'http://127.0.0.1:5173'
  })
})

afterEach(async () => {
  await Promise.all([app.close(), preview.close()])
})

async function createAndComplete(payload: unknown = { input, registry }) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/validation-jobs',
    headers: { 'x-request-id': 'request-b05' },
    payload
  })
  const created = response.json()
  await Promise.all(scheduled)
  const polled = await app.inject({
    method: 'GET',
    url: `/api/validation-jobs/${created.job.id}`
  })
  return { response, created, job: polled.json() }
}

describe('Batch 05 Engine API and isolated Preview', () => {
  it('B05-API-001 creates a validation job and exposes structured polling state', async () => {
    const { response, created, job } = await createAndComplete()

    expect(response.statusCode).toBe(202)
    expect(created.job).toMatchObject({
      requestId: 'request-b05',
      state: 'queued'
    })
    expect(created.preview).toMatchObject({
      origin: 'http://127.0.0.1:4174',
      sandbox: 'allow-scripts'
    })
    expect(job.state).toBe('succeeded')
    expect(job.report.checks.map((check: { name: string }) => check.name)).toEqual([
      'schema',
      'typescript',
      'build',
      'runtime',
      'layout',
      'accessibility',
      'visual'
    ])
    expect(job.logs.some((entry: { event: string }) => entry.event === 'job.succeeded')).toBe(true)
  })

  it('B05-API-002 blocks export after a runtime bridge failure', async () => {
    const { created } = await createAndComplete()
    const runtime = await app.inject({
      method: 'POST',
      url: `/api/validation-jobs/${created.job.id}/runtime-events`,
      payload: {
        type: 'forge:runtime-error',
        message: 'Preview crashed.',
        stack: 'runtime stack'
      }
    })
    const exported = await app.inject({
      method: 'POST',
      url: '/api/export',
      payload: { jobId: created.job.id, mode: 'standalone' }
    })

    expect(runtime.statusCode).toBe(200)
    expect(runtime.json()).toMatchObject({ state: 'failed' })
    expect(exported.statusCode).toBe(409)
    expect(exported.json()).toMatchObject({ code: 'EXPORT_VALIDATION_BLOCKED' })
  })

  it('B05-API-003 exports standalone and integration ZIP modes', async () => {
    const { created } = await createAndComplete()
    const standalone = await app.inject({
      method: 'POST',
      url: '/api/export',
      payload: { jobId: created.job.id, mode: 'standalone' }
    })
    const integration = await app.inject({
      method: 'POST',
      url: '/api/export',
      payload: { jobId: created.job.id, mode: 'integration' }
    })

    expect(standalone.statusCode).toBe(200)
    expect(standalone.headers['content-type']).toContain('application/zip')
    expect(standalone.headers['content-disposition']).toContain('standalone.zip')
    expect(standalone.rawPayload.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    expect(integration.statusCode).toBe(200)
    expect(integration.headers['content-disposition']).toContain('integration.zip')
    expect(integration.headers['x-forge-export-hash']).toMatch(/^[0-9a-f]{8}$/)
  })

  it('requires explicit confirmation when generation warnings exist', async () => {
    const degradedInput = structuredClone(input)
    const action = degradedInput.root.children[0]!.children![3]!
    action.componentKey = 'external.unknown'
    action.semantic = 'unknown-widget'
    const { created, job } = await createAndComplete({ input: degradedInput, registry })

    expect(job.report.exportGate).toMatchObject({
      allowed: true,
      warningsRequireConfirmation: true
    })
    const blocked = await app.inject({
      method: 'POST',
      url: '/api/export',
      payload: { jobId: created.job.id, mode: 'integration' }
    })
    const confirmed = await app.inject({
      method: 'POST',
      url: '/api/export',
      payload: { jobId: created.job.id, mode: 'integration', confirmWarnings: true }
    })

    expect(blocked.statusCode).toBe(409)
    expect(blocked.json()).toMatchObject({ code: 'EXPORT_WARNING_CONFIRMATION_REQUIRED' })
    expect(confirmed.statusCode).toBe(200)
  })

  it('serves Preview from a separate origin contract with restrictive CSP', async () => {
    const { created } = await createAndComplete()
    const response = await preview.inject({
      method: 'GET',
      url: `/preview/${created.job.id}`
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-security-policy']).toContain("connect-src 'none'")
    expect(response.headers['content-security-policy']).toContain(
      'frame-ancestors http://127.0.0.1:5173'
    )
    expect(response.headers['permissions-policy']).toContain('camera=()')
    expect(response.body).toContain('forge:node-select')
    expect(response.body).toContain('forge:runtime-error')
    expect(response.body).toContain('data-forge-node-id')
  })
})
