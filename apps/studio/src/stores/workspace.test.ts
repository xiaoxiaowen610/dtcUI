import { describe, expect, it } from 'vitest'
import { normalizeWorkspaceSelection } from './workspace'

describe('Workspace selection', () => {
  it('B04-UT-002 preserves valid selections and expansion state', () => {
    expect(
      normalizeWorkspaceSelection(
        {
          selectedNodeId: 'hero-title',
          selectedFile: 'src/tokens.css',
          expandedNodeIds: ['root', 'hero']
        },
        ['root', 'hero', 'hero-title'],
        ['src/sections/Hero.tsx', 'src/tokens.css']
      )
    ).toEqual({
      selectedNodeId: 'hero-title',
      selectedFile: 'src/tokens.css',
      expandedNodeIds: ['root', 'hero']
    })
  })

  it('B04-UT-002B replaces stale node/file IDs with stable defaults', () => {
    expect(
      normalizeWorkspaceSelection(
        {
          selectedNodeId: 'removed-node',
          selectedFile: 'src/removed.tsx',
          expandedNodeIds: ['removed-node']
        },
        ['new-root', 'new-hero'],
        ['src/LandingPage.tsx', 'src/sections/Hero.tsx']
      )
    ).toEqual({
      selectedNodeId: 'new-root',
      selectedFile: 'src/sections/Hero.tsx',
      expandedNodeIds: ['new-root']
    })
  })
})
