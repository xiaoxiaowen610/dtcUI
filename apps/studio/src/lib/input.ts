import {
  INPUT_LIMITS,
  designInputEnvelopeSchema,
  type DesignInputEnvelope
} from '@forge-ui/contracts'

export interface ImportFileMetadata {
  name: string
  size: number
  type: string
}

export type DesignJsonParseResult =
  { ok: true; input: DesignInputEnvelope } | { ok: false; error: string }

function jsonErrorLocation(source: string, error: SyntaxError): string {
  const explicit = error.message.match(/line (\d+) column (\d+)/i)
  if (explicit) return `line ${explicit[1]}, column ${explicit[2]}`

  const position = Number(error.message.match(/position (\d+)/i)?.[1])
  if (!Number.isFinite(position)) return 'an unknown location'
  const preceding = source.slice(0, position)
  const lines = preceding.split('\n')
  return `line ${lines.length}, column ${(lines.at(-1)?.length ?? 0) + 1}`
}

export function validateImportFile(metadata: ImportFileMetadata): string | undefined {
  const extensionAllowed = metadata.name.toLowerCase().endsWith('.json')
  const mimeAllowed = ['', 'application/json', 'text/json'].includes(metadata.type.toLowerCase())

  if (!extensionAllowed || !mimeAllowed) {
    return 'Choose a .json file with a JSON content type.'
  }
  if (metadata.size === 0) return 'The selected JSON file is empty.'
  if (metadata.size > INPUT_LIMITS.maxBytes) {
    return `The selected JSON file exceeds the ${INPUT_LIMITS.maxBytes} byte input limit.`
  }
  return undefined
}

export function parseDesignJson(source: string): DesignJsonParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch (error) {
    const syntaxError = error instanceof SyntaxError ? error : new SyntaxError('Invalid JSON.')
    return {
      ok: false,
      error: `JSON syntax error at ${jsonErrorLocation(source, syntaxError)}: ${syntaxError.message}`
    }
  }

  const result = designInputEnvelopeSchema.safeParse(parsed)
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ')
    return { ok: false, error: `Design Schema error: ${details}` }
  }

  return { ok: true, input: result.data }
}
