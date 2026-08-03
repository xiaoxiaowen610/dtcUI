import type { GeneratedProject } from '@forge-ui/contracts'
import { stableHash, stableStringify } from '@forge-ui/shared'
import {
  FIXED_VISUAL_ENVIRONMENT,
  PREVIEW_IFRAME_SANDBOX,
  RUNTIME_BRIDGE_VERSION,
  type PreviewDescriptor,
  type RuntimeBridgeEventLike,
  type RuntimeBridgeValidationResult,
  type VisualBaseline
} from './types'
import { nodeIdsInProject } from './harness'
import { FIXED_VIEWPORTS } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function validateRuntimeBridgeEvent(
  event: RuntimeBridgeEventLike,
  expectedOrigin: string,
  expectedSource: unknown
): RuntimeBridgeValidationResult {
  if (event.origin !== expectedOrigin) {
    return {
      accepted: false,
      diagnostic: {
        code: 'BRIDGE_ORIGIN_REJECTED',
        message: `Rejected runtime message from unexpected origin ${event.origin}.`
      }
    }
  }
  if (event.source !== expectedSource) {
    return {
      accepted: false,
      diagnostic: {
        code: 'BRIDGE_SOURCE_REJECTED',
        message: 'Rejected runtime message from an unexpected Window source.'
      }
    }
  }
  if (!isRecord(event.data) || event.data.schemaVersion !== RUNTIME_BRIDGE_VERSION) {
    return {
      accepted: false,
      diagnostic: {
        code: 'BRIDGE_SCHEMA_REJECTED',
        message: 'Rejected runtime message with an unsupported schema version.'
      }
    }
  }
  if (
    event.data.type !== 'forge:ready' &&
    event.data.type !== 'forge:node-select' &&
    event.data.type !== 'forge:runtime-error'
  ) {
    return {
      accepted: false,
      diagnostic: {
        code: 'BRIDGE_TYPE_REJECTED',
        message: 'Rejected unknown runtime message type.'
      }
    }
  }
  if (!isRecord(event.data.payload)) {
    return {
      accepted: false,
      diagnostic: {
        code: 'BRIDGE_PAYLOAD_REJECTED',
        message: 'Rejected malformed runtime payload.'
      }
    }
  }
  if (event.data.type === 'forge:node-select' && typeof event.data.payload.nodeId !== 'string') {
    return {
      accepted: false,
      diagnostic: {
        code: 'BRIDGE_PAYLOAD_REJECTED',
        message: 'Node selection requires a nodeId.'
      }
    }
  }
  if (event.data.type === 'forge:runtime-error' && typeof event.data.payload.message !== 'string') {
    return {
      accepted: false,
      diagnostic: {
        code: 'BRIDGE_PAYLOAD_REJECTED',
        message: 'Runtime errors require a message.'
      }
    }
  }

  return {
    accepted: true,
    message: {
      schemaVersion: RUNTIME_BRIDGE_VERSION,
      type: event.data.type,
      payload: event.data.payload
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e')
}

export function previewContentSecurityPolicy(studioOrigin: string, nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`,
    "img-src data: blob:",
    "font-src 'none'",
    "connect-src 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    `frame-ancestors ${studioOrigin}`
  ].join('; ')
}

export function createPreviewDescriptor(
  previewOrigin: string,
  studioOrigin: string,
  jobId: string
): PreviewDescriptor {
  const nonce = stableHash(`${jobId}:${previewOrigin}:${studioOrigin}`)
  return {
    url: `${previewOrigin}/preview/${encodeURIComponent(jobId)}`,
    origin: previewOrigin,
    sandbox: PREVIEW_IFRAME_SANDBOX,
    csp: previewContentSecurityPolicy(studioOrigin, nonce)
  }
}

export function buildIsolatedPreviewHtml(
  project: GeneratedProject,
  options: { jobId: string; studioOrigin: string; nonce: string }
): string {
  const nodeIds = nodeIdsInProject(project)
  const title = project.manifest.generationId
  const nodes = nodeIds
    .map(
      (nodeId, index) =>
        `<button data-forge-node-id="${escapeHtml(nodeId)}" class="node ${index === 0 ? 'hero' : ''}"><strong>${escapeHtml(nodeId)}</strong><span>Generated node</span></button>`
    )
    .join('\n')
  const bootstrap = {
    studioOrigin: options.studioOrigin,
    schemaVersion: RUNTIME_BRIDGE_VERSION,
    jobId: options.jobId
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} isolated preview</title>
  <style nonce="${options.nonce}">
    *{box-sizing:border-box}html{color-scheme:dark;background:#070b14}body{margin:0;min-width:320px;font-family:Inter,system-ui,sans-serif;background:#070b14;color:#f7f8fb}.shell{min-height:100vh;padding:clamp(24px,6vw,72px);overflow:hidden;background:radial-gradient(circle at 75% 15%,#3b82f633,transparent 35%)}.meta{max-width:1100px;margin:0 auto 32px}.meta p{color:#9ba7bd}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px;max-width:1100px;margin:0 auto}.node{appearance:none;width:100%;min-height:140px;padding:24px;border:1px solid #263248;border-radius:20px;background:#111827;color:inherit;text-align:left;cursor:pointer}.node:hover,.node:focus-visible{border-color:#60a5fa;outline:3px solid #60a5fa55;outline-offset:3px}.node strong,.node span{display:block}.node span{margin-top:10px;color:#9ba7bd}.hero{grid-column:1/-1;min-height:260px;background:linear-gradient(135deg,#111827,#172554)}@media(max-width:800px){.shell{padding:24px}.hero{min-height:200px}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="meta"><small>Isolated Preview · ${escapeHtml(options.jobId)}</small><h1>${escapeHtml(title)}</h1><p>Network access is disabled by CSP. Select a generated node to synchronize Studio.</p></header>
    <section class="grid" aria-label="Generated nodes">${nodes}</section>
  </main>
  <script nonce="${options.nonce}">
    const config = ${escapeScriptJson(bootstrap)};
    const send = (type, payload) => parent.postMessage({schemaVersion: config.schemaVersion, type, payload}, config.studioOrigin);
    addEventListener('error', (event) => send('forge:runtime-error', {message: event.message || 'Unknown runtime error', stack: event.error && event.error.stack ? String(event.error.stack) : undefined}));
    addEventListener('unhandledrejection', (event) => send('forge:runtime-error', {message: event.reason instanceof Error ? event.reason.message : String(event.reason), stack: event.reason instanceof Error ? event.reason.stack : undefined}));
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-forge-node-id]') : null;
      const nodeId = target && target.getAttribute('data-forge-node-id');
      if (nodeId) send('forge:node-select', {nodeId});
    });
    send('forge:ready', {jobId: config.jobId, nodeCount: document.querySelectorAll('[data-forge-node-id]').length});
  </script>
</body>
</html>`
}

export function approveVisualBaseline(
  generationId: string,
  hashes: Record<string, string>,
  approvedBy: string,
  approvedAt: string
): VisualBaseline {
  if (!approvedBy.trim()) throw new Error('Visual baseline approval requires an approver.')
  return {
    id: `visual_${stableHash(stableStringify({ generationId, hashes, approvedBy }))}`,
    generationId,
    environment: FIXED_VISUAL_ENVIRONMENT,
    hashes: Object.fromEntries(
      Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right))
    ),
    approvedBy,
    approvedAt
  }
}
