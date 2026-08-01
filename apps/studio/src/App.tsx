import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { GenerateResponse, GeneratedFile } from '@forge-ui/contracts'
import { flagshipRequest } from './data/flagship'
import { generateFlagship } from './services/engine'
import { useWorkspaceStore, type Device, type WorkspaceTab } from './stores/workspace'

const pipelineStages = ['Import', 'Design IR', 'Map', 'Generate', 'Validate'] as const
const codeLanguages = new Set<GeneratedFile['language']>(['tsx', 'typescript', 'css', 'json'])

function Icon({ children }: { children: string }) {
  return <span className="icon">{children}</span>
}

function StatusDot({ active, complete }: { active: boolean; complete: boolean }) {
  return (
    <span
      aria-label={complete ? 'Complete' : active ? 'Current' : 'Pending'}
      className={`statusDot ${complete ? 'statusDot--complete' : ''} ${active ? 'statusDot--active' : ''}`}
    />
  )
}

function Welcome({ onGenerate, pending }: { onGenerate: () => void; pending: boolean }) {
  return (
    <div className="welcome">
      <div className="welcome__mark">F</div>
      <p className="eyebrow">Compiler-style D2C</p>
      <h1>From design intent to code you can defend.</h1>
      <p>
        Run the flagship preset through versioned contracts, deterministic Design IR, an external
        component Registry, Generation Plan, and Babel AST code generation.
      </p>
      <button className="primaryButton" disabled={pending} onClick={onGenerate} type="button">
        <span>{pending ? 'Running pipeline…' : 'Generate flagship'}</span>
        <Icon>↗</Icon>
      </button>
      <div className="welcome__facts">
        <span>Schema 1.0</span>
        <span>Registry 1.0.0</span>
        <span>Phase 1</span>
      </div>
    </div>
  )
}

