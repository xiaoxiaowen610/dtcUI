import {
  tokenAliasSchema,
  type ExternalToken,
  type GenerationDiagnostic,
  type ResolvedToken,
  type TokenResolution,
  type TokenType
} from '@forge-ui/contracts'
import { stableStringify, toCssVariable } from '@forge-ui/shared'

interface ConcreteValue {
  cssValue: string
  resolvedValue: unknown
  comparisonKey: string
}

const unsafeCss = /[;{}<>\n\r]|(?:url|expression)\s*\(|@import/i
const tokenPath = /^[A-Za-z0-9]+(?:[._/-][A-Za-z0-9]+)*$/

export class TokenResolverError extends Error {
  constructor(readonly diagnostics: GenerationDiagnostic[]) {
    super(diagnostics.map((diagnostic) => diagnostic.message).join('; '))
    this.name = 'TokenResolverError'
  }
}

function diagnostic(
  code: string,
  severity: GenerationDiagnostic['severity'],
  message: string,
  blocking: boolean,
  suggestedActions: string[]
): GenerationDiagnostic {
  return {
    code,
    stage: 'token-resolver',
    severity,
    message,
    blocking,
    suggestedActions
  }
}

function safeCssText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !unsafeCss.test(value)
}

function normalizeColor(value: unknown): ConcreteValue | undefined {
  if (!safeCssText(value)) return undefined
  const trimmed = value.trim()
  const valid =
    /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed) ||
    /^(?:rgb|rgba|hsl|hsla)\([0-9.%+\-/,\s]+\)$/i.test(trimmed) ||
    /^(?:transparent|currentColor)$/i.test(trimmed)
  if (!valid) return undefined

  const normalized = trimmed.startsWith('#') ? trimmed.toLowerCase() : trimmed
  return {
    cssValue: normalized,
    resolvedValue: normalized,
    comparisonKey: normalized.toLowerCase().replaceAll(/\s+/g, '')
  }
}

function normalizeDimension(value: unknown): ConcreteValue | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as { value?: unknown; unit?: unknown }
  if (
    typeof candidate.value !== 'number' ||
    !Number.isFinite(candidate.value) ||
    !['px', 'rem', '%', 'vw', 'vh'].includes(String(candidate.unit))
  ) {
    return undefined
  }

  const numericValue = Object.is(candidate.value, -0) ? 0 : candidate.value
  const normalized = { value: numericValue, unit: candidate.unit as string }
  return {
    cssValue: `${numericValue}${normalized.unit}`,
    resolvedValue: normalized,
    comparisonKey: stableStringify(normalized)
  }
}

function normalizeFontWeight(value: unknown): ConcreteValue | undefined {
  if (!(
    (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1000) ||
    value === 'normal' ||
    value === 'bold'
  )) {
    return undefined
  }

  return {
    cssValue: String(value),
    resolvedValue: value,
    comparisonKey: String(value)
  }
}

function normalizeTypography(value: unknown): ConcreteValue | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const candidate = value as Record<string, unknown>
  const allowed = new Set(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight'])
  if (Object.keys(candidate).some((key) => !allowed.has(key))) return undefined
  if (!safeCssText(candidate.fontFamily)) return undefined

  const fontSize = normalizeDimension(candidate.fontSize)
  const weight = normalizeFontWeight(candidate.fontWeight ?? 'normal')
  const lineHeight =
    typeof candidate.lineHeight === 'number' && Number.isFinite(candidate.lineHeight)
      ? String(candidate.lineHeight)
      : normalizeDimension(candidate.lineHeight)?.cssValue

  if (!fontSize || !weight || !lineHeight) return undefined

  const normalized = {
    fontFamily: candidate.fontFamily.trim(),
    fontSize: fontSize.resolvedValue,
    fontWeight: weight.resolvedValue,
    lineHeight:
      typeof candidate.lineHeight === 'number'
        ? candidate.lineHeight
        : normalizeDimension(candidate.lineHeight)?.resolvedValue
  }

  return {
    cssValue: `${weight.cssValue} ${fontSize.cssValue}/${lineHeight} ${candidate.fontFamily.trim()}`,
    resolvedValue: normalized,
    comparisonKey: stableStringify(normalized)
  }
}

function normalizeConcrete(type: TokenType, value: unknown): ConcreteValue | undefined {
  switch (type) {
    case 'color':
      return normalizeColor(value)
    case 'dimension':
    case 'radius':
      return normalizeDimension(value)
    case 'fontWeight':
      return normalizeFontWeight(value)
    case 'typography':
      return normalizeTypography(value)
    case 'fontFamily':
    case 'shadow': {
      if (!safeCssText(value)) return undefined
      const normalized = value.trim()
      return {
        cssValue: normalized,
        resolvedValue: normalized,
        comparisonKey: normalized.replaceAll(/\s+/g, ' ')
      }
    }
  }
}

function aliasRef(value: unknown): string | undefined {
  const parsed = tokenAliasSchema.safeParse(value)
  return parsed.success ? parsed.data.ref.trim() : undefined
}

function hasAliasShape(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && 'ref' in value)
}

