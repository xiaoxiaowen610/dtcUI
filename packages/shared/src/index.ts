export function stableHash(value: string): string {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

function sortSerializable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortSerializable)
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortSerializable(nestedValue)])
    )
  }

  return value
}

export function stableStringify(value: unknown, spacing = 0): string {
  return JSON.stringify(sortSerializable(value), null, spacing)
}

export function toCssVariable(path: string): string {
  return `--${path
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .toLowerCase()}`
}
