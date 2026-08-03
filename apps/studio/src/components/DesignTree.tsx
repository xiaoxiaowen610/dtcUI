import type { KeyboardEvent } from 'react'
import type { StudioTreeNode } from '../lib/tree'

interface VisibleTreeNode {
  node: StudioTreeNode
  level: number
}

function visibleTree(root: StudioTreeNode, expandedNodeIds: string[]): VisibleTreeNode[] {
  const expanded = new Set(expandedNodeIds)
  const nodes: VisibleTreeNode[] = []
  const visit = (node: StudioTreeNode, level: number) => {
    nodes.push({ node, level })
    if (expanded.has(node.id)) {
      for (const child of node.children) visit(child, level + 1)
    }
  }
  visit(root, 1)
  return nodes
}

const typeIcon: Record<string, string> = {
  page: '◇',
  section: '▱',
  layout: '⌗',
  component: '□',
  text: 'T',
  image: '▧',
  icon: '◈',
  unknown: '?'
}

export function DesignTree({
  root,
  selectedNodeId,
  expandedNodeIds,
  onSelect,
  onToggle
}: {
  root: StudioTreeNode
  selectedNodeId: string | undefined
  expandedNodeIds: string[]
  onSelect: (nodeId: string) => void
  onToggle: (nodeId: string) => void
}) {
  const visible = visibleTree(root, expandedNodeIds)

  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const current = visible[index]!
    const buttons = event.currentTarget
      .closest('[role="tree"]')
      ?.querySelectorAll<HTMLButtonElement>('[role="treeitem"]')
    if (!buttons) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      buttons[Math.max(0, Math.min(buttons.length - 1, index + delta))]?.focus()
    } else if (event.key === 'ArrowRight' && current.node.children.length > 0) {
      event.preventDefault()
      if (!expandedNodeIds.includes(current.node.id)) onToggle(current.node.id)
    } else if (event.key === 'ArrowLeft' && current.node.children.length > 0) {
      event.preventDefault()
      if (expandedNodeIds.includes(current.node.id)) onToggle(current.node.id)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(current.node.id)
    }
  }

  return (
    <div aria-label="Design tree" className="tree" role="tree">
      {visible.map(({ node, level }, index) => {
        const expandable = node.children.length > 0
        const expanded = expandedNodeIds.includes(node.id)
        return (
          <button
            aria-expanded={expandable ? expanded : undefined}
            aria-level={level}
            aria-selected={node.id === selectedNodeId}
            className={node.id === selectedNodeId ? 'isSelected' : ''}
            data-node-id={node.id}
            key={node.id}
            onClick={() => {
              onSelect(node.id)
              if (expandable) onToggle(node.id)
            }}
            onKeyDown={(event) => navigate(event, index)}
            role="treeitem"
            style={{ paddingLeft: `${8 + (level - 1) * 18}px` }}
            type="button"
          >
            <span aria-hidden="true" className="treeDisclosure">
              {expandable ? (expanded ? '▾' : '▸') : '·'}
            </span>
            <b aria-hidden="true">{typeIcon[node.type] ?? '?'}</b>
            <span>{node.name}</span>
          </button>
        )
      })}
    </div>
  )
}
