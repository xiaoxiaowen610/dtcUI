import { pathToFileURL } from 'node:url'
import cors from '@fastify/cors'
import {
  ENGINE_VERSION,
  INPUT_LIMITS,
  SCHEMA_VERSION,
  type ForgeErrorPayload
} from '@forge-ui/contracts'
import Fastify from 'fastify'
import { ZodError } from 'zod'
import { DesignIrError } from '@forge-ui/design-ir'
import { RegistryError } from '@forge-ui/component-registry'
import { GenerationPlanError } from '@forge-ui/generation-plan'
import { TokenResolverError } from '@forge-ui/token-resolver'
import {
  ValidationExportError,
  ValidationJobManager,
  createPreviewDescriptor,
  exportGeneratedProject,
  type ExportMode
} from '../../../packages/validation-export/src/index'
import { analyzeDesign, generateDesign } from './pipeline'
import { buildPreviewServer } from './preview'

interface BuildServerOptions {
  logger?: boolean
  validationJobs?: ValidationJobManager
  previewOrigin?: string
  studioOrigin?: string
  scheduleValidation?: (run: () => Promise<void>) => void
}

function errorPayload(error: unknown, requestId: string): ForgeErrorPayload {
  if (error instanceof DesignIrError) {
    return {
      code: error.code,
      stage: 'design-ir',
      message: error.message,
      recoverable: true,
      fallbackApplied: false,
      suggestedActions: ['Fix the Design JSON and retry.'],
      requestId
    }
  }

  if (error instanceof RegistryError) {
    return {
      code: 'REGISTRY_INVALID',
      stage: 'registry',
      message: error.message,
      recoverable: true,
      fallbackApplied: false,
      suggestedActions: ['Fix the Registry Manifest and retry.'],
      requestId
    }
  }

  if (error instanceof TokenResolverError) {
    const primary = error.diagnostics[0]
    return {
      code: primary?.code ?? 'TOKEN_RESOLUTION_FAILED',
      stage: 'token-resolver',
      message: error.message,
      recoverable: true,
      fallbackApplied: false,
      suggestedActions: error.diagnostics.flatMap((item) => item.suggestedActions),
      requestId
    }
  }

  if (error instanceof GenerationPlanError) {
    return {
      code: 'GENERATION_PLAN_FAILED',
      stage: 'generation-plan',
      message: error.message,
      recoverable: true,
      fallbackApplied: false,
      suggestedActions: error.diagnostics.flatMap((diagnostic) => diagnostic.suggestedActions),
      requestId
    }
  }

  if (error instanceof ValidationExportError) {
    return {
      code: error.code,
      stage: 'validation',
      message: error.message,
      recoverable: error.statusCode !== 404,
      fallbackApplied: false,
      suggestedActions:
        error.code === 'EXPORT_WARNING_CONFIRMATION_REQUIRED'
          ? ['Review warnings and retry with explicit confirmation.']
          : ['Run or repair validation before requesting export.'],
      requestId
    }
  }

  if (error instanceof ZodError) {
    return {
      code: 'REQUEST_SCHEMA_INVALID',
      stage: 'input',
      message: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      recoverable: true,
      fallbackApplied: false,
      suggestedActions: ['Submit a versioned Design Input and Registry Manifest.'],
      requestId
    }
  }

  return {
    code: 'INTERNAL_ERROR',
    stage: 'validation',
    message: error instanceof Error ? error.message : 'Unknown Engine error.',
    recoverable: false,
    fallbackApplied: false,
    suggestedActions: ['Inspect Engine logs with the request ID.'],
    requestId
  }
}

function statusCodeFor(error: unknown, payload: ForgeErrorPayload): 400 | 404 | 409 | 500 {
  if (error instanceof ValidationExportError) return error.statusCode
  return payload.code === 'INTERNAL_ERROR' ? 500 : 400
}

export function parsePort(value: string | undefined): number {
  const port = value === undefined ? 4000 : Number(value)
  return Number.isInteger(port) && port >= 1 && port <= 65_535 ? port : 4000
}

export function parsePreviewPort(value: string | undefined): number {
  const port = value === undefined ? 4174 : Number(value)
  return Number.isInteger(port) && port >= 1 && port <= 65_535 ? port : 4174
}

function exportMode(value: unknown): ExportMode {
  if (value === 'standalone' || value === 'integration') return value
  throw new ValidationExportError(
    'VALIDATION_STATE_INVALID',
    'Export mode must be standalone or integration.'
  )
}

