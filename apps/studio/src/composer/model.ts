import {
  composerOperationSchema,
  composerPageSchema,
  type ComposerNode,
  type ComposerOperation,
  type ComposerPage,
  type ComposerRegistry
} from '@forge-ui/contracts/composer'

export class ComposerModelError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ComposerModelError'
  }
}

export interface ComposerLocation {
  parentId: string
  index: number
  slot?: string
}

export interface DropValidationResult {
  allowed: boolean
  reason?: string
}

export function walkComposerNodes(root: ComposerNode, visit: (node: ComposerNode) => void) {
  const walk = (node: ComposerNode) => {
    visit(node)
    for (const child of node.children ?? []) walk(child)
    for (const slotChildren of Object.values(node.slots ?? {})) {
      for (const child of slotChildren) walk(child)
    }
  }
  walk(root)
}

export function findComposerNode(root: ComposerNode, nodeId: string): ComposerNode | undefined {
  if (root.id === nodeId) return root

  for (const child of root.children ?? []) {
    const found = findComposerNode(child, nodeId)
    if (found) return found
  }

  for (const slotChildren of Object.values(root.slots ?? {})) {
    for (const child of slotChildren) {
      const found = findComposerNode(child, nodeId)
      if (found) return found
    }
  }

  return undefined
}

export function findComposerLocation(
  root: ComposerNode,
  nodeId: string
): ComposerLocation | undefined {
  for (let index = 0; index < (root.children?.length ?? 0); index += 1) {
    const child = root.children![index]!
    if (child.id === nodeId) return { parentId: root.id, index }
    const nested = findComposerLocation(child, nodeId)
    if (nested) return nested
  }

  for (const [slot, slotChildren] of Object.entries(root.slots ?? {})) {
    for (let index = 0; index < slotChildren.length; index += 1) {
      const child = slotChildren[index]!
      if (child.id === nodeId) return { parentId: root.id, slot, index }
      const nested = findComposerLocation(child, nodeId)
      if (nested) return nested
    }
  }

  return undefined
}

function registryItem(registry: ComposerRegistry, type: string) {
  return registry.items.find((item) => item.type === type)
}

function nodeIds(root: ComposerNode) {
  const ids = new Set<string>()
  walkComposerNodes(root, (node) => ids.add(node.id))
  return ids
}

function collectionFor(parent: ComposerNode, slot: string | undefined): ComposerNode[] {
  if (!slot) {
    parent.children ??= []
    return parent.children
  }

  parent.slots ??= {}
  parent.slots[slot] ??= []
  return parent.slots[slot]
}

function locationCollection(root: ComposerNode, location: ComposerLocation) {
  const parent = findComposerNode(root, location.parentId)
  if (!parent) {
    throw new ComposerModelError('PARENT_NOT_FOUND', `Parent ${location.parentId} was not found.`)
  }
  return collectionFor(parent, location.slot)
}

export function validateDrop(
  page: ComposerPage,
  registry: ComposerRegistry,
  nodeType: string,
  targetParentId: string,
  targetSlot?: string
): DropValidationResult {
  const parent = findComposerNode(page.root, targetParentId)
  if (!parent) return { allowed: false, reason: `Target parent ${targetParentId} does not exist.` }

  const item = registryItem(registry, nodeType)
  if (!item) return { allowed: false, reason: `Component ${nodeType} is not registered.` }

  if (parent.type === 'page-root') {
    if (targetSlot) {
      return { allowed: false, reason: 'Page root does not expose named slots.' }
    }
    if (!['block', 'layout', 'overlay'].includes(item.category)) {
      return {
        allowed: false,
        reason: `Page root only accepts block, layout or overlay nodes; received ${item.category}.`
      }
    }
    return { allowed: true }
  }

  if (!targetSlot) {
    return { allowed: false, reason: `${parent.type} requires a named slot for nested content.` }
  }

  const parentItem = registryItem(registry, parent.type)
  if (!parentItem) {
    return { allowed: false, reason: `Parent component ${parent.type} is not registered.` }
  }

  const slot = parentItem.slots.find((candidate) => candidate.name === targetSlot)
  if (!slot) {
    return { allowed: false, reason: `${parent.type} does not expose slot ${targetSlot}.` }
  }

  if (!slot.accepts.includes(nodeType)) {
    return {
      allowed: false,
      reason: `${parent.type}.${targetSlot} does not accept ${nodeType}.`
    }
  }

  const currentCount = parent.slots?.[targetSlot]?.length ?? 0
  if (slot.max !== undefined && currentCount >= slot.max) {
    return {
      allowed: false,
      reason: `${parent.type}.${targetSlot} allows at most ${slot.max} nodes.`
    }
  }

  return { allowed: true }
}

