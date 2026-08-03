import { useEffect, useRef, useState } from 'react'
import type { AnalyzeRequest, GenerateResponse } from '@forge-ui/contracts'
import {
  validateRuntimeBridgeEvent,
  type ExportMode,
  type PreviewDescriptor,
  type ValidationJobSnapshot
} from '../../../../packages/validation-export/src/index'
import { useWorkspaceStore } from '../stores/workspace'
import {
  GENERATION_COMPLETED_EVENT,
  createValidationJob,
  getValidationJob,
  reportRuntimeError,
  requestExport,
  type GenerationCompletedDetail
} from '../services/engine'
import './ValidationWorkbench.css'

interface GenerationContext {
  request: AnalyzeRequest
  result: GenerateResponse
}

function terminal(state: ValidationJobSnapshot['state']): boolean {
  return state === 'succeeded' || state === 'failed' || state === 'cancelled'
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ValidationWorkbench() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [generation, setGeneration] = useState<GenerationContext>()
  const [job, setJob] = useState<ValidationJobSnapshot>()
  const [preview, setPreview] = useState<PreviewDescriptor>()
  const [pending, setPending] = useState(false)
  const [warningConfirmed, setWarningConfirmed] = useState(false)
  const [message, setMessage] = useState('Generate a project to unlock validation and export.')
  const [runtimeError, setRuntimeError] = useState<string>()
  const selectNode = useWorkspaceStore((state) => state.selectNode)

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<GenerationCompletedDetail>).detail
      setGeneration(detail)
      setJob(undefined)
      setPreview(undefined)
      setWarningConfirmed(false)
      setRuntimeError(undefined)
      setMessage(`Generation ${detail.result.plan.generationId} is ready for validation.`)
    }
    window.addEventListener(GENERATION_COMPLETED_EVENT, listener)
    return () => window.removeEventListener(GENERATION_COMPLETED_EVENT, listener)
  }, [])

  useEffect(() => {
    if (!preview || !job) return
    const listener = (event: MessageEvent) => {
      const validated = validateRuntimeBridgeEvent(
        event,
        preview.origin,
        iframeRef.current?.contentWindow ?? undefined
      )
      if (!validated.accepted || !validated.message) return
      if (validated.message.type === 'forge:node-select') {
        const nodeId = validated.message.payload.nodeId
        if (typeof nodeId === 'string') {
          selectNode(nodeId)
          setMessage(`Preview selected node ${nodeId}.`)
        }
      }
      if (validated.message.type === 'forge:runtime-error') {
        const errorMessage = validated.message.payload.message
        const stack = validated.message.payload.stack
        if (typeof errorMessage === 'string') {
          setRuntimeError(errorMessage)
          void reportRuntimeError(
            job.id,
            errorMessage,
            typeof stack === 'string' ? stack : undefined
          ).then(setJob)
        }
      }
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [job, preview, selectNode])

  const runValidation = async () => {
    if (!generation || pending) return
    setPending(true)
    setMessage('Validation queued…')
    try {
      const created = await createValidationJob(generation.request)
      setJob(created.job)
      setPreview(created.preview)
      let current = created.job
      while (!terminal(current.state)) {
        await new Promise((resolve) => setTimeout(resolve, 120))
        current = await getValidationJob(current.id)
        setJob(current)
      }
      setMessage(
        current.state === 'succeeded'
          ? 'Validation passed. Export gates are available.'
          : `Validation ${current.state}. Review the structured checks.`
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Validation failed to start.')
    } finally {
      setPending(false)
    }
  }

  const exportMode = async (mode: ExportMode) => {
    if (!job || pending) return
    setPending(true)
    try {
      const exported = await requestExport(job.id, mode, warningConfirmed)
      download(exported.blob, exported.filename)
      setMessage(
        `Downloaded ${exported.filename}${exported.archiveHash ? ` · ${exported.archiveHash}` : ''}.`
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed.')
    } finally {
      setPending(false)
    }
  }

  const checks = job?.report?.checks ?? []
  const canExport = job?.state === 'succeeded' && job.report?.exportGate.allowed === true
  const needsConfirmation = job?.report?.exportGate.warningsRequireConfirmation === true

  return (
    <aside aria-label="Validation and export" className="validationWorkbench">
      <header>
        <div>
          <small>Batch 05</small>
          <strong>Validate · Preview · Export</strong>
        </div>
        <button disabled={!generation || pending} onClick={runValidation} type="button">
          {pending ? 'Working…' : 'Validate generation'}
        </button>
      </header>

      <p className="validationWorkbench__message" role="status">
        {message}
      </p>

      {checks.length > 0 ? (
        <ul className="validationChecks" aria-label="Validation checks">
          {checks.map((check) => (
            <li data-status={check.status} key={check.name}>
              <span>{check.name}</span>
              <strong>{check.status}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      {runtimeError ? (
        <p className="validationWorkbench__error" role="alert">
          Runtime: {runtimeError}
        </p>
      ) : null}

      {needsConfirmation ? (
        <label className="validationConfirmation">
          <input
            checked={warningConfirmed}
            onChange={(event) => setWarningConfirmed(event.target.checked)}
            type="checkbox"
          />
          I reviewed the warnings and approve export.
        </label>
      ) : null}

      <div className="validationExports">
        <button
          disabled={!canExport || (needsConfirmation && !warningConfirmed) || pending}
          onClick={() => void exportMode('standalone')}
          type="button"
        >
          Standalone ZIP
        </button>
        <button
          disabled={!canExport || (needsConfirmation && !warningConfirmed) || pending}
          onClick={() => void exportMode('integration')}
          type="button"
        >
          Integration ZIP
        </button>
      </div>

      {preview ? (
        <details className="isolatedPreview" open>
          <summary>Isolated Preview · {preview.origin}</summary>
          <iframe
            ref={iframeRef}
            sandbox={preview.sandbox}
            src={preview.url}
            title="Isolated generated preview"
          />
        </details>
      ) : null}
    </aside>
  )
}
