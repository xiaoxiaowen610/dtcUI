import type { AnalyzeRequest, ForgeErrorPayload, GenerateResponse } from '@forge-ui/contracts'

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const payload = (await response.json()) as ForgeErrorPayload
    throw new Error(`${payload.code}: ${payload.message}`)
  }

  return (await response.json()) as T
}

export function generateFlagship(request: AnalyzeRequest): Promise<GenerateResponse> {
  return post<GenerateResponse>('/api/generate', request)
}
