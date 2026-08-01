import {
  designInputEnvelopeSchema,
  INPUT_LIMITS,
  type DesignDocument,
  type DesignInputEnvelope,
  type DesignNode,
  type RawDesignNode
} from '@forge-ui/contracts'
import { stableHash } from '@forge-ui/shared'

export class DesignIrError extends Error {
  constructor(
    readonly code: 'DESIGN_SCHEMA_INVALID' | 'DESIGN_LIMIT_EXCEEDED' | 'DESIGN_DUPLICATE_ID',
    message: string,
    readonly nodeId?: string
  ) {
    super(message)
    this.name = 'DesignIrError'
  }
}

interface NormalizationState {
  documentId: string
  sourceType: 'preset' | 'json'
  seenIds: Set<string>
  nodeCount: number
}

function normalizeNode(
  node: RawDesignNode,
  path: string,
  depth: number,
  state: NormalizationState
): DesignNode {
  state.nodeCount += 1

  if (state.nodeCount > INPUT_LIMITS.maxNodes) {
    throw new DesignIrError(
      'DESIGN_LIMIT_EXCEEDED',
      `Design contains more than ${INPUT_LIMITS.maxNodes} nodes.`
    )
  }

  if (depth > INPUT_LIMITS.maxDepth) {
    throw new DesignIrError(
      'DESIGN_LIMIT_EXCEEDED',
      `Node depth exceeds the limit of ${INPUT_LIMITS.maxDepth}.`
    )
  }

  if (node.content?.kind === 'text' && node.content.value.length > INPUT_LIMITS.maxTextLength) {
    throw new DesignIrError(
      'DESIGN_LIMIT_EXCEEDED',
      `Text at ${path} exceeds the limit of ${INPUT_LIMITS.maxTextLength} characters.`
    )
  }

  const explicitId = node.id?.trim()
  const id = explicitId || `node_${stableHash(`${state.documentId}:${path}`)}`

  if (state.seenIds.has(id)) {
    throw new DesignIrError('DESIGN_DUPLICATE_ID', `Duplicate node ID: ${id}`, id)
  }

  state.seenIds.add(id)

  const children = (node.children ?? []).map((child, index) =>
    normalizeNode(child, `${path}.${index}`, depth + 1, state)
  )

  return {
    id,
    name: node.name.trim(),
    type: node.type,
    ...(node.semantic ? { semantic: node.semantic } : {}),
    source: {
      sourceType: state.sourceType,
      ...(explicitId ? { sourceId: explicitId } : {}),
      ...(node.componentKey ? { componentKey: node.componentKey } : {})
    },
    ...(node.componentKey
      ? { component: { sourceKey: node.componentKey, props: node.props ?? {} } }
      : {}),
    ...(node.content ? { content: node.content } : {}),
    ...(node.layout ? { layout: node.layout } : {}),
    ...(node.responsive ? { responsive: node.responsive } : {}),
    ...(node.accessibility ? { accessibility: node.accessibility } : {}),
    children
  }
}

export function createDesignDocument(input: unknown): DesignDocument {
  const parsed = designInputEnvelopeSchema.safeParse(input)

  if (!parsed.success) {
    throw new DesignIrError(
      'DESIGN_SCHEMA_INVALID',
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    )
  }

  const serializedBytes = new TextEncoder().encode(JSON.stringify(parsed.data)).byteLength
  if (serializedBytes > INPUT_LIMITS.maxBytes) {
    throw new DesignIrError(
      'DESIGN_LIMIT_EXCEEDED',
      `Input is ${serializedBytes} bytes; the limit is ${INPUT_LIMITS.maxBytes}.`
    )
  }

  const envelope: DesignInputEnvelope = parsed.data
  const state: NormalizationState = {
    documentId: envelope.documentId,
    sourceType: envelope.source.type,
    seenIds: new Set<string>(),
    nodeCount: 0
  }

  return {
    schemaVersion: '1.0',
    documentId: envelope.documentId,
    root: normalizeNode(envelope.root, 'root', 0, state),
    tokens: [...(envelope.tokens ?? [])].sort((left, right) => left.path.localeCompare(right.path)),
    assets: [...(envelope.assets ?? [])]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((asset) => ({
        ...asset,
        status: asset.localPath || asset.sourceUrl ? 'resolved' : 'missing'
      })),
    metadata: envelope.metadata ?? {}
  }
}

export function walkDesignNodes(root: DesignNode): DesignNode[] {
  const result: DesignNode[] = []

  const visit = (node: DesignNode) => {
    result.push(node)
    node.children.forEach(visit)
  }

  visit(root)
  return result
}

export function findNodeBySemantic(root: DesignNode, semantic: string): DesignNode | undefined {
  return walkDesignNodes(root).find((node) => node.semantic === semantic)
}
