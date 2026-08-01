import { pathToFileURL } from 'node:url'
import cors from '@fastify/cors'
import { ENGINE_VERSION, SCHEMA_VERSION, type ForgeErrorPayload } from '@forge-ui/contracts'
import Fastify from 'fastify'
import { ZodError } from 'zod'
import { DesignIrError } from '@forge-ui/design-ir'
import { RegistryError } from '@forge-ui/component-registry'
import { GenerationPlanError } from '@forge-ui/generation-plan'
import { analyzeDesign, generateDesign } from './pipeline'

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

export async function buildServer() {
  const app = Fastify({
    logger: {
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
      return reply.code(400).send(errorPayload(error, request.id))
    }
  })

  app.post('/api/generate', async (request, reply) => {
    try {
      return generateDesign(request.body)
    } catch (error) {
      return reply.code(400).send(errorPayload(error, request.id))
    }
  })

  return app
}

async function start() {
  const app = await buildServer()
  const parsedPort = Number.parseInt(process.env.PORT ?? '4000', 10)
  const port = Number.isSafeInteger(parsedPort) ? parsedPort : 4000

  await app.listen({ host: '127.0.0.1', port })
}

const entryPath = process.argv[1]
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  start().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Engine failed to start.'}\n`)
    process.exitCode = 1
  })
}