export async function buildServer(options: BuildServerOptions = {}) {
  const validationJobs = options.validationJobs ?? new ValidationJobManager()
  const previewOrigin = options.previewOrigin ?? 'http://127.0.0.1:4174'
  const studioOrigin = options.studioOrigin ?? 'http://127.0.0.1:5173'
  const scheduleValidation =
    options.scheduleValidation ??
    ((run: () => Promise<void>) => {
      queueMicrotask(() => void run())
    })
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            level: process.env.LOG_LEVEL ?? 'info',
            redact: ['req.headers.authorization']
          },
    bodyLimit: INPUT_LIMITS.maxBytes,
    requestIdHeader: 'x-request-id'
  })

  await app.register(cors, {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST']
  })

  app.get('/api/health', async () => ({
    status: 'ok',
    engineVersion: ENGINE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    capabilities: ['analyze', 'generate']
  }))

  app.post('/api/analyze', async (request, reply) => {
    try {
      return analyzeDesign(request.body)
    } catch (error) {
      const payload = errorPayload(error, request.id)
      return reply.code(statusCodeFor(error, payload)).send(payload)
    }
  })

  app.post('/api/generate', async (request, reply) => {
    try {
      return generateDesign(request.body)
    } catch (error) {
      const payload = errorPayload(error, request.id)
      return reply.code(statusCodeFor(error, payload)).send(payload)
    }
  })

  app.post('/api/validation-jobs', async (request, reply) => {
    try {
      const generated = generateDesign(request.body)
      const job = validationJobs.create(generated.project, request.id)
      scheduleValidation(async () => {
        try {
          await validationJobs.run(job.id)
        } catch (error) {
          request.log.error(
            { err: error, validationJobId: job.id },
            'Validation job failed to run.'
          )
        }
      })
      return reply.code(202).send({
        job,
        preview: createPreviewDescriptor(previewOrigin, studioOrigin, job.id)
      })
    } catch (error) {
      const payload = errorPayload(error, request.id)
      return reply.code(statusCodeFor(error, payload)).send(payload)
    }
  })

  app.get('/api/validation-jobs/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string }
      const job = validationJobs.get(jobId)
      if (!job) {
        throw new ValidationExportError(
          'VALIDATION_JOB_NOT_FOUND',
          `Validation job ${jobId} was not found.`,
          404
        )
      }
      return job
    } catch (error) {
      const payload = errorPayload(error, request.id)
      return reply.code(statusCodeFor(error, payload)).send(payload)
    }
  })

  app.post('/api/validation-jobs/:jobId/cancel', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string }
      return validationJobs.cancel(jobId)
    } catch (error) {
      const payload = errorPayload(error, request.id)
      return reply.code(statusCodeFor(error, payload)).send(payload)
    }
  })

  app.post('/api/validation-jobs/:jobId/runtime-events', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string }
      const body = request.body as { type?: unknown; message?: unknown; stack?: unknown }
      if (body.type !== 'forge:runtime-error' || typeof body.message !== 'string') {
        throw new ValidationExportError(
          'VALIDATION_STATE_INVALID',
          'Runtime event must be a forge:runtime-error with a message.'
        )
      }
      return validationJobs.recordRuntimeError(
        jobId,
        body.message,
        typeof body.stack === 'string' ? body.stack : undefined
      )
    } catch (error) {
      const payload = errorPayload(error, request.id)
      return reply.code(statusCodeFor(error, payload)).send(payload)
    }
  })

  app.post('/api/export', async (request, reply) => {
    try {
      const body = request.body as {
        jobId?: unknown
        mode?: unknown
        confirmWarnings?: unknown
      }
      if (typeof body.jobId !== 'string') {
        throw new ValidationExportError(
          'VALIDATION_STATE_INVALID',
          'Export requires a validation job ID.'
        )
      }
      const job = validationJobs.get(body.jobId)
      const project = validationJobs.projectFor(body.jobId)
      if (!job || !project) {
        throw new ValidationExportError(
          'VALIDATION_JOB_NOT_FOUND',
          `Validation job ${body.jobId} was not found.`,
          404
        )
      }
      if (!job.report || job.state === 'queued' || job.state === 'running') {
        throw new ValidationExportError(
          'VALIDATION_STATE_INVALID',
          `Validation job ${body.jobId} is not complete.`,
          409
        )
      }
      const exported = exportGeneratedProject(project, job.report, {
        mode: exportMode(body.mode),
        ...(body.confirmWarnings === true ? { confirmWarnings: true } : {})
      })
      return reply
        .header('Content-Type', exported.mimeType)
        .header('Content-Disposition', `attachment; filename="${exported.filename}"`)
        .header('X-Forge-Export-Hash', exported.archiveHash)
        .send(Buffer.from(exported.bytes))
    } catch (error) {
      const payload = errorPayload(error, request.id)
      return reply.code(statusCodeFor(error, payload)).send(payload)
    }
  })

  return app
}

async function start() {
  const enginePort = parsePort(process.env.PORT)
  const previewPort = parsePreviewPort(process.env.PREVIEW_PORT)
  const previewOrigin = process.env.PREVIEW_ORIGIN ?? `http://127.0.0.1:${previewPort}`
  const studioOrigin = process.env.STUDIO_ORIGIN ?? 'http://127.0.0.1:5173'
  const validationJobs = new ValidationJobManager()
  const app = await buildServer({ validationJobs, previewOrigin, studioOrigin })
  const preview = await buildPreviewServer(validationJobs, {
    previewOrigin,
    studioOrigin
  })

  await Promise.all([
    app.listen({ host: '127.0.0.1', port: enginePort }),
    preview.listen({ host: '127.0.0.1', port: previewPort })
  ])
}

const entryPath = process.argv[1]
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  start().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Engine failed to start.'}\n`)
    process.exitCode = 1
  })
}
