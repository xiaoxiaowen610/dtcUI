import type { ComponentData, Data } from '@puckeditor/core'
import {
  composerPageSchema,
  type ComposerNode,
  type ComposerOperation,
  type ComposerPage,
  type ComposerRegistry
} from '@forge-ui/contracts/composer'
import { ComposerModelError, findComposerLocation, walkComposerNodes } from './model'

const composerTypeToPuckType = {
  'hero-block': 'HeroBlock',
  'promo-banner': 'PromoBanner',
  section: 'Section',
  grid: 'Grid',
  'product-grid': 'ProductGrid',
  'product-card': 'ProductCard',
  'text-block': 'TextBlock'
} as const

const puckTypeToComposerType = Object.fromEntries(
  Object.entries(composerTypeToPuckType).map(([composerType, puckType]) => [puckType, composerType])
) as Record<string, string>

interface ForgePuckMetadata {
  category?: ComposerNode['category']
  layout?: ComposerNode['layout']
  style?: ComposerNode['style']
  responsive?: ComposerNode['responsive']
  metadata?: ComposerNode['metadata']
}

function toPuckComponent(node: ComposerNode): ComponentData {
  const puckType = composerTypeToPuckType[node.type as keyof typeof composerTypeToPuckType]
  if (!puckType) {
    throw new ComposerModelError(
      'PUCK_COMPONENT_UNSUPPORTED',
      `Composer type ${node.type} has no Puck adapter.`
    )
  }

  const props: Record<string, unknown> = {
    ...(node.props ?? {}),
    id: node.id,
    __forge: {
      category: node.category,
      layout: node.layout,
      style: node.style,
      responsive: node.responsive,
      metadata: node.metadata
    } satisfies ForgePuckMetadata
  }

  for (const [slotName, slotChildren] of Object.entries(node.slots ?? {})) {
    props[slotName] = slotChildren.map(toPuckComponent)
  }

  return {
    type: puckType,
    props
  } as ComponentData
}

