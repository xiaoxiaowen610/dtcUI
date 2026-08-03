import type { AnalyzeRequest, ForgeErrorPayload, GenerateResponse } from '@forge-ui/contracts'
import type {
  ExportMode,
  PreviewDescriptor,
  ValidationJobSnapshot
} from '../../../../packages/validation-export/src/index'

export const GENERATION_COMPLETED_EVENT = 'forge:generation-completed'

export interface GenerationCompletedDetail {
  request: AnalyzeRequest
  result: GenerateResponse
}

export interface CreateValidationJobResponse {
  job: ValidationJobSnapshot
  preview: PreviewDescriptor
}

export class EngineRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly requestId: string | undefined,
    readonly status: number
  ) {
    super(`${code}: ${message}`)
    this.name = 'EngineRequestError'
  }
}

function isForgeErrorPayload(value: unknown): value is ForgeErrorPayload {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ForgeErrorPayload>
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.requestId === 'string'
  )
}

async function requestError(response: Response): Promise<EngineRequestError> {
  try {
    const payload: unknown = await response.json()
    if (isForgeErrorPayload(payload)) {
      return new EngineRequestError(
        payload.code,
        payload.message,
        payload.requestId,
        response.status
      )
    }
  } catch {
    // The safe fallback below handles non-JSON and unreadable response bodies.
  }

  return new EngineRequestError(
    'ENGINE_REQUEST_FAILED',
    `Engine request failed with HTTP ${response.status}.`,
    response.headers.get('x-request-id') ?? undefined,
    response.status
  )
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw await requestError(response)
  }

  return (await response.json()) as T
}

export async function generateProject(request: AnalyzeRequest): Promise<GenerateResponse> {
  const result = await post<GenerateResponse>('/api/generate', request)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<GenerationCompletedDetail>(GENERATION_COMPLETED_EVENT, {
        detail: { request, result }
      })
    )
  }
  return result
}

export function createValidationJob(
  request: AnalyzeRequest
): Promise<CreateValidationJobResponse> {
  return post<CreateValidationJobResponse>('/api/validation-jobs', request)
}

export async function getValidationJob(jobId: string): Promise<ValidationJobSnapshot> {
  const response = await fetch(`/api/validation-jobs/${encodeURIComponent(jobId)}`)
  if (!response.ok) throw await requestError(response)
  return (await response.json()) as ValidationJobSnapshot
}

export function reportRuntimeError(
  jobId: string,
  message: string,
  stack?: string
): Promise<ValidationJobSnapshot> {
  return post<ValidationJobSnapshot>(
    `/api/validation-jobs/${encodeURIComponent(jobId)}/runtime-events`,
    {
      type: 'forge:runtime-error',
      message,
      ...(stack ? { stack } : {})
    }
  )
}

export async function requestExport(
  jobId: string,
  mode: ExportMode,
  confirmWarnings: boolean
): Promise<{ blob: Blob; filename: string; archiveHash: string | undefined }> {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, mode, confirmWarnings })
  })
  if (!response.ok) throw await requestError(response)
  const disposition = response.headers.get('content-disposition') ?? ''
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `forgeui-${mode}.zip`
  return {
    blob: await response.blob(),
    filename,
    archiveHash: response.headers.get('x-forge-export-hash') ?? undefined
  }
}
