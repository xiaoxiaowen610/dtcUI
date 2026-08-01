import { z } from 'zod'

export const SCHEMA_VERSION = '1.0' as const
export const ENGINE_VERSION = '0.1.0' as const
export const GENERATOR_VERSION = '0.1.0' as const

export const INPUT_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxNodes: 2_000,
  maxDepth: 30,
  maxTextLength: 20_000
} as const

export const designNodeTypeSchema = z.enum([
  'page',
  'section',
  'layout',
  'component',
  'text',
  'image',
  'icon',
  'unknown'
])

export type DesignNodeType = z.infer<typeof designNodeTypeSchema>

export const lengthValueSchema = z.union([
  z.object({ value: z.number(), unit: z.enum(['px', 'rem', '%', 'vw', 'vh']) }),
  z.object({ token: z.string().min(1) }),
  z.literal('auto')
])

export type LengthValue = z.infer<typeof lengthValueSchema>

export const layoutSpecSchema = z.object({
  display: z.enum(['block', 'flex', 'grid']).optional(),
  direction: z.enum(['row', 'column']).optional(),
  wrap: z.enum(['nowrap', 'wrap']).optional(),
  align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  justify: z.enum(['start', 'center', 'end', 'between']).optional(),
  columns: z.number().int().positive().max(12).optional(),
  gap: lengthValueSchema.optional(),
  maxWidth: lengthValueSchema.optional(),
  position: z.enum(['static', 'relative', 'absolute']).optional()
})

export type LayoutSpec = z.infer<typeof layoutSpecSchema>

export const responsiveSpecSchema = z.object({
  layout: z
    .object({
      mobile: layoutSpecSchema.partial().optional(),
      tablet: layoutSpecSchema.partial().optional(),
      desktop: layoutSpecSchema.partial().optional()
    })
    .optional(),
  visibility: z
    .object({
      mobile: z.boolean().optional(),
      tablet: z.boolean().optional(),
      desktop: z.boolean().optional()
    })
    .optional()
})

export type ResponsiveSpec = z.infer<typeof responsiveSpecSchema>

export type RawDesignNode = {
  id?: string | undefined
  name: string
  type: DesignNodeType
  semantic?: string | undefined
  componentKey?: string | undefined
  props?: Record<string, unknown> | undefined
  content?: { kind: 'text'; value: string } | { kind: 'asset'; assetId: string } | undefined
  layout?: LayoutSpec | undefined
  responsive?: ResponsiveSpec | undefined
  accessibility?:
    | {
        label?: string | undefined
        alt?: string | undefined
        decorative?: boolean | undefined
        headingLevel?: 1 | 2 | 3 | 4 | 5 | 6 | undefined
      }
    | undefined
  children?: RawDesignNode[] | undefined
}

export const rawDesignNodeSchema: z.ZodType<RawDesignNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1).optional(),
    name: z.string(),
    type: designNodeTypeSchema,
    semantic: z.string().min(1).optional(),
    componentKey: z.string().min(1).optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    content: z
      .discriminatedUnion('kind', [
        z.object({ kind: z.literal('text'), value: z.string() }),
        z.object({ kind: z.literal('asset'), assetId: z.string().min(1) })
      ])
      .optional(),
    layout: layoutSpecSchema.optional(),
    responsive: responsiveSpecSchema.optional(),
    accessibility: z
      .object({
        label: z.string().optional(),
        alt: z.string().optional(),
        decorative: z.boolean().optional(),
        headingLevel: z
          .union([
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(5),
            z.literal(6)
          ])
          .optional()
      })
      .optional(),
    children: z.array(rawDesignNodeSchema).optional()
  })
)

export const externalTokenSchema = z.object({
  path: z.string().min(1),
  type: z.enum(['color', 'dimension', 'fontFamily', 'fontWeight', 'typography', 'shadow']),
  value: z.unknown(),
  level: z.enum(['primitive', 'semantic'])
})

export const externalAssetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['image', 'icon', 'logo', 'font']),
  sourceUrl: z.string().url().optional(),
  localPath: z.string().optional(),
  alt: z.string().optional()
})

export const designInputEnvelopeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  documentId: z.string().min(1),
  source: z.object({
    type: z.enum(['preset', 'json']),
    name: z.string().min(1)
  }),
  root: rawDesignNodeSchema,
  tokens: z.array(externalTokenSchema).optional(),
  assets: z.array(externalAssetSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export type DesignInputEnvelope = z.infer<typeof designInputEnvelopeSchema>
export type ExternalToken = z.infer<typeof externalTokenSchema>
export type ExternalAsset = z.infer<typeof externalAssetSchema>

export interface DesignNode {
  id: string
  name: string
  type: DesignNodeType
  semantic?: string
  source: {
    sourceType: 'preset' | 'json'
    sourceId?: string
    componentKey?: string
  }
  component?: {
    sourceKey?: string
    props: Record<string, unknown>
  }
  content?: RawDesignNode['content']
  layout?: LayoutSpec
  responsive?: ResponsiveSpec
  accessibility?: RawDesignNode['accessibility']
  children: DesignNode[]
}

export interface DesignDocument {
  schemaVersion: typeof SCHEMA_VERSION
  documentId: string
  root: DesignNode
  tokens: ExternalToken[]
  assets: Array<ExternalAsset & { status: 'resolved' | 'missing' | 'placeholder' }>
  metadata: Record<string, unknown>
}

export const propDefinitionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'enum']),
  required: z.boolean().optional(),
  values: z.array(z.union([z.string(), z.number(), z.boolean()])).optional()
})

