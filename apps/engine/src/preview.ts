import Fastify from 'fastify'
import {
  ValidationJobManager,
  buildIsolatedPreviewHtml,
  previewContentSecurityPolicy
} from '../../../packages/validation-export/src/index'
import { stableHash } from '@forge-ui/shared'

interface PreviewServerOptions {
  logger?: boolean
  previewOrigin: string
  studioOrigin: string
}

export async function buildPreviewServer(
  validationJobs: ValidationJobManager,
  options: PreviewServerOptions
) {
  const app = Fastify({ logger: options.logger ?? false })

  app.get('/preview/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string }
    const project = validationJobs.projectFor(jobId)
    if (!project) {
      return reply.code(404).type('text/plain').send('Preview validation job was not found.')
    }
    const nonce = stableHash(`${jobId}:${options.previewOrigin}:${options.studioOrigin}`)
    const csp = previewContentSecurityPolicy(options.studioOrigin, nonce)
    return reply
      .header('Content-Security-Policy', csp)
      .header(
        'Permissions-Policy',
        'accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()'
      )
      .header('Referrer-Policy', 'no-referrer')
      .header('X-Content-Type-Options', 'nosniff')
      .header('Cache-Control', 'no-store')
      .type('text/html; charset=utf-8')
      .send(
        buildIsolatedPreviewHtml(project, {
          jobId,
          studioOrigin: options.studioOrigin,
          nonce
        })
      )
  })

  return app
}
