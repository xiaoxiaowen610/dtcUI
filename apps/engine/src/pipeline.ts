import { generateProject } from '@forge-ui/code-generator'
import { matchComponents, validateRegistry } from '@forge-ui/component-registry'
import {
  analyzeRequestSchema,
  type AnalyzeResponse,
  type GenerateResponse,
  type GenerationDiagnostic
} from '@forge-ui/contracts'
import { createDesignDocument, walkDesignNodes } from '@forge-ui/design-ir'
import { createGenerationPlan } from '@forge-ui/generation-plan'
import { resolveTokens } from '@forge-ui/token-resolver'

export function analyzeDesign(request: unknown): AnalyzeResponse {
  const parsed = analyzeRequestSchema.parse(request)
  const document = createDesignDocument(parsed.input)
  const tokenResolution = resolveTokens(document.tokens)
  const registry = validateRegistry(parsed.registry)
  const matches = matchComponents(document, registry, tokenResolution)
  const nodes = walkDesignNodes(document.root)
  const diagnostics: GenerationDiagnostic[] = [
    ...tokenResolution.diagnostics,
    ...matches
      .filter((match) => match.strategy === 'manual-review')
      .map((match): GenerationDiagnostic => ({
        code: 'COMPONENT_MANUAL_REVIEW',
        stage: 'registry',
        severity: 'warning',
        message: `Node ${match.nodeId} requires manual component review.`,
        nodeId: match.nodeId,
        blocking: false,
        suggestedActions: ['Select a registered component or keep a semantic native fallback.']
      }))
  ]

  return {
    schemaVersion: '1.0',
    document,
    tokenResolution,
    matches,
    diagnostics,
    summary: {
      totalNodes: nodes.length,
      componentNodes: matches.length,
      exactMatches: matches.filter((match) => match.strategy === 'exact-component').length,
      manualReview: matches.filter((match) => match.strategy === 'manual-review').length
    }
  }
}

export function generateDesign(request: unknown, createdAt?: string): GenerateResponse {
  const parsed = analyzeRequestSchema.parse(request)
  const analysis = analyzeDesign(parsed)
  const registry = validateRegistry(parsed.registry)
  const plan = createGenerationPlan(
    analysis.document,
    registry,
    analysis.matches,
    analysis.tokenResolution
  )
  const project = generateProject(plan, registry, {
    ...(createdAt ? { createdAt } : {}),
    nodeCount: analysis.summary.totalNodes,
    matches: analysis.matches
  })

  return { ...analysis, plan, project }
}