export const registeredComponentSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  import: z.object({
    path: z.string().min(1),
    exportName: z.string().min(1),
    style: z.enum(['named', 'default'])
  }),
  sourceKeys: z.array(z.string().min(1)).optional(),
  semantics: z.array(z.string().min(1)),
  props: z.array(propDefinitionSchema),
  capabilities: z.array(
    z.enum(['action', 'link', 'layout', 'content', 'visual', 'responsive', 'children'])
  ),
  requiredTokens: z.array(z.string().min(1)).optional()
})

export const componentRegistryManifestSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  registryId: z.string().min(1),
  registryVersion: z.string().min(1),
  package: z.object({
    name: z.string().min(1),
    version: z.string().min(1),
    allowedImportRoots: z.array(z.string().min(1)).min(1)
  }),
  components: z.array(registeredComponentSchema).min(1)
})

export type PropDefinition = z.infer<typeof propDefinitionSchema>
export type RegisteredComponent = z.infer<typeof registeredComponentSchema>
export type ComponentRegistryManifest = z.infer<typeof componentRegistryManifestSchema>

export type MatchStrategy =
  'exact-component' | 'adapted-component' | 'registered-recipe' | 'native-element' | 'manual-review'

export interface ComponentMatchResult {
  nodeId: string
  componentId?: string
  strategy: MatchStrategy
  ruleScore?: number
  confidence: 'high' | 'medium' | 'low'
  reasons: string[]
  incompatibilities: string[]
  warnings: string[]
}

export type PipelineStage =
  'input' | 'design-ir' | 'registry' | 'generation-plan' | 'code-generation' | 'validation'

export interface GenerationDiagnostic {
  code: string
  stage: PipelineStage
  severity: 'info' | 'warning' | 'error'
  message: string
  nodeId?: string
  blocking: boolean
  suggestedActions: string[]
}

export interface ImportPlan {
  path: string
  names: string[]
}

export interface HeroActionPlan {
  nodeId: string
  label: string
  exportName: string
  importPath: string
  props: Record<string, unknown>
}

export interface HeroPlan {
  id: string
  eyebrow: string
  title: string
  description: string
  actions: HeroActionPlan[]
  visual?: {
    nodeId: string
    exportName: string
    importPath: string
  }
}

export interface GenerationPlan {
  schemaVersion: typeof SCHEMA_VERSION
  generationId: string
  sourceHash: string
  versions: {
    inputSchema: typeof SCHEMA_VERSION
    registry: string
    generator: string
  }
  page: {
    title: string
    description: string
    rootNodeId: string
  }
  imports: ImportPlan[]
  hero: HeroPlan
  diagnostics: GenerationDiagnostic[]
}

export interface GeneratedFile {
  path: string
  language: 'typescript' | 'tsx' | 'css' | 'json' | 'html' | 'markdown'
  content: string
  contentHash: string
}

export interface GenerationManifest {
  generationId: string
  createdAt: string
  inputHash: string
  engineVersion: string
  generatorVersion: string
  registry: { id: string; version: string }
  schemaVersions: Record<string, string>
  dependencies: Record<string, string>
  outputMode: 'standalone' | 'integration'
}

export interface GenerationReport {
  metadata: {
    generationId: string
    inputHash: string
  }
  nodes: {
    total: number
    eligibleForComponentMatch: number
  }
  matches: {
    exact: number
    adapted: number
    recipes: number
    native: number
    manual: number
  }
  validation: {
    schema: 'passed'
    typescript: 'pending' | 'passed' | 'failed'
    build: 'pending' | 'passed' | 'failed'
    runtime: 'skipped'
    visual: 'skipped'
  }
  diagnostics: GenerationDiagnostic[]
}

export interface GeneratedProject {
  files: GeneratedFile[]
  manifest: GenerationManifest
  report: GenerationReport
  diagnostics: GenerationDiagnostic[]
}

export const analyzeRequestSchema = z.object({
  input: designInputEnvelopeSchema,
  registry: componentRegistryManifestSchema
})

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>

export interface AnalyzeResponse {
  schemaVersion: typeof SCHEMA_VERSION
  document: DesignDocument
  matches: ComponentMatchResult[]
  diagnostics: GenerationDiagnostic[]
  summary: {
    totalNodes: number
    componentNodes: number
    exactMatches: number
    manualReview: number
  }
}

export interface GenerateResponse extends AnalyzeResponse {
  plan: GenerationPlan
  project: GeneratedProject
}

export interface ForgeErrorPayload {
  code: string
  stage: PipelineStage
  message: string
  recoverable: boolean
  fallbackApplied: boolean
  suggestedActions: string[]
  requestId: string
}