function cycleDiagnostics(tokens: ExternalToken[], tokenByPath: Map<string, ExternalToken>) {
  const diagnostics: GenerationDiagnostic[] = []
  const completed = new Set<string>()

  for (const token of tokens) {
    if (completed.has(token.path) || !aliasRef(token.value)) continue

    const chain: string[] = []
    const positions = new Map<string, number>()
    let cursor: ExternalToken | undefined = token

    while (cursor && aliasRef(cursor.value) && !completed.has(cursor.path)) {
      const position = positions.get(cursor.path)
      if (position !== undefined) {
        const cycle = [...chain.slice(position), cursor.path]
        diagnostics.push(
          diagnostic(
            'TOKEN_ALIAS_CYCLE',
            'error',
            `Token alias cycle detected: ${cycle.join(' -> ')}.`,
            true,
            ['Break the alias cycle by assigning one token a concrete value.']
          )
        )
        break
      }

      positions.set(cursor.path, chain.length)
      chain.push(cursor.path)
      cursor = tokenByPath.get(aliasRef(cursor.value)!)
    }

    chain.forEach((path) => completed.add(path))
  }

  return diagnostics
}

interface LabColor {
  l: number
  a: number
  b: number
}

function hexToLab(value: unknown): LabColor | undefined {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return undefined
  const channels = [1, 3, 5].map(
    (offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255
  )
  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  )
  const x = (red * 0.4124 + green * 0.3576 + blue * 0.1805) / 0.95047
  const y = red * 0.2126 + green * 0.7152 + blue * 0.0722
  const z = (red * 0.0193 + green * 0.1192 + blue * 0.9505) / 1.08883
  const transform = (channel: number) =>
    channel > 0.008856 ? Math.cbrt(channel) : 7.787 * channel + 16 / 116
  const fx = transform(x)
  const fy = transform(y)
  const fz = transform(z)
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

function colorDelta(left: unknown, right: unknown): number | undefined {
  const leftLab = hexToLab(left)
  const rightLab = hexToLab(right)
  if (!leftLab || !rightLab) return undefined
  return Math.sqrt(
    (leftLab.l - rightLab.l) ** 2 + (leftLab.a - rightLab.a) ** 2 + (leftLab.b - rightLab.b) ** 2
  )
}

function similarDiagnostics(tokens: ResolvedToken[]): GenerationDiagnostic[] {
  const diagnostics: GenerationDiagnostic[] = []
  const concrete = tokens.filter((token) => !token.aliasRef)

  for (let leftIndex = 0; leftIndex < concrete.length; leftIndex += 1) {
    const left = concrete[leftIndex]!
    for (let rightIndex = leftIndex + 1; rightIndex < concrete.length; rightIndex += 1) {
      const right = concrete[rightIndex]!
      if (
        left.type !== right.type ||
        stableStringify(left.resolvedValue) === stableStringify(right.resolvedValue)
      ) {
        continue
      }

      const delta =
        left.type === 'color' ? colorDelta(left.resolvedValue, right.resolvedValue) : undefined
      const leftDimension = left.resolvedValue as { value?: unknown; unit?: unknown }
      const rightDimension = right.resolvedValue as { value?: unknown; unit?: unknown }
      const dimensionNear =
        ['dimension', 'radius'].includes(left.type) &&
        leftDimension.unit === rightDimension.unit &&
        typeof leftDimension.value === 'number' &&
        typeof rightDimension.value === 'number' &&
        Math.abs(leftDimension.value - rightDimension.value) <=
          Math.max(0.25, Math.abs(leftDimension.value) * 0.1)

      if ((delta !== undefined && delta < 8) || dimensionNear) {
        diagnostics.push(
          diagnostic(
            'TOKEN_SIMILAR_VALUE',
            'info',
            `Tokens ${left.path} and ${right.path} have similar ${left.type} values.`,
            false,
            ['Review the affected semantics before choosing whether to reuse one token.']
          )
        )
      }
    }
  }

  return diagnostics
}

export function resolveTokens(input: ExternalToken[]): TokenResolution {
  const tokens = [...input].sort((left, right) => left.path.localeCompare(right.path))
  const diagnostics: GenerationDiagnostic[] = []
  const tokenByPath = new Map<string, ExternalToken>()
  const pathByVariable = new Map<string, string>()
  const concreteByPath = new Map<string, ConcreteValue>()

  for (const token of tokens) {
    if (!tokenPath.test(token.path)) {
      diagnostics.push(
        diagnostic(
          'TOKEN_PATH_INVALID',
          'error',
          `Token path ${JSON.stringify(token.path)} is not a stable token path.`,
          true,
          ['Use alphanumeric path segments separated by dot, slash, underscore, or hyphen.']
        )
      )
    }

    if (tokenByPath.has(token.path)) {
      diagnostics.push(
        diagnostic(
          'TOKEN_DUPLICATE_PATH',
          'error',
          `Token path ${token.path} is declared more than once.`,
          true,
          ['Keep one explicit value per token path.']
        )
      )
    } else {
      tokenByPath.set(token.path, token)
    }

    const variable = toCssVariable(token.path)
    const existingPath = pathByVariable.get(variable)
    if (existingPath && existingPath !== token.path) {
      diagnostics.push(
        diagnostic(
          'TOKEN_CSS_VARIABLE_COLLISION',
          'error',
          `Token paths ${existingPath} and ${token.path} both map to ${variable}.`,
          true,
          ['Rename one token path so generated CSS variables remain unique.']
        )
      )
    } else {
      pathByVariable.set(variable, token.path)
    }
  }

  for (const token of tokens) {
    const reference = aliasRef(token.value)
    if (hasAliasShape(token.value) && !reference) {
      diagnostics.push(
        diagnostic(
          'TOKEN_REFERENCE_INVALID',
          'error',
          `Token ${token.path} contains an invalid alias reference.`,
          true,
          ['Use an alias object with one non-empty ref path.']
        )
      )
      continue
    }

    if (reference) {
      const target = tokenByPath.get(reference)
      if (!target) {
        diagnostics.push(
          diagnostic(
            'TOKEN_REFERENCE_MISSING',
            'error',
            `Token ${token.path} references missing token ${reference}.`,
            true,
            ['Add the referenced token or replace the alias with a concrete value.']
          )
        )
      } else if (target.type !== token.type) {
        diagnostics.push(
          diagnostic(
            'TOKEN_TYPE_MISMATCH',
            'error',
            `Token ${token.path} (${token.type}) cannot reference ${reference} (${target.type}).`,
            true,
            ['Point aliases to a token with the same type.']
          )
        )
      }
      continue
    }

    const concrete = normalizeConcrete(token.type, token.value)
    if (!concrete) {
      diagnostics.push(
        diagnostic(
          'TOKEN_VALUE_INVALID',
          'error',
          `Token ${token.path} has an invalid ${token.type} value.`,
          true,
          ['Use a supported, serializable value without executable CSS content.']
        )
      )
    } else {
      concreteByPath.set(token.path, concrete)
    }
  }

  diagnostics.push(...cycleDiagnostics(tokens, tokenByPath))
  const errors = diagnostics.filter((item) => item.blocking)
  if (errors.length > 0) {
    throw new TokenResolverError(
      errors.sort((left, right) =>
        `${left.code}:${left.message}`.localeCompare(`${right.code}:${right.message}`)
      )
    )
  }

  const resolvedByPath = new Map<string, ResolvedToken>()

  for (const token of tokens) {
    if (resolvedByPath.has(token.path)) continue
    const chain: ExternalToken[] = []
    let cursor = token

    while (!resolvedByPath.has(cursor.path) && aliasRef(cursor.value)) {
      chain.push(cursor)
      cursor = tokenByPath.get(aliasRef(cursor.value)!)!
    }

    if (!resolvedByPath.has(cursor.path)) {
      const concrete = concreteByPath.get(cursor.path)!
      resolvedByPath.set(cursor.path, {
        path: cursor.path,
        type: cursor.type,
        level: cursor.level,
        cssVariable: toCssVariable(cursor.path),
        cssValue: concrete.cssValue,
        resolvedValue: concrete.resolvedValue,
        ...(cursor.description ? { description: cursor.description } : {}),
        ...(cursor.source ? { source: cursor.source } : {})
      })
    }

    for (const alias of chain.reverse()) {
      const reference = aliasRef(alias.value)!
      const target = resolvedByPath.get(reference)!
      resolvedByPath.set(alias.path, {
        path: alias.path,
        type: alias.type,
        level: alias.level,
        cssVariable: toCssVariable(alias.path),
        cssValue: `var(${toCssVariable(reference)})`,
        resolvedValue: target.resolvedValue,
        aliasRef: reference,
        ...(alias.description ? { description: alias.description } : {}),
        ...(alias.source ? { source: alias.source } : {})
      })
    }
  }

  const resolved = [...resolvedByPath.values()].sort((left, right) =>
    left.path.localeCompare(right.path)
  )
  const firstConcreteByValue = new Map<string, string>()
  let exactReuse = 0

  for (const token of resolved.filter((item) => !item.aliasRef)) {
    const key = `${token.type}:${stableStringify(token.resolvedValue)}`
    const existing = firstConcreteByValue.get(key)
    if (existing) {
      exactReuse += 1
      diagnostics.push(
        diagnostic(
          'TOKEN_EXACT_VALUE_REUSE',
          'info',
          `Token ${token.path} exactly matches ${existing}.`,
          false,
          ['Reuse may be selected after confirming the two semantic scopes are equivalent.']
        )
      )
    } else {
      firstConcreteByValue.set(key, token.path)
    }
  }

  diagnostics.push(...similarDiagnostics(resolved))
  diagnostics.sort((left, right) =>
    `${left.code}:${left.message}`.localeCompare(`${right.code}:${right.message}`)
  )
  const referenced = resolved.filter((token) => token.aliasRef).length

  return {
    schemaVersion: '1.0',
    tokens: resolved,
    summary: {
      total: resolved.length,
      referenced,
      reused: referenced + exactReuse,
      created: resolved.length - referenced,
      conflicts: 0
    },
    diagnostics
  }
}
