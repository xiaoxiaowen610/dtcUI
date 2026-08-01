import { pathToFileURL } from 'node:url'
import cors from '@fastify/cors'
import { ENGINE_VERSION, SCHEMA_VERSION, type ForgeErrorPayload } from '@forge-ui/contracts'
import Fastify from 'fastify'
import { ZodError } from 'zod'
import { DesignIrError } from '@forge-ui/design-ir'
import { RegistryError } from '@forge-ui/component-registry'
import { GenerationPlanError } from '@forge-ui/generation-plan'
import { analyzeDesign, generateDesign } from './pipeline'

interface BuildServerOptions {
  logger?: boolean
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

function statusCodeFor(payload: ForgeErrorPayload): 400 | 500 {
  return payload.code === 'INTERNAL_ERROR' ? 500 : 400
}

export function parsePort(value: string | undefined): number {
  const port = value === undefined ? 4000 : Number(value)
  return Number.isInteger(port) && port >= 1 && port <= 65_535 ? port : 4000
}

export async function buildServer(options: BuildServerOptions = {}) {
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            level: process.env.LOG_LEVEL ?? 'info',
            redact: ['req.headers.authorization']
          },
    bodyLimit: 5 * 1024 * 1024,
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
      return reply.code(statusCodeFor(payload)).send(payload)
    }
  })

  app.post('/api/generate', async (request, reply) => {
    try {
      return generateDesign(request.body)
    } catch (error) {
      const payload = errorPayload(error, request.id)
      return reply.code(statusCodeFor(payload)).send(payload)
    }
  })

  return app
}

async function start() {
  const app = await buildServer()
  const port = parsePort(process.env.PORT)

  await app.listen({ host: '127.0.0.1', port })
}

const entryPath = process.argv[1]
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  start().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Engine failed to start.'}\n`)
    process.exitCode = 1
  })
}
