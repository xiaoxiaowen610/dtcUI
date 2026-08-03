import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Device = 'desktop' | 'tablet' | 'mobile'
export type WorkspaceTab = 'preview' | 'code'

export interface WorkspaceSelection {
  selectedNodeId: string | undefined
  selectedFile: string
  expandedNodeIds: string[]
}

export function normalizeWorkspaceSelection(
  current: WorkspaceSelection,
  nodeIds: string[],
  filePaths: string[],
  preferredNodeId?: string
): WorkspaceSelection {
  const nodeSet = new Set(nodeIds)
  const fileSet = new Set(filePaths)
  const selectedNodeId =
    (preferredNodeId && nodeSet.has(preferredNodeId) ? preferredNodeId : undefined) ??
    (current.selectedNodeId && nodeSet.has(current.selectedNodeId)
      ? current.selectedNodeId
      : nodeIds[0])
  const preferredFile = fileSet.has('src/sections/Hero.tsx')
    ? 'src/sections/Hero.tsx'
    : (filePaths[0] ?? '')

  return {
    selectedNodeId,
    selectedFile: fileSet.has(current.selectedFile) ? current.selectedFile : preferredFile,
    expandedNodeIds: [
      ...new Set([
        ...current.expandedNodeIds.filter((nodeId) => nodeSet.has(nodeId)),
        ...(nodeIds[0] ? [nodeIds[0]] : [])
      ])
    ]
  }
}

interface WorkspaceState extends WorkspaceSelection {
  device: Device
  activeTab: WorkspaceTab
  selectedDiagnosticKey: string | undefined
  setDevice: (device: Device) => void
  setActiveTab: (activeTab: WorkspaceTab) => void
  setSelectedFile: (selectedFile: string) => void
  selectNode: (selectedNodeId: string) => void
  toggleExpandedNode: (nodeId: string) => void
  expandNodePath: (nodeIds: string[]) => void
  selectDiagnostic: (selectedDiagnosticKey: string | undefined) => void
  reconcile: (nodeIds: string[], filePaths: string[], preferredNodeId?: string) => void
}

export const initialWorkspaceSelection: WorkspaceSelection = {
  selectedNodeId: undefined,
  selectedFile: 'src/sections/Hero.tsx',
  expandedNodeIds: []
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...initialWorkspaceSelection,
      device: 'desktop',
      activeTab: 'preview',
      selectedDiagnosticKey: undefined,
      setDevice: (device) => set({ device }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setSelectedFile: (selectedFile) => set({ selectedFile }),
      selectNode: (selectedNodeId) => set({ selectedNodeId }),
      toggleExpandedNode: (nodeId) =>
        set((state) => ({
          expandedNodeIds: state.expandedNodeIds.includes(nodeId)
            ? state.expandedNodeIds.filter((candidate) => candidate !== nodeId)
            : [...state.expandedNodeIds, nodeId]
        })),
      expandNodePath: (nodeIds) =>
        set((state) => ({
          expandedNodeIds: [...new Set([...state.expandedNodeIds, ...nodeIds])]
        })),
      selectDiagnostic: (selectedDiagnosticKey) => set({ selectedDiagnosticKey }),
      reconcile: (nodeIds, filePaths, preferredNodeId) =>
        set((state) => normalizeWorkspaceSelection(state, nodeIds, filePaths, preferredNodeId))
    }),
    {
      name: 'forgeui-workspace-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        device: state.device,
        activeTab: state.activeTab,
        selectedNodeId: state.selectedNodeId,
        selectedFile: state.selectedFile,
        expandedNodeIds: state.expandedNodeIds
      })
    }
  )
)
