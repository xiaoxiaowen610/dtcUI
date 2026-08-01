import { create } from 'zustand'

export type Device = 'desktop' | 'tablet' | 'mobile'
export type WorkspaceTab = 'preview' | 'code'

interface WorkspaceState {
  device: Device
  activeTab: WorkspaceTab
  selectedFile: string
  setDevice: (device: Device) => void
  setActiveTab: (activeTab: WorkspaceTab) => void
  setSelectedFile: (selectedFile: string) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  device: 'desktop',
  activeTab: 'preview',
  selectedFile: 'src/sections/Hero.tsx',
  setDevice: (device) => set({ device }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedFile: (selectedFile) => set({ selectedFile })
}))
