import type { DesignNode, RawDesignNode } from '@forge-ui/contracts'

export interface StudioTreeNode {
  id: string
  name: string
  type: string
  semantic?: string
  children: StudioTreeNode[]
}

export function treeFromDesignNode(node: DesignNode): StudioTreeNode {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    ...(node.semantic ? { semantic: node.semantic } : {}),
    children: node.children.map(treeFromDesignNode)
  }
}

export function treeFromRawNode(node: RawDesignNode, path = 'root'): StudioTreeNode {
  const id = node.id ?? `draft-${path}`
  return {
    id,
    name: node.name,
    type: node.type,
    ...(node.semantic ? { semantic: node.semantic } : {}),
    children: (node.children ?? []).map((child, index) =>
      treeFromRawNode(child, `${path}-${index}`)
    )
  }
}

export function walkStudioTree(root: StudioTreeNode): StudioTreeNode[] {
  const nodes: StudioTreeNode[] = []
  const pending = [root]
  while (pending.length > 0) {
    const node = pending.shift()!
    nodes.push(node)
    pending.unshift(...node.children)
  }
  return nodes
}

export function findStudioTreeNode(
  root: StudioTreeNode,
  nodeId: string | undefined
): StudioTreeNode | undefined {
  if (!nodeId) return undefined
  return walkStudioTree(root).find((node) => node.id === nodeId)
}

export function studioTreePath(root: StudioTreeNode, nodeId: string): string[] {
  const visit = (node: StudioTreeNode, path: string[]): string[] | undefined => {
    const next = [...path, node.id]
    if (node.id === nodeId) return next
    for (const child of node.children) {
      const match = visit(child, next)
      if (match) return match
    }
    return undefined
  }

  return visit(root, []) ?? []
}