export function composerPageToPuckData(page: ComposerPage): Data {
  return {
    content: (page.root.children ?? []).map(toPuckComponent),
    root: {
      props: {
        pageId: page.id,
        pageName: page.name,
        styleKit: page.styleKit,
        viewport: page.viewport,
        metadata: page.metadata ?? {}
      }
    }
  } as Data
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function toComposerNode(component: ComponentData, registry: ComposerRegistry): ComposerNode {
  const composerType = puckTypeToComposerType[String(component.type)]
  if (!composerType) {
    throw new ComposerModelError(
      'PUCK_COMPONENT_UNSUPPORTED',
      `Puck type ${String(component.type)} has no Forge adapter.`
    )
  }

  const item = registry.items.find((candidate) => candidate.type === composerType)
  if (!item) {
    throw new ComposerModelError(
      'REGISTRY_COMPONENT_NOT_FOUND',
      `Composer type ${composerType} is not registered.`
    )
  }

  const rawProps = { ...asRecord(component.props) }
  const id = rawProps.id
  if (typeof id !== 'string' || id.length === 0) {
    throw new ComposerModelError('PUCK_NODE_ID_MISSING', `${String(component.type)} is missing an id.`)
  }

  const forgeMetadata = asRecord(rawProps.__forge) as ForgePuckMetadata
  delete rawProps.id
  delete rawProps.__forge

  const slots: Record<string, ComposerNode[]> = {}
  for (const slotDefinition of item.slots) {
    const rawSlot = rawProps[slotDefinition.name]
    delete rawProps[slotDefinition.name]
    if (rawSlot === undefined) continue
    if (!Array.isArray(rawSlot)) {
      throw new ComposerModelError(
        'PUCK_SLOT_INVALID',
        `${composerType}.${slotDefinition.name} must be an array.`
      )
    }
    slots[slotDefinition.name] = rawSlot.map((child) =>
      toComposerNode(child as ComponentData, registry)
    )
  }

  const node: ComposerNode = {
    id,
    type: composerType,
    category: item.category,
    props: rawProps
  }

  if (Object.keys(slots).length > 0) node.slots = slots
  if (forgeMetadata.layout) node.layout = forgeMetadata.layout
  if (forgeMetadata.style) node.style = forgeMetadata.style
  if (forgeMetadata.responsive) node.responsive = forgeMetadata.responsive
  if (forgeMetadata.metadata) node.metadata = forgeMetadata.metadata

  return node
}

export function puckDataToComposerPage(
  data: Data,
  previousPage: ComposerPage,
  registry: ComposerRegistry
): ComposerPage {
  const rootProps = asRecord(data.root?.props)
  const pageName = typeof rootProps.pageName === 'string' ? rootProps.pageName : previousPage.name
  const styleKit =
    typeof rootProps.styleKit === 'string' ? rootProps.styleKit : previousPage.styleKit

  return composerPageSchema.parse({
    ...previousPage,
    name: pageName,
    styleKit,
    root: {
      id: previousPage.root.id,
      type: 'page-root',
      category: 'root',
      children: data.content.map((component) => toComposerNode(component, registry))
    }
  })
}

interface IndexedNode {
  node: ComposerNode
  parentId: string
  index: number
  slot?: string
}

function pageIndex(page: ComposerPage) {
  const index = new Map<string, IndexedNode>()
  walkComposerNodes(page.root, (node) => {
    if (node.id === page.root.id) return
    const location = findComposerLocation(page.root, node.id)
    if (!location) return
    const indexed: IndexedNode = {
      node,
      parentId: location.parentId,
      index: location.index
    }
    if (location.slot) indexed.slot = location.slot
    index.set(node.id, indexed)
  })
  return index
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function parentIsAlsoChanged(
  entry: IndexedNode,
  changedIds: Set<string>,
  rootId: string,
  index: Map<string, IndexedNode>
) {
  let parentId = entry.parentId
  while (parentId !== rootId) {
    if (changedIds.has(parentId)) return true
    const parent = index.get(parentId)
    if (!parent) return false
    parentId = parent.parentId
  }
  return false
}

export function diffComposerPages(
  previous: ComposerPage,
  next: ComposerPage,
  nextOperationId: () => string
): ComposerOperation[] {
  const previousIndex = pageIndex(previous)
  const nextIndex = pageIndex(next)
  const removedIds = new Set([...previousIndex.keys()].filter((id) => !nextIndex.has(id)))
  const insertedIds = new Set([...nextIndex.keys()].filter((id) => !previousIndex.has(id)))
  const operations: ComposerOperation[] = []

  const removed = [...removedIds]
    .map((id) => previousIndex.get(id)!)
    .filter(
      (entry) => !parentIsAlsoChanged(entry, removedIds, previous.root.id, previousIndex)
    )
    .sort((left, right) => right.index - left.index)

  for (const entry of removed) {
    operations.push({
      operationId: nextOperationId(),
      actor: 'user',
      type: 'remove',
      nodeId: entry.node.id
    })
  }

  const inserted = [...insertedIds]
    .map((id) => nextIndex.get(id)!)
    .filter((entry) => !parentIsAlsoChanged(entry, insertedIds, next.root.id, nextIndex))
    .sort((left, right) => left.index - right.index)

  for (const entry of inserted) {
    const insert: ComposerOperation = {
      operationId: nextOperationId(),
      actor: 'user',
      type: 'insert',
      parentId: entry.parentId,
      index: entry.index,
      node: entry.node
    }
    if (entry.slot) insert.slot = entry.slot
    operations.push(insert)
  }

  for (const [id, nextEntry] of nextIndex) {
    const previousEntry = previousIndex.get(id)
    if (!previousEntry || insertedIds.has(id) || removedIds.has(id)) continue

    if (
      previousEntry.parentId !== nextEntry.parentId ||
      previousEntry.slot !== nextEntry.slot ||
      previousEntry.index !== nextEntry.index
    ) {
      const move: ComposerOperation = {
        operationId: nextOperationId(),
        actor: 'user',
        type: 'move',
        nodeId: id,
        targetParentId: nextEntry.parentId,
        targetIndex: nextEntry.index
      }
      if (nextEntry.slot) move.targetSlot = nextEntry.slot
      operations.push(move)
    }

    if (!sameValue(previousEntry.node.props ?? {}, nextEntry.node.props ?? {})) {
      operations.push({
        operationId: nextOperationId(),
        actor: 'user',
        type: 'update-props',
        nodeId: id,
        patch: nextEntry.node.props ?? {}
      })
    }
  }

  if (previous.styleKit !== next.styleKit) {
    operations.push({
      operationId: nextOperationId(),
      actor: 'user',
      type: 'apply-style-kit',
      styleKit: next.styleKit
    })
  }

  return operations
}
