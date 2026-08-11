import { Fragment, useEffect, useMemo } from 'react'
import { Puck, createUsePuck, useGetPuck, type Data } from '@puckeditor/core'
import type { ComposerNode } from '@forge-ui/contracts/composer'
import { forgePuckConfig } from './puckConfig'
import { composerPageToPuckData } from './puckAdapter'
import { useComposerStore, type ComposerDevice } from './store'

const usePuck = createUsePuck()

const deviceLabels: Array<{ device: ComposerDevice; label: string; width: string }> = [
  { device: 'mobile', label: 'Mobile', width: '375' },
  { device: 'tablet', label: 'Tablet', width: '768' },
  { device: 'desktop', label: 'Desktop', width: '1440' }
]

function dispatchDocument(getPuck: ReturnType<typeof useGetPuck>, data: Data) {
  getPuck().dispatch({ type: 'setData', data })
}

function SelectionBridge() {
  const selectedId = usePuck((state) => {
    const id = state.selectedItem?.props.id
    return typeof id === 'string' ? id : undefined
  })
  const selectNode = useComposerStore((state) => state.selectNode)

  useEffect(() => {
    selectNode(selectedId)
  }, [selectNode, selectedId])

  return null
}

function RollbackBridge() {
  const rollbackData = useComposerStore((state) => state.rollbackData)
  const clearRollback = useComposerStore((state) => state.clearRollback)
  const getPuck = useGetPuck()

  useEffect(() => {
    if (!rollbackData) return
    dispatchDocument(getPuck, rollbackData)
    clearRollback()
  }, [clearRollback, getPuck, rollbackData])

  return null
}

function Topbar() {
  const pageName = useComposerStore((state) => state.page.name)
  const device = useComposerStore((state) => state.device)
  const setDevice = useComposerStore((state) => state.setDevice)
  const canUndo = useComposerStore((state) => state.past.length > 0)
  const canRedo = useComposerStore((state) => state.future.length > 0)
  const undo = useComposerStore((state) => state.undo)
  const redo = useComposerStore((state) => state.redo)
  const reset = useComposerStore((state) => state.reset)
  const getPuck = useGetPuck()

  return (
    <header className="composerTopbar">
      <div className="composerBrand">
        <span className="composerBrand__mark">F</span>
        <div>
          <strong>ForgeUI</strong>
          <span>{pageName}</span>
        </div>
      </div>

      <div className="composerDevices" aria-label="Preview device">
        {deviceLabels.map((item) => (
          <button
            aria-pressed={device === item.device}
            className={device === item.device ? 'isActive' : ''}
            key={item.device}
            onClick={() => setDevice(item.device)}
            type="button"
          >
            <span>{item.label}</span>
            <small>{item.width}</small>
          </button>
        ))}
      </div>

      <div className="composerTopbar__actions">
        <button
          disabled={!canUndo}
          onClick={() => {
            const page = undo()
            if (page) dispatchDocument(getPuck, composerPageToPuckData(page))
          }}
          type="button"
        >
          ↶ Undo
        </button>
        <button
          disabled={!canRedo}
          onClick={() => {
            const page = redo()
            if (page) dispatchDocument(getPuck, composerPageToPuckData(page))
          }}
          type="button"
        >
          ↷ Redo
        </button>
        <button
          onClick={() => {
            const page = reset()
            dispatchDocument(getPuck, composerPageToPuckData(page))
          }}
          type="button"
        >
          Reset
        </button>
        <a href="/" className="composerExit">
          Legacy Studio
        </a>
      </div>
    </header>
  )
}

function nodeLabel(node: ComposerNode) {
  if (node.metadata?.label) return node.metadata.label
  const item = useComposerStore.getState().registry.items.find((candidate) => candidate.type === node.type)
  return item?.name ?? node.type
}

