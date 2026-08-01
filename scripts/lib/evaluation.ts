import {
  evalCaseSchema,
  type ComponentMatchResult,
  type EvalCase,
  type EvalKind,
  type GenerateResponse
} from '@forge-ui/contracts'
import { DesignIrError } from '@forge-ui/design-ir'
import { generateDesign } from '../../apps/engine/src/pipeline'

export interface EvalCaseResult {
  id: string
  name: string
  kind: EvalKind
  status: 'passed' | 'failed'
  actual: {
    generationSuccess: boolean
    errorCode?: string
    matches: Record<string, string>
    strategies: Record<string, ComponentMatchResult['strategy']>
    diagnostics: string[]
  }
  differences: string[]
}

export interface EvaluationReport {
  schemaVersion: '1.0'
  suite: 'forgeui-fixed-evals'
  totals: {
    cases: number
    passed: number
    failed: number
    valid: number
    degraded: number
    invalid: number
  }
  cases: EvalCaseResult[]
}

export class EvalSuiteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EvalSuiteError'
  }
}

function errorCode(error: unknown): string {
  if (error instanceof DesignIrError) return error.code
  if (error instanceof Error && error.name === 'ZodError') return 'DESIGN_SCHEMA_INVALID'
  if (error && typeof error === 'object' && 'code' in error) {
    const candidate = (error as { code?: unknown }).code
    if (typeof candidate === 'string') return candidate
  }
  return 'UNEXPECTED_ERROR'
}

function sortedRecord(entries: Array<[string, string]>): Record<string, string> {
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)))
}

function actualForSuccess(result: GenerateResponse): EvalCaseResult['actual'] {
  return {
    generationSuccess: true,
    matches: sortedRecord(
      result.matches
        .filter((match) => match.componentId)
        .map((match) => [match.nodeId, match.componentId!] as [string, string])
    ),
    strategies: sortedRecord(
      result.matches.map((match) => [match.nodeId, match.strategy] as [string, string])
    ) as Record<string, ComponentMatchResult['strategy']>,
    diagnostics: [...new Set(result.diagnostics.map((diagnostic) => diagnostic.code))].sort()
  }
}

function actualForError(error: unknown): EvalCaseResult['actual'] {
  return {
    generationSuccess: false,
    errorCode: errorCode(error),
    matches: {},
    strategies: {},
    diagnostics: []
  }
}

function compareRecord(
  label: string,
  expected: Record<string, string> | undefined,
  actual: Record<string, string>,
  differences: string[]
) {
  if (!expected) return

  for (const [key, value] of Object.entries(expected).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    if (actual[key] !== value) {
      differences.push(
        `${label}.${key}: expected ${value}, received ${actual[key] ?? '<missing>'}.`
      )
    }
  }
}

function evaluateCase(evalCase: EvalCase): EvalCaseResult {
  let actual: EvalCaseResult['actual']

  try {
    actual = actualForSuccess(
      generateDesign({ input: evalCase.input, registry: evalCase.registry })
    )
  } catch (error) {
    actual = actualForError(error)
  }

  const differences: string[] = []
  const expectedSuccess = evalCase.expected.generationSuccess ?? evalCase.kind !== 'invalid'

  if (actual.generationSuccess !== expectedSuccess) {
    differences.push(
      `generationSuccess: expected ${expectedSuccess}, received ${actual.generationSuccess}.`
    )
  }

  if (evalCase.expected.errorCode && actual.errorCode !== evalCase.expected.errorCode) {
    differences.push(
      `errorCode: expected ${evalCase.expected.errorCode}, received ${actual.errorCode ?? '<missing>'}.`
    )
  }

  compareRecord('matches', evalCase.expected.expectedMatches, actual.matches, differences)
  compareRecord('strategies', evalCase.expected.expectedStrategies, actual.strategies, differences)

  for (const diagnostic of [...(evalCase.expected.expectedDiagnostics ?? [])].sort()) {
    if (!actual.diagnostics.includes(diagnostic)) {
      differences.push(`diagnostics: expected ${diagnostic} was not emitted.`)
    }
  }

  if (evalCase.kind === 'valid' && actual.strategies) {
    const manualReview = Object.values(actual.strategies).filter(
      (strategy) => strategy === 'manual-review'
    ).length
    if (manualReview > 0) {
      differences.push(`valid case unexpectedly produced ${manualReview} manual-review match(es).`)
    }
  }

  if (
    evalCase.kind === 'degraded' &&
    !Object.values(actual.strategies).some((strategy) => strategy === 'manual-review')
  ) {
    differences.push('degraded case did not exercise a manual-review path.')
  }

  return {
    id: evalCase.id,
    name: evalCase.name,
    kind: evalCase.kind,
    status: differences.length === 0 ? 'passed' : 'failed',
    actual,
    differences
  }
}

export function validateEvalCases(input: unknown[]): EvalCase[] {
  const cases = input.map((item) => evalCaseSchema.parse(item))
  const seen = new Set<string>()

  for (const evalCase of cases) {
    if (seen.has(evalCase.id)) {
      throw new EvalSuiteError(`Duplicate eval case ID: ${evalCase.id}`)
    }
    seen.add(evalCase.id)
  }

  return cases.sort((left, right) => left.id.localeCompare(right.id))
}

export function runEvaluation(input: unknown[]): EvaluationReport {
  const cases = validateEvalCases(input).map(evaluateCase)
  const passed = cases.filter((evalCase) => evalCase.status === 'passed').length

  return {
    schemaVersion: '1.0',
    suite: 'forgeui-fixed-evals',
    totals: {
      cases: cases.length,
      passed,
      failed: cases.length - passed,
      valid: cases.filter((evalCase) => evalCase.kind === 'valid').length,
      degraded: cases.filter((evalCase) => evalCase.kind === 'degraded').length,
      invalid: cases.filter((evalCase) => evalCase.kind === 'invalid').length
    },
    cases
  }
}