export function validateComposerPageAgainstRegistry(
  page: ComposerPage,
  registry: ComposerRegistry
): string[] {
  const parsed = composerPageSchema.safeParse(page)
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message)

  const issues: string[] = []

  const inspect = (node: ComposerNode) => {
    if (node.type === 'page-root') {
      if (node.slots && Object.keys(node.slots).length > 0) {
        issues.push('page-root cannot define named slots.')
      }
      for (const child of node.children ?? []) {
        const item = registryItem(registry, child.type)
        if (!item) {
          issues.push(`Component ${child.type} is not registered.`)
          continue
        }
        if (!['block', 'layout', 'overlay'].includes(item.category)) {
          issues.push(`page-root cannot contain ${child.type} (${item.category}).`)
        }
      }
    } else {
      const item = registryItem(registry, node.type)
      if (!item) {
        issues.push(`Component ${node.type} is not registered.`)
      } else {
        if (node.category !== undefined && node.category !== item.category) {
          issues.push(
            `${node.id} declares category ${node.category} but Registry declares ${item.category}.`
          )
        }

        if ((node.children?.length ?? 0) > 0) {
          issues.push(`${node.type} must use registered slots instead of anonymous children.`)
        }

        for (const slotDefinition of item.slots) {
          const count = node.slots?.[slotDefinition.name]?.length ?? 0
          const minimum = slotDefinition.min ?? (slotDefinition.required ? 1 : 0)
          if (count < minimum) {
            issues.push(`${node.type}.${slotDefinition.name} requires at least ${minimum} nodes.`)
          }
          if (slotDefinition.max !== undefined && count > slotDefinition.max) {
            issues.push(
              `${node.type}.${slotDefinition.name} allows at most ${slotDefinition.max} nodes.`
            )
          }
        }

        for (const [slotName, slotChildren] of Object.entries(node.slots ?? {})) {
          const slotDefinition = item.slots.find((candidate) => candidate.name === slotName)
          if (!slotDefinition) {
            issues.push(`${node.type} does not expose slot ${slotName}.`)
            continue
          }

          for (const child of slotChildren) {
            if (!slotDefinition.accepts.includes(child.type)) {
              issues.push(`${node.type}.${slotName} does not accept ${child.type}.`)
            }
          }
        }
      }
    }

    for (const child of node.children ?? []) inspect(child)
    for (const slotChildren of Object.values(node.slots ?? {})) {
      for (const child of slotChildren) inspect(child)
    }
  }

  inspect(page.root)
  return issues
}

function assertValid(page: ComposerPage, registry: ComposerRegistry) {
  const parsed = composerPageSchema.parse(page)
  const issues = validateComposerPageAgainstRegistry(parsed, registry)
  if (issues.length > 0) {
    throw new ComposerModelError('COMPOSER_PAGE_INVALID', issues.join(' '))
  }
  return parsed
}

function assertIndex(index: number, length: number) {
  if (index > length) {
    throw new ComposerModelError(
      'INDEX_OUT_OF_RANGE',
      `Cannot insert at index ${index}; collection length is ${length}.`
    )
  }
}

function assertUniqueSubtree(page: ComposerPage, node: ComposerNode) {
  const existing = nodeIds(page.root)
  const incoming = new Set<string>()
  walkComposerNodes(node, (candidate) => {
    if (incoming.has(candidate.id)) {
      throw new ComposerModelError(
        'DUPLICATE_NODE_ID',
        `Inserted subtree contains duplicate node ID ${candidate.id}.`
      )
    }
    if (existing.has(candidate.id)) {
      throw new ComposerModelError(
        'DUPLICATE_NODE_ID',
        `Node ID ${candidate.id} already exists in the page.`
      )
    }
    incoming.add(candidate.id)
  })
}

