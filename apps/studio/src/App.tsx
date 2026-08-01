import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import {
  type AnalyzeRequest,
  type ComponentMatchResult,
  type DesignInputEnvelope,
  type DesignNode,
  type GenerateResponse,
  type GeneratedFile,
  type GenerationDiagnostic
} from '@forge-ui/contracts'
import { DesignTree } from './components/DesignTree'
import { flagshipRequest } from './data/flagship'
import { parseDesignJson, validateImportFile } from './lib/input'
import { resolveResponsiveLayout, resolveResponsiveVisibility } from './lib/responsive'
import {
  findStudioTreeNode,
  studioTreePath,
  treeFromDesignNode,
  treeFromRawNode,
  walkStudioTree
} from './lib/tree'
import { generateProject } from './services/engine'
import { useWorkspaceStore, type Device, type WorkspaceTab } from './stores/workspace'

const pipelineStages = ['Import', 'Design IR', 'Map', 'Generate', 'Validate'] as const
const codeLanguages = new Set<GeneratedFile['language']>(['tsx', 'typescript', 'css', 'json'])

function Icon({ children }: { children: string }) {
  return (
    <span aria-hidden="true" className="icon">
      {children}
    </span>
  )
}

function requestIdFor(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('requestId' in error)) return undefined
  return typeof error.requestId === 'string' ? error.requestId : undefined
}

function StatusDot({ active, complete }: { active: boolean; complete: boolean }) {
  return (
    <span
      aria-label={complete ? 'Complete' : active ? 'Current' : 'Pending'}
      className={`statusDot ${complete ? 'statusDot--complete' : ''} ${active ? 'statusDot--active' : ''}`}
    />
  )
}

function findDesignNode(root: DesignNode, nodeId: string | undefined): DesignNode | undefined {
  if (!nodeId) return undefined
  const pending = [root]
  while (pending.length > 0) {
    const node = pending.shift()!
    if (node.id === nodeId) return node
    pending.unshift(...node.children)
  }
  return undefined
}

function nodeForSemantic(root: DesignNode, semantic: string): DesignNode | undefined {
  const pending = [root]
  while (pending.length > 0) {
    const node = pending.shift()!
    if (node.semantic === semantic) return node
    pending.unshift(...node.children)
  }
  return undefined
}

function containsNode(root: DesignNode, nodeId: string): boolean {
  return findDesignNode(root, nodeId) !== undefined
}

function fileForNode(result: GenerateResponse, nodeId: string): string {
  const registeredSection = result.plan.sections.find((section) => section.nodeId === nodeId)
  if (registeredSection) return `src/sections/${registeredSection.fileName}`
  const hero = findDesignNode(result.document.root, result.plan.hero.id)
  if (hero && containsNode(hero, nodeId)) return 'src/sections/Hero.tsx'
  return 'src/LandingPage.tsx'
}

function matchLabel(match: ComponentMatchResult): string {
  return match.componentId ?? match.recipeId ?? match.nativeElement ?? 'Manual review'
}

function selectWithKeyboard(event: KeyboardEvent<HTMLElement>, onSelect: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onSelect()
  }
}

function Welcome({
  onGenerate,
  pending,
  disabled,
  sourceMode
}: {
  onGenerate: () => void
  pending: boolean
  disabled: boolean
  sourceMode: 'flagship' | 'local'
}) {
  const label = sourceMode === 'flagship' ? 'Generate flagship' : 'Generate imported design'
  return (
    <div className="welcome">
      <div className="welcome__mark">F</div>
      <p className="eyebrow">Compiler-style D2C</p>
      <h1>From design intent to code you can defend.</h1>
      <p>
        Import versioned Design JSON, inspect its complete tree, resolve it against an explicit
        Registry, and navigate one stable node ID across preview, source, diagnostics, and context.
      </p>
      <button
        className="primaryButton"
        disabled={disabled || pending}
        onClick={onGenerate}
        type="button"
      >
        <span>{pending ? 'Running pipeline…' : label}</span>
        <Icon>↗</Icon>
      </button>
      <div className="welcome__facts">
        <span>Schema 1.0</span>
        <span>Registry 1.0.0</span>
        <span>Workbench</span>
      </div>
    </div>
  )
}

