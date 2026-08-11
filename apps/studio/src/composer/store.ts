import { create } from 'zustand'
import type { Data } from '@puckeditor/core'
import type { ComposerOperation, ComposerPage, ComposerRegistry } from '@forge-ui/contracts/composer'
import { starterComposerPage, starterComposerRegistry } from './catalog'
import { applyComposerOperation, findComposerNode } from './model'
import {
  composerPageToPuckData,
  diffComposerPages,
  puckDataToComposerPage
} from './puckAdapter'

export type ComposerDevice = 'mobile' | 'tablet' | 'desktop'

interface ComposerHistoryEntry {
  before: ComposerPage
  after: ComposerPage
  operations: ComposerOperation[]
}

export interface PuckSyncResult {
  ok: boolean
  operations: ComposerOperation[]
  rollback?: Data
  error?: string
}

interface ComposerStoreState {
  page: ComposerPage
  registry: ComposerRegistry
  selectedNodeId: string | undefined
  expandedNodeIds: string[]
  device: ComposerDevice
  operationSequence: number
  past: ComposerHistoryEntry[]
  future: ComposerHistoryEntry[]
  lastError: string | undefined
  rollbackData: Data | undefined
  selectNode: (nodeId: string | undefined) => void
  setDevice: (device: ComposerDevice) => void
  toggleExpanded: (nodeId: string) => void
  clearRollback: () => void
  syncFromPuck: (data: Data) => PuckSyncResult
  applyOperation: (operation: ComposerOperation) => void
  undo: () => ComposerPage | undefined
  redo: () => ComposerPage | undefined
  reset: () => ComposerPage
}

function sameDocument(left: ComposerPage, right: ComposerPage) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function nextSelectedNode(page: ComposerPage, selectedNodeId: string | undefined) {
  if (selectedNodeId && findComposerNode(page.root, selectedNodeId)) return selectedNodeId
  return page.root.children?.[0]?.id
}

export const useComposerStore = create<ComposerStoreState>((set, get) => ({
  page: structuredClone(starterComposerPage),
  registry: starterComposerRegistry,
  selectedNodeId: starterComposerPage.root.children?.[0]?.id,
  expandedNodeIds: ['page-root', 'products-01'],
  device: 'desktop',
  operationSequence: 0,
  past: [],
  future: [],
  lastError: undefined,
  rollbackData: undefined,

  selectNode: (selectedNodeId) => set({ selectedNodeId }),
  setDevice: (device) => set({ device }),
  toggleExpanded: (nodeId) =>
    set((state) => ({
      expandedNodeIds: state.expandedNodeIds.includes(nodeId)
        ? state.expandedNodeIds.filter((candidate) => candidate !== nodeId)
        : [...state.expandedNodeIds, nodeId]
    })),
  clearRollback: () => set({ rollbackData: undefined }),

  syncFromPuck: (data) => {
    const state = get()
    const before = state.page
    let sequence = state.operationSequence
    const operationId = () => {
      sequence += 1
      return `puck-${sequence}`
    }

    try {
      const target = puckDataToComposerPage(data, before, state.registry)
      const operations = diffComposerPages(before, target, operationId)
      if (operations.length === 0) {
        set({ operationSequence: sequence, lastError: undefined })
        return { ok: true, operations }
      }

      let after = before
      for (const operation of operations) {
        after = applyComposerOperation(after, state.registry, operation)
      }

      if (!sameDocument(after, target)) {
        throw new Error('Puck change could not be represented losslessly as Forge operations.')
      }

      set({
        page: after,
        operationSequence: sequence,
        selectedNodeId: nextSelectedNode(after, state.selectedNodeId),
        past: [...state.past, { before, after, operations }],
        future: [],
        lastError: undefined,
        rollbackData: undefined
      })
      return { ok: true, operations }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Puck synchronization error.'
      const rollback = composerPageToPuckData(before)
      set({
        lastError: message,
        operationSequence: sequence,
        rollbackData: rollback
      })
      return {
        ok: false,
        operations: [],
        rollback,
        error: message
      }
    }
  },

  applyOperation: (operation) => {
    const state = get()
    const before = state.page
    const after = applyComposerOperation(before, state.registry, operation)
    set({
      page: after,
      operationSequence: state.operationSequence + 1,
      selectedNodeId: nextSelectedNode(after, state.selectedNodeId),
      past: [...state.past, { before, after, operations: [operation] }],
      future: [],
      lastError: undefined,
      rollbackData: undefined
    })
  },

  undo: () => {
    const state = get()
    const entry = state.past.at(-1)
    if (!entry) return undefined
    const past = state.past.slice(0, -1)
    set({
      page: entry.before,
      past,
      future: [entry, ...state.future],
      selectedNodeId: nextSelectedNode(entry.before, state.selectedNodeId),
      lastError: undefined,
      rollbackData: undefined
    })
    return entry.before
  },

  redo: () => {
    const state = get()
    const [entry, ...future] = state.future
    if (!entry) return undefined
    set({
      page: entry.after,
      past: [...state.past, entry],
      future,
      selectedNodeId: nextSelectedNode(entry.after, state.selectedNodeId),
      lastError: undefined,
      rollbackData: undefined
    })
    return entry.after
  },

  reset: () => {
    const page = structuredClone(starterComposerPage)
    set({
      page,
      registry: starterComposerRegistry,
      selectedNodeId: page.root.children?.[0]?.id,
      expandedNodeIds: ['page-root', 'products-01'],
      device: 'desktop',
      operationSequence: 0,
      past: [],
      future: [],
      lastError: undefined,
      rollbackData: undefined
    })
    return page
  }
}))