function LayerNode({ node, depth }: { node: ComposerNode; depth: number }) {
  const selectedNodeId = useComposerStore((state) => state.selectedNodeId)
  const expandedNodeIds = useComposerStore((state) => state.expandedNodeIds)
  const toggleExpanded = useComposerStore((state) => state.toggleExpanded)
  const selectNode = useComposerStore((state) => state.selectNode)
  const getPuck = useGetPuck()
  const slotEntries = Object.entries(node.slots ?? {})
  const descendants = [...(node.children ?? []), ...slotEntries.flatMap(([, children]) => children)]
  const hasChildren = descendants.length > 0
  const expanded = expandedNodeIds.includes(node.id)
  const selected = selectedNodeId === node.id

  const select = () => {
    selectNode(node.id)
    const selector = getPuck().getSelectorForId(node.id)
    if (selector) {
      getPuck().dispatch({
        type: 'setUi',
        ui: { itemSelector: selector }
      })
    }
  }

  return (
    <div className="composerLayerNode">
      <div
        className={`composerLayerRow ${selected ? 'isSelected' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <button
          aria-label={expanded ? 'Collapse layer' : 'Expand layer'}
          className="composerLayerToggle"
          disabled={!hasChildren}
          onClick={() => hasChildren && toggleExpanded(node.id)}
          type="button"
        >
          {hasChildren ? (expanded ? '⌄' : '›') : '·'}
        </button>
        <button className="composerLayerSelect" onClick={select} type="button">
          <span className={`composerLayerType composerLayerType--${node.category ?? 'component'}`} />
          <span>{nodeLabel(node)}</span>
        </button>
      </div>

      {expanded ? (
        <>
          {(node.children ?? []).map((child) => (
            <LayerNode depth={depth + 1} key={child.id} node={child} />
          ))}
          {slotEntries.map(([slotName, children]) => (
            <Fragment key={`${node.id}:${slotName}`}>
              <div className="composerSlotLabel" style={{ paddingLeft: 34 + depth * 14 }}>
                {slotName}
              </div>
              {children.map((child) => (
                <LayerNode depth={depth + 1} key={child.id} node={child} />
              ))}
            </Fragment>
          ))}
        </>
      ) : null}
    </div>
  )
}

function LayersPanel() {
  const root = useComposerStore((state) => state.page.root)
  return (
    <section className="composerLayers">
      <div className="composerPanelHeading">
        <span>Layers</span>
        <small>Forge Schema</small>
      </div>
      <div className="composerLayers__tree">
        {(root.children ?? []).map((child) => (
          <LayerNode depth={0} key={child.id} node={child} />
        ))}
      </div>
    </section>
  )
}

function LeftPanel() {
  return (
    <aside className="composerLeftPanel">
      <section className="composerComponents">
        <div className="composerPanelHeading">
          <span>Blocks</span>
          <small>Drag to canvas</small>
        </div>
        <Puck.Components />
      </section>
      <LayersPanel />
    </aside>
  )
}

function CanvasPanel() {
  const device = useComposerStore((state) => state.device)
  const lastError = useComposerStore((state) => state.lastError)

  return (
    <main className="composerWorkspace">
      <div className="composerWorkspace__meta">
        <span>Visual Canvas</span>
        <small>Constraint layout · {device}</small>
      </div>
      {lastError ? <div className="composerError">已回滚非法操作：{lastError}</div> : null}
      <div className={`composerDeviceFrame composerDeviceFrame--${device}`} data-device={device}>
        <Puck.Preview id="forge-composer-preview" />
      </div>
    </main>
  )
}

function InspectorPanel() {
  const selectedNodeId = useComposerStore((state) => state.selectedNodeId)
  return (
    <aside className="composerInspector">
      <div className="composerPanelHeading">
        <span>Inspector</span>
        <small>{selectedNodeId ?? 'Page'}</small>
      </div>
      <div className="composerInspector__body">
        <Puck.Fields wrapFields={false} />
      </div>
    </aside>
  )
}

function ComposerShell() {
  return (
    <div className="composerShell">
      <Topbar />
      <div className="composerShell__body">
        <LeftPanel />
        <CanvasPanel />
        <InspectorPanel />
      </div>
      <SelectionBridge />
      <RollbackBridge />
    </div>
  )
}

export function ComposerStudio() {
  const initialData = useMemo(
    () => composerPageToPuckData(useComposerStore.getState().page),
    []
  )

  return (
    <Puck
      config={forgePuckConfig}
      data={initialData}
      height="100vh"
      onChange={(data) => {
        useComposerStore.getState().syncFromPuck(data)
      }}
      permissions={{ delete: true, drag: true, duplicate: true, edit: true, insert: true }}
      ui={{ leftSideBarVisible: false, rightSideBarVisible: false }}
    >
      <ComposerShell />
    </Puck>
  )
}

export default ComposerStudio
