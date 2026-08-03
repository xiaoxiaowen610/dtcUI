import type { GeneratedProject, GenerationDiagnostic } from '@forge-ui/contracts'

export const RUNTIME_BRIDGE_VERSION = '1.0' as const
export const PREVIEW_IFRAME_SANDBOX = 'allow-scripts' as const
export const FIXED_VIEWPORTS = [390, 768, 1440] as const
export const FIXED_VISUAL_ENVIRONMENT = {
  locale: 'en-US',
  timezone: 'UTC',
  deviceScaleFactor: 1,
  fonts: ['Inter', 'system-ui', 'sans-serif']
} as const

export type ValidationJobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
export type ValidationCheckName =
  | 'schema'
  | 'typescript'
  | 'build'
  | 'runtime'
  | 'layout'
  | 'accessibility'
  | 'visual'
export type ValidationCheckStatus = 'queued' | 'running' | 'passed' | 'failed' | 'skipped'
export type ExportMode = 'standalone' | 'integration'

export interface ValidationLogEntry {
  sequence: number
  timestamp: string
  level: 'info' | 'warning' | 'error'
  event: string
  message: string
  check?: ValidationCheckName
  details?: Record<string, unknown>
}

export interface ValidationCheckResult {
  name: ValidationCheckName
  status: ValidationCheckStatus
  startedAt: string
  completedAt: string
  durationMs: number
  diagnostics: GenerationDiagnostic[]
  details: Record<string, unknown>
}

export interface ValidationReport {
  schemaVersion: typeof RUNTIME_BRIDGE_VERSION
  generationId: string
  createdAt: string
  completedAt: string
  environment: {
    locale: string
    timezone: string
    deviceScaleFactor: number
    fonts: string[]
    viewports: number[]
    browser: string | null
  }
  checks: ValidationCheckResult[]
  summary: {
    passed: number
    failed: number
    skipped: number
    warnings: number
    blockingErrors: number
  }
  exportGate: {
    allowed: boolean
    warningsRequireConfirmation: boolean
    reasons: string[]
  }
}

export interface ValidationJobSnapshot {
  id: string
  requestId: string
  generationId: string
  state: ValidationJobState
  createdAt: string
  updatedAt: string
  logs: ValidationLogEntry[]
  report?: ValidationReport
}

export interface ValidationEnvironment {
  browser?: {
    name: string
    version: string
    locale: string
    timezone: string
    deviceScaleFactor: number
    fonts: string[]
    viewports: number[]
  }
  visualBaseline?: VisualBaseline
  currentVisualHashes?: Record<string, string>
  runtimeProbe?: (project: GeneratedProject) => Promise<RuntimeProbeResult>
  now?: () => Date
}

export interface RuntimeProbeResult {
  passed: boolean
  selectedNodeIds: string[]
  errors: string[]
  details?: Record<string, unknown>
}

export interface VisualBaseline {
  id: string
  generationId: string
  environment: typeof FIXED_VISUAL_ENVIRONMENT
  hashes: Record<string, string>
  approvedBy: string
  approvedAt: string
}

export interface RuntimeBridgeMessage {
  schemaVersion: typeof RUNTIME_BRIDGE_VERSION
  type: 'forge:ready' | 'forge:node-select' | 'forge:runtime-error'
  payload: Record<string, unknown>
}

export interface RuntimeBridgeEventLike {
  origin: string
  source: unknown
  data: unknown
}

export interface RuntimeBridgeValidationResult {
  accepted: boolean
  message?: RuntimeBridgeMessage
  diagnostic?: {
    code:
      | 'BRIDGE_ORIGIN_REJECTED'
      | 'BRIDGE_SOURCE_REJECTED'
      | 'BRIDGE_SCHEMA_REJECTED'
      | 'BRIDGE_TYPE_REJECTED'
      | 'BRIDGE_PAYLOAD_REJECTED'
    message: string
  }
}

export interface PreviewDescriptor {
  url: string
  origin: string
  sandbox: typeof PREVIEW_IFRAME_SANDBOX
  csp: string
}

export interface ExportResult {
  mode: ExportMode
  filename: string
  mimeType: 'application/zip'
  bytes: Uint8Array
  entries: Array<{ path: string; contentHash: string; size: number }>
  archiveHash: string
}

export class ValidationExportError extends Error {
  constructor(
    readonly code:
      | 'VALIDATION_JOB_NOT_FOUND'
      | 'VALIDATION_STATE_INVALID'
      | 'EXPORT_VALIDATION_BLOCKED'
      | 'EXPORT_WARNING_CONFIRMATION_REQUIRED'
      | 'EXPORT_PATH_INVALID'
      | 'EXPORT_PATH_DUPLICATE',
    message: string,
    readonly statusCode: 400 | 404 | 409 = 400
  ) {
    super(message)
    this.name = 'ValidationExportError'
  }
}