function PlanPreview({ result, device }: { result: GenerateResponse; device: Device }) {
  const { hero } = result.plan
  return (
    <div className={`previewFrame previewFrame--${device}`}>
      <article className="planPreview">
        <div className="planPreview__glow" />
        <div className="planPreview__copy">
          <span>{hero.eyebrow}</span>
          <h2>{hero.title}</h2>
          <p>{hero.description}</p>
          <div>
            {hero.actions.map((action, index) => (
              <button
                className={index === 0 ? 'previewAction previewAction--primary' : 'previewAction'}
                key={action.nodeId}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
        <div className="planPreview__visual">
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
        </div>
      </article>
      <div className="previewNote">
        <Icon>◇</Icon>
        Plan preview — generated output is validated separately by TypeScript and Vite.
      </div>
    </div>
  )
}

function CodeView({ files }: { files: GeneratedFile[] }) {
  const selectedFile = useWorkspaceStore((state) => state.selectedFile)
  const setSelectedFile = useWorkspaceStore((state) => state.setSelectedFile)
  const codeFiles = files.filter((file) => codeLanguages.has(file.language))
  const selected = codeFiles.find((file) => file.path === selectedFile) ?? codeFiles[0]

  return (
    <div className="codeView">
      <nav className="codeFiles" aria-label="Generated files">
        {codeFiles.map((file) => (
          <button
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
      <pre className="codePanel">
        <code>{selected?.content ?? 'No generated source.'}</code>
      </pre>
    </div>
  )
}

function Inspector({ result }: { result: GenerateResponse | undefined }) {
  return (
    <aside className="inspector">
      <div className="panelHeader">
        <div>
          <span>Context</span>
          <strong>{result ? 'Hero section' : 'Awaiting input'}</strong>
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
            <div className="sectionHeading">
              <p className="sectionLabel">Component mapping</p>
              <span>
                {result.summary.exactMatches}/{result.summary.componentNodes}
              </span>
            </div>
            <div className="matchList">
              {result.matches.map((match) => (
                <article key={match.nodeId}>
                  <span className="matchIcon">✓</span>
                  <div>
                    <strong>{match.componentId}</strong>
                    <small>{match.nodeId}</small>
                  </div>
                  <em>{match.confidence}</em>
                </article>
              ))}
            </div>
          </section>
          <section className="inspectorSection">
            <p className="sectionLabel">Validation contract</p>
            <ul className="validationList">
              <li>
                <span>Schema</span>
                <b>Passed</b>
              </li>
              <li>
                <span>TypeScript</span>
                <b className="pending">CLI gate</b>
              </li>
              <li>
                <span>Vite build</span>
                <b className="pending">CLI gate</b>
              </li>
              <li>
                <span>Runtime / visual</span>
                <b className="skipped">Later phase</b>
              </li>
            </ul>
          </section>
        </>
      ) : (
        <div className="inspectorEmpty">
          <Icon>◎</Icon>
          <p>
            Generate the flagship to inspect exact matches, source files, and validation status.
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
  const generation = useMutation({ mutationFn: () => generateFlagship(flagshipRequest) })
  const completedStage = generation.data ? 5 : generation.isPending ? 3 : 0
  const diagnostics = useMemo(() => generation.data?.project.diagnostics ?? [], [generation.data])

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
          disabled={generation.isPending}
          onClick={() => generation.mutate()}
          type="button"
        >
          <Icon>▶</Icon>
          {generation.isPending ? 'Running' : 'Run pipeline'}
        </button>
      </header>

      <aside className="leftRail">
        <div className="railHeader">
          <span>Project</span>
          <button type="button">•••</button>
        </div>
        <div className="projectCard">
          <div className="projectCard__icon">P</div>
          <div>
            <strong>Pulse AI</strong>
            <small>AI SaaS Flagship</small>
          </div>
          <span>1.0</span>
        </div>
        <p className="sectionLabel railLabel">Design tree</p>
        <div className="tree">
          <button type="button">
            <Icon>▾</Icon>
            <b>◇</b>AI SaaS Landing Page
          </button>
          <button className="tree__child isSelected" type="button">
            <Icon>▾</Icon>
            <b>▱</b>Hero
          </button>
          <button className="tree__leaf" type="button">
            <Icon>·</Icon>
            <b>T</b>Hero Title
          </button>
          <button className="tree__leaf" type="button">
            <Icon>·</Icon>
            <b>□</b>Primary CTA
          </button>
          <button className="tree__leaf" type="button">
            <Icon>·</Icon>
            <b>▧</b>Product Preview
          </button>
        </div>
        <div className="railFooter">
          <span>External Registry</span>
          <strong>
            <i /> Connected
          </strong>
        </div>
      </aside>

      <main className="workspace">
        <div className="workspaceToolbar">
          <div className="segmented">
            {(['preview', 'code'] as WorkspaceTab[]).map((tab) => (
              <button
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
                className={device === value ? 'isSelected' : ''}
                key={value}
                onClick={() => setDevice(value)}
                type="button"
              >
                {value === 'desktop' ? '▭' : value === 'tablet' ? '▯' : '▯'}
              </button>
            ))}
          </div>
          <span className="workspaceMeta">
            {generation.data?.plan.generationId ?? 'No generation'}
          </span>
        </div>
        <div className="workspaceBody">
          {generation.error ? (
            <div className="errorState">
              <Icon>!</Icon>
              <h2>Generation failed</h2>
              <p>{generation.error.message}</p>
            </div>
          ) : !generation.data ? (
            <Welcome onGenerate={() => generation.mutate()} pending={generation.isPending} />
          ) : activeTab === 'preview' ? (
            <PlanPreview device={device} result={generation.data} />
          ) : (
            <CodeView files={generation.data.project.files} />
          )}
        </div>
        <footer className="diagnostics">
          <div>
            <Icon>⌁</Icon>
            <strong>Diagnostics</strong>
            <span>{diagnostics.length}</span>
          </div>
          <p>
            {diagnostics[0]?.message ??
              'No blocking diagnostics. Phase 1 CLI validation remains explicit.'}
          </p>
          <span className="engineStatus">
            <i /> Engine {generation.data ? 'connected' : 'ready'}
          </span>
        </footer>
      </main>

      <Inspector result={generation.data} />
    </div>
  )
}
