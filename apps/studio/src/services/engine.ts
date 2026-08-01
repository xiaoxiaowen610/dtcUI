import type { AnalyzeRequest, ForgeErrorPayload, GenerateResponse } from '@forge-ui/contracts'

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

export function generateFlagship(request: AnalyzeRequest): Promise<GenerateResponse> {
  return post<GenerateResponse>('/api/generate', request)
}