function PreviewNode({
  nodeId,
  selectedNodeId,
  label,
  className,
  children,
  onSelect
}: {
  nodeId: string | undefined
  selectedNodeId: string | undefined
  label: string
  className?: string
  children: React.ReactNode
  onSelect: (nodeId: string) => void
}) {
  if (!nodeId) return <div className={className}>{children}</div>
  const selected = nodeId === selectedNodeId
  return (
    <div
      aria-label={`Select ${label}`}
      aria-pressed={selected}
      className={`${className ?? ''} previewSelectable ${selected ? 'isNodeSelected' : ''}`}
      data-forge-node-id={nodeId}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(nodeId)
      }}
      onKeyDown={(event) => selectWithKeyboard(event, () => onSelect(nodeId))}
      role="button"
      tabIndex={0}
    >
      {children}
    </div>
  )
}

function PlanPreview({
  result,
  device,
  selectedNodeId,
  onSelect
}: {
  result: GenerateResponse
  device: Device
  selectedNodeId: string | undefined
  onSelect: (nodeId: string) => void
}) {
  const { hero } = result.plan
  const heroNode = findDesignNode(result.document.root, hero.id)
  const titleNode = heroNode ? nodeForSemantic(heroNode, 'hero-title') : undefined
  const eyebrowNode = heroNode ? nodeForSemantic(heroNode, 'hero-eyebrow') : undefined
  const descriptionNode = heroNode ? nodeForSemantic(heroNode, 'hero-description') : undefined
  const resolvedLayout = resolveResponsiveLayout(heroNode?.layout, heroNode?.responsive, device)
  const visible = resolveResponsiveVisibility(heroNode?.responsive, device)

  return (
    <div className={`previewFrame previewFrame--${device}`}>
      <article
        className={`planPreview ${selectedNodeId === hero.id ? 'isNodeSelected' : ''}`}
        data-columns={resolvedLayout.columns}
        data-forge-node-id={hero.id}
        hidden={!visible}
      >
        <button
          aria-label="Select Hero section"
          aria-pressed={selectedNodeId === hero.id}
          className="previewSectionSelector"
          onClick={() => onSelect(hero.id)}
          type="button"
        >
          Hero · {device}
        </button>
        <div className="planPreview__glow" />
        <div className="planPreview__copy">
          <PreviewNode
            label="Hero eyebrow"
            nodeId={eyebrowNode?.id}
            onSelect={onSelect}
            selectedNodeId={selectedNodeId}
          >
            <span>{hero.eyebrow}</span>
          </PreviewNode>
          <h2>
            <button
              aria-pressed={titleNode?.id === selectedNodeId}
              className={
                titleNode?.id === selectedNodeId
                  ? 'previewTextNode isNodeSelected'
                  : 'previewTextNode'
              }
              data-forge-node-id={titleNode?.id}
              onClick={() => titleNode && onSelect(titleNode.id)}
              type="button"
            >
              {hero.title}
            </button>
          </h2>
          <PreviewNode
            label="Hero description"
            nodeId={descriptionNode?.id}
            onSelect={onSelect}
            selectedNodeId={selectedNodeId}
          >
            <p>{hero.description}</p>
          </PreviewNode>
          <div className="previewActions">
            {hero.actions.map((action, index) => (
              <button
                aria-pressed={action.nodeId === selectedNodeId}
                className={`${index === 0 ? 'previewAction previewAction--primary' : 'previewAction'} ${action.nodeId === selectedNodeId ? 'isNodeSelected' : ''}`}
                data-forge-node-id={action.nodeId}
                key={action.nodeId}
                onClick={() => onSelect(action.nodeId)}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
        <PreviewNode
          className="planPreview__visual"
          label="Product preview"
          nodeId={hero.visual?.nodeId}
          onSelect={onSelect}
          selectedNodeId={selectedNodeId}
        >
          <header>
            <i />
            <i />
            <i />
          </header>
          <section>
            <aside>
              {Array.from({ length: 5 }, (_, index) => (
                <i key={index} />
              ))}
            </aside>
            <main>
              <span>Generated preview</span>
              <strong>Signal dashboard</strong>
              <div className="metricRow">
                <b>
                  1,284<small>Automations</small>
                </b>
                <b>
                  248h<small>Time saved</small>
                </b>
              </div>
              <div className="miniChart">
                {[35, 58, 44, 76, 62, 89, 70, 94].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </main>
          </section>
        </PreviewNode>
      </article>
      <div aria-label="Generated marketing sections" className="previewSections">
        {result.plan.sections.map((section) => (
          <button
            aria-pressed={section.nodeId === selectedNodeId}
            className={section.nodeId === selectedNodeId ? 'isNodeSelected' : ''}
            data-forge-node-id={section.nodeId}
            key={section.nodeId}
            onClick={() => onSelect(section.nodeId)}
            type="button"
          >
            <strong>{section.functionName}</strong>
            <small>
              {
                Object.values(section.props).filter(
                  (value) => typeof value === 'string'
                )[0] as string
              }
            </small>
          </button>
        ))}
      </div>
      <div className="previewNote">
        <Icon>◇</Icon>
        Select a preview node to locate the same stable ID in Tree, Code, and Inspector.
      </div>
    </div>
  )
}

function CodeView({
  files,
  selectedNodeId
}: {
  files: GeneratedFile[]
  selectedNodeId: string | undefined
}) {
  const selectedFile = useWorkspaceStore((state) => state.selectedFile)
  const setSelectedFile = useWorkspaceStore((state) => state.setSelectedFile)
  const codeFiles = files.filter((file) => codeLanguages.has(file.language))
  const selected = codeFiles.find((file) => file.path === selectedFile) ?? codeFiles[0]
  const containsNode = selectedNodeId
    ? (selected?.content.includes(`data-forge-node-id="${selectedNodeId}"`) ?? false)
    : false

  return (
    <div className="codeView">
      <nav className="codeFiles" aria-label="Generated files">
        {codeFiles.map((file) => (
          <button
            aria-pressed={file.path === selected?.path}
            className={file.path === selected?.path ? 'isSelected' : ''}
            key={file.path}
            onClick={() => setSelectedFile(file.path)}
            type="button"
          >
            <Icon>{file.language === 'css' ? '#' : '<>'}</Icon>
            {file.path}
          </button>
        ))}
      </nav>
      <div className="codeContent">
        <p className="codeLocator" role="status">
          {selectedNodeId
            ? `${containsNode ? 'Located' : 'Related'} node ${selectedNodeId} in ${selected?.path}`
            : `Viewing ${selected?.path}`}
        </p>
        <pre className="codePanel">
          <code>{selected?.content ?? 'No generated source.'}</code>
        </pre>
      </div>
    </div>
  )
}

function Inspector({
  result,
  selectedNode,
  selectedMatch,
  selectedDiagnostic,
  device,
  registryName,
  registryVersion
}: {
  result: GenerateResponse | undefined
  selectedNode: DesignNode | undefined
  selectedMatch: ComponentMatchResult | undefined
  selectedDiagnostic: GenerationDiagnostic | undefined
  device: Device
  registryName: string
  registryVersion: string
}) {
  const responsiveLayout = resolveResponsiveLayout(
    selectedNode?.layout,
    selectedNode?.responsive,
    device
  )
  const mapped = result?.matches.filter((match) => match.strategy !== 'manual-review').length ?? 0

  return (
    <aside aria-label="Inspector" className="inspector">
      <div className="panelHeader">
        <div>
          <span>Context</span>
          <strong>
            {selectedNode?.name ?? (result ? 'Select a node' : 'Awaiting generation')}
          </strong>
        </div>
        <Icon>⌘</Icon>
      </div>
      {result ? (
        <>
          <section className="inspectorSection">
            <p className="sectionLabel">Generation</p>
            <dl className="detailGrid">
              <div>
                <dt>ID</dt>
                <dd>{result.plan.generationId.replace('generation_', '')}</dd>
              </div>
              <div>
                <dt>Input</dt>
                <dd>{result.plan.sourceHash}</dd>
              </div>
              <div>
                <dt>Files</dt>
                <dd>{result.project.files.length}</dd>
              </div>
              <div>
                <dt>Nodes</dt>
                <dd>{result.summary.totalNodes}</dd>
              </div>
            </dl>
          </section>
          <section className="inspectorSection">
            <p className="sectionLabel">Selected node</p>
            <dl className="nodeDetails">
              <div>
                <dt>Node ID</dt>
                <dd>{selectedNode?.id ?? 'None'}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{selectedNode?.type ?? '—'}</dd>
              </div>
              <div>
                <dt>Semantic</dt>
                <dd>{selectedNode?.semantic ?? '—'}</dd>
              </div>
              <div>
                <dt>{device} layout</dt>
                <dd>{JSON.stringify(responsiveLayout)}</dd>
              </div>
            </dl>
          </section>
          <section className="inspectorSection">
            <div className="sectionHeading">
              <p className="sectionLabel">Component mapping</p>
              <span>
                {mapped}/{result.summary.componentNodes}
              </span>
            </div>
            {selectedMatch ? (
              <article className="selectedMatch">
                <strong>{matchLabel(selectedMatch)}</strong>
                <span>{selectedMatch.strategy}</span>
                <p>{selectedMatch.reasons.join(' ')}</p>
                {selectedMatch.warnings.map((warning) => (
                  <small key={warning}>{warning}</small>
                ))}
              </article>
            ) : (
              <p className="emptyCopy">The selected node is not eligible for component matching.</p>
            )}
          </section>
          {selectedDiagnostic ? (
            <section className="inspectorSection diagnosticDetail">
              <p className="sectionLabel">Selected diagnostic</p>
              <strong>{selectedDiagnostic.code}</strong>
              <p>{selectedDiagnostic.message}</p>
              <ul>
                {selectedDiagnostic.suggestedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="inspectorSection">
            <p className="sectionLabel">Registry</p>
            <p className="registryMeta">
              {registryName} <strong>{registryVersion}</strong>
            </p>
          </section>
        </>
      ) : (
        <div className="inspectorEmpty">
          <Icon>◎</Icon>
          <p>
            Import or select a Design JSON source, then run the pipeline to inspect generated
            context.
          </p>
        </div>
      )}
    </aside>
  )
}

export default function App() {
  const activeTab = useWorkspaceStore((state) => state.activeTab)
  const setActiveTab = useWorkspaceStore((state) => state.setActiveTab)
  const device = useWorkspaceStore((state) => state.device)
  const setDevice = useWorkspaceStore((state) => state.setDevice)
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId)
  const selectNode = useWorkspaceStore((state) => state.selectNode)
  const expandedNodeIds = useWorkspaceStore((state) => state.expandedNodeIds)
  const toggleExpandedNode = useWorkspaceStore((state) => state.toggleExpandedNode)
  const expandNodePath = useWorkspaceStore((state) => state.expandNodePath)
  const setSelectedFile = useWorkspaceStore((state) => state.setSelectedFile)
  const selectedDiagnosticKey = useWorkspaceStore((state) => state.selectedDiagnosticKey)
  const selectDiagnostic = useWorkspaceStore((state) => state.selectDiagnostic)
  const reconcile = useWorkspaceStore((state) => state.reconcile)
  const [sourceMode, setSourceMode] = useState<'flagship' | 'local'>('flagship')
  const [localInput, setLocalInput] = useState<DesignInputEnvelope>()
  const [draftJson, setDraftJson] = useState(() => JSON.stringify(flagshipRequest.input, null, 2))
  const [importError, setImportError] = useState<string>()
  const [importStatus, setImportStatus] = useState<string>()
  const [selectedRegistryId, setSelectedRegistryId] = useState(flagshipRequest.registry.registryId)
  const [lastSuccessfulResult, setLastSuccessfulResult] = useState<GenerateResponse>()

  const generation = useMutation({
    mutationFn: (request: AnalyzeRequest) => generateProject(request),
    onSuccess: (result) => {
      setLastSuccessfulResult(result)
      setImportStatus(`Generated ${result.document.documentId}.`)
    }
  })
  const result = lastSuccessfulResult
  const currentInput = sourceMode === 'flagship' ? flagshipRequest.input : localInput
  const currentRequest: AnalyzeRequest | undefined =
    currentInput && selectedRegistryId === flagshipRequest.registry.registryId
      ? { input: currentInput, registry: flagshipRequest.registry }
      : undefined
  const completedStage = result ? 5 : generation.isPending ? 3 : currentInput ? 1 : 0
  const diagnostics = useMemo(() => result?.project.diagnostics ?? [], [result])
  const generationRequestId = requestIdFor(generation.error)
  const treeRoot = useMemo(
    () =>
      result
        ? treeFromDesignNode(result.document.root)
        : treeFromRawNode((currentInput ?? flagshipRequest.input).root),
    [currentInput, result]
  )
  const selectedTreeNode = findStudioTreeNode(treeRoot, selectedNodeId)
  const selectedDesignNode = result
    ? findDesignNode(result.document.root, selectedTreeNode?.id)
    : undefined
  const selectedMatch = result?.matches.find((match) => match.nodeId === selectedNodeId)
  const diagnosticEntries = diagnostics.map((diagnostic, index) => ({
    diagnostic,
    key: `${diagnostic.code}:${diagnostic.nodeId ?? 'global'}:${index}`
  }))
  const selectedDiagnostic = diagnosticEntries.find(
    (entry) => entry.key === selectedDiagnosticKey
  )?.diagnostic

  useEffect(() => {
    const nodeIds = walkStudioTree(treeRoot).map((node) => node.id)
    const filePaths = result?.project.files.map((file) => file.path) ?? []
    reconcile(nodeIds, filePaths, result?.plan.hero.id)
  }, [reconcile, result, treeRoot])

  const selectWorkspaceNode = (nodeId: string, clearDiagnostic = true) => {
    selectNode(nodeId)
    expandNodePath(studioTreePath(treeRoot, nodeId).slice(0, -1))
    if (clearDiagnostic) selectDiagnostic(undefined)
    if (result) setSelectedFile(fileForNode(result, nodeId))
  }

  const runGeneration = () => {
    if (!currentRequest || generation.isPending) return
    generation.mutate(currentRequest)
  }

  const applyDraft = () => {
    const parsed = parseDesignJson(draftJson)
    if (!parsed.ok) {
      setImportError(parsed.error)
      setImportStatus(undefined)
      return
    }
    setLocalInput(parsed.input)
    setSourceMode('local')
    setImportError(undefined)
    setImportStatus(`Loaded ${parsed.input.documentId}; run the pipeline to generate it.`)
  }

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const metadataError = validateImportFile(file)
    if (metadataError) {
      setImportError(metadataError)
      return
    }
    let content: string
    try {
      content = await file.text()
    } catch {
      setImportError(`Could not read ${file.name}. Choose the file again.`)
      setImportStatus(undefined)
      return
    }
    setDraftJson(content)
    const parsed = parseDesignJson(content)
    if (!parsed.ok) {
      setImportError(parsed.error)
      setImportStatus(undefined)
      return
    }
    setLocalInput(parsed.input)
    setSourceMode('local')
    setImportError(undefined)
    setImportStatus(`Imported ${file.name} as ${parsed.input.documentId}.`)
  }

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brand">
          <span>F</span>
          <strong>ForgeUI</strong>
          <em>Studio</em>
        </div>
        <nav className="pipeline" aria-label="Generation pipeline">
          {pipelineStages.map((stage, index) => (
            <div key={stage}>
              <StatusDot
                active={generation.isPending && index === 3}
                complete={index < completedStage}
              />
              <span>{stage}</span>
              {index < pipelineStages.length - 1 ? <i /> : null}
            </div>
          ))}
        </nav>
        <button
          className="runButton"
          disabled={generation.isPending || !currentRequest}
          onClick={runGeneration}
          type="button"
        >
          <Icon>▶</Icon>
          {generation.isPending ? 'Running' : 'Run pipeline'}
        </button>
      </header>

      <aside aria-label="Project and Design input" className="leftRail">
        <div className="railHeader">
          <span>Project</span>
          <label className="importFileButton">
            Import JSON
            <input
              accept="application/json,.json"
              aria-label="Import Design JSON"
              onChange={importFile}
              type="file"
            />
          </label>
        </div>
        <div className="projectCard">
          <div className="projectCard__icon">P</div>
          <div>
            <strong>{currentInput?.source.name ?? 'No design selected'}</strong>
            <small>{currentInput?.documentId ?? 'Choose a source'}</small>
          </div>
          <span>{currentInput?.schemaVersion ?? '—'}</span>
        </div>
        <div className="sourceControls">
          <label htmlFor="design-source">Design source</label>
          <select
            id="design-source"
            onChange={(event) => setSourceMode(event.target.value as 'flagship' | 'local')}
            value={sourceMode}
          >
            <option value="flagship">AI SaaS Flagship preset</option>
            <option value="local">Local JSON draft</option>
          </select>
          <label htmlFor="registry-source">Component Registry</label>
          <select
            id="registry-source"
            onChange={(event) => setSelectedRegistryId(event.target.value)}
            value={selectedRegistryId}
          >
            <option value="">Choose a Registry</option>
            <option value={flagshipRequest.registry.registryId}>
              {flagshipRequest.registry.registryId} · {flagshipRequest.registry.registryVersion}
            </option>
          </select>
          {sourceMode === 'local' ? (
            <div className="jsonEditor">
              <label htmlFor="design-json-editor">Design JSON editor</label>
              <textarea
                id="design-json-editor"
                onChange={(event) => setDraftJson(event.target.value)}
                spellCheck={false}
                value={draftJson}
              />
              <button onClick={applyDraft} type="button">
                Apply JSON
              </button>
            </div>
          ) : null}
          {importError ? (
            <p className="importMessage importMessage--error" role="alert">
              {importError}
            </p>
          ) : null}
          {importStatus ? (
            <p className="importMessage" role="status">
              {importStatus}
            </p>
          ) : null}
        </div>
        <p className="sectionLabel railLabel">Design tree</p>
        <DesignTree
          expandedNodeIds={expandedNodeIds}
          onSelect={selectWorkspaceNode}
          onToggle={toggleExpandedNode}
          root={treeRoot}
          selectedNodeId={selectedNodeId}
        />
        <div className="railFooter">
          <span>{flagshipRequest.registry.package.name}</span>
          <strong>
            <i />{' '}
            {selectedRegistryId ? `v${flagshipRequest.registry.registryVersion}` : 'Not selected'}
          </strong>
        </div>
      </aside>

      <main className="workspace">
        <div className="workspaceToolbar">
          <div className="segmented">
            {(['preview', 'code'] as WorkspaceTab[]).map((tab) => (
              <button
                aria-pressed={activeTab === tab}
                className={activeTab === tab ? 'isSelected' : ''}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab === 'preview' ? 'Preview' : 'Generated code'}
              </button>
            ))}
          </div>
          <div className="deviceSwitch">
            {(['desktop', 'tablet', 'mobile'] as Device[]).map((value) => (
              <button
                aria-label={value}
                aria-pressed={device === value}
                className={device === value ? 'isSelected' : ''}
                key={value}
                onClick={() => setDevice(value)}
                type="button"
              >
                {value === 'desktop' ? '▭' : value === 'tablet' ? '▯' : '▯'}
              </button>
            ))}
          </div>
          <span className="workspaceMeta">{result?.plan.generationId ?? 'No generation'}</span>
        </div>
        <div className="workspaceBody">
          {generation.error && result ? (
            <div className="errorBanner" role="alert">
              <strong>Latest generation failed.</strong> {generation.error.message}
              {generationRequestId ? <small>Request ID: {generationRequestId}</small> : null}
              <button disabled={generation.isPending} onClick={runGeneration} type="button">
                Retry
              </button>
            </div>
          ) : null}
          {generation.error && !result ? (
            <div className="errorState" role="alert">
              <Icon>!</Icon>
              <h2>Generation failed</h2>
              <p>{generation.error.message}</p>
              {generationRequestId ? <small>Request ID: {generationRequestId}</small> : null}
              <button
                className="primaryButton"
                disabled={generation.isPending}
                onClick={runGeneration}
                type="button"
              >
                Retry generation
              </button>
            </div>
          ) : !result ? (
            <Welcome
              disabled={!currentRequest}
              onGenerate={runGeneration}
              pending={generation.isPending}
              sourceMode={sourceMode}
            />
          ) : activeTab === 'preview' ? (
            <PlanPreview
              device={device}
              onSelect={selectWorkspaceNode}
              result={result}
              selectedNodeId={selectedNodeId}
            />
          ) : (
            <CodeView files={result.project.files} selectedNodeId={selectedNodeId} />
          )}
        </div>
        <footer className="diagnostics">
          <div>
            <Icon>⌁</Icon>
            <strong>Diagnostics</strong>
            <span>{diagnostics.length}</span>
          </div>
          <nav aria-label="Diagnostics" className="diagnosticList">
            {diagnosticEntries.length > 0 ? (
              diagnosticEntries.map(({ diagnostic, key }) => (
                <button
                  aria-pressed={selectedDiagnosticKey === key}
                  key={key}
                  onClick={() => {
                    selectDiagnostic(key)
                    if (diagnostic.nodeId) {
                      selectWorkspaceNode(diagnostic.nodeId, false)
                    }
                  }}
                  type="button"
                >
                  {diagnostic.code}: {diagnostic.message}
                </button>
              ))
            ) : (
              <p>No diagnostics. CLI validation remains explicit.</p>
            )}
          </nav>
          <span className="engineStatus">
            <i /> Engine {result ? 'connected' : 'ready'}
          </span>
        </footer>
      </main>

      <Inspector
        device={device}
        registryName={flagshipRequest.registry.package.name}
        registryVersion={flagshipRequest.registry.registryVersion}
        result={result}
        selectedDiagnostic={selectedDiagnostic}
        selectedMatch={selectedMatch}
        selectedNode={selectedDesignNode}
      />
    </div>
  )
}