export function applyComposerOperation(
  page: ComposerPage,
  registry: ComposerRegistry,
  rawOperation: ComposerOperation
): ComposerPage {
  const operation = composerOperationSchema.parse(rawOperation)
  const draft = structuredClone(page)

  if (operation.type === 'insert') {
    assertUniqueSubtree(draft, operation.node)
    const drop = validateDrop(draft, registry, operation.node.type, operation.parentId, operation.slot)
    if (!drop.allowed) {
      throw new ComposerModelError('DROP_NOT_ALLOWED', drop.reason ?? 'Drop is not allowed.')
    }
    const parent = findComposerNode(draft.root, operation.parentId)
    if (!parent) throw new ComposerModelError('PARENT_NOT_FOUND', operation.parentId)
    const collection = collectionFor(parent, operation.slot)
    assertIndex(operation.index, collection.length)
    collection.splice(operation.index, 0, operation.node)
  }

  if (operation.type === 'remove') {
    if (operation.nodeId === draft.root.id) {
      throw new ComposerModelError('ROOT_MUTATION_FORBIDDEN', 'Page root cannot be removed.')
    }
    const location = findComposerLocation(draft.root, operation.nodeId)
    if (!location) {
      throw new ComposerModelError('NODE_NOT_FOUND', `Node ${operation.nodeId} was not found.`)
    }
    const collection = locationCollection(draft.root, location)
    collection.splice(location.index, 1)
  }

  if (operation.type === 'move') {
    if (operation.nodeId === draft.root.id) {
      throw new ComposerModelError('ROOT_MUTATION_FORBIDDEN', 'Page root cannot be moved.')
    }

    const node = findComposerNode(draft.root, operation.nodeId)
    if (!node) {
      throw new ComposerModelError('NODE_NOT_FOUND', `Node ${operation.nodeId} was not found.`)
    }
    if (node.id === operation.targetParentId || findComposerNode(node, operation.targetParentId)) {
      throw new ComposerModelError('MOVE_CYCLE', 'A node cannot be moved into its own subtree.')
    }

    const location = findComposerLocation(draft.root, operation.nodeId)
    if (!location) {
      throw new ComposerModelError('NODE_NOT_FOUND', `Node ${operation.nodeId} has no parent.`)
    }

    const source = locationCollection(draft.root, location)
    source.splice(location.index, 1)

    const drop = validateDrop(
      draft,
      registry,
      node.type,
      operation.targetParentId,
      operation.targetSlot
    )
    if (!drop.allowed) {
      throw new ComposerModelError('DROP_NOT_ALLOWED', drop.reason ?? 'Drop is not allowed.')
    }

    const targetParent = findComposerNode(draft.root, operation.targetParentId)
    if (!targetParent) {
      throw new ComposerModelError('PARENT_NOT_FOUND', operation.targetParentId)
    }
    const target = collectionFor(targetParent, operation.targetSlot)
    assertIndex(operation.targetIndex, target.length)
    target.splice(operation.targetIndex, 0, node)
  }

  if (operation.type === 'update-props') {
    const node = findComposerNode(draft.root, operation.nodeId)
    if (!node) throw new ComposerModelError('NODE_NOT_FOUND', operation.nodeId)
    node.props = { ...(node.props ?? {}), ...operation.patch }
  }

  if (operation.type === 'update-layout') {
    const node = findComposerNode(draft.root, operation.nodeId)
    if (!node) throw new ComposerModelError('NODE_NOT_FOUND', operation.nodeId)
    node.layout = { ...(node.layout ?? {}), ...operation.patch }
  }

  if (operation.type === 'update-style') {
    const node = findComposerNode(draft.root, operation.nodeId)
    if (!node) throw new ComposerModelError('NODE_NOT_FOUND', operation.nodeId)
    node.style = { ...(node.style ?? {}), ...operation.patch }
  }

  if (operation.type === 'apply-style-kit') {
    draft.styleKit = operation.styleKit
  }

  return assertValid(draft, registry)
}
