// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import input from '../../../../presets/saas/input.json'
import registry from '../../../../presets/saas/registry.json'
import { generateDesign } from '../../../engine/src/pipeline'
import { useWorkspaceStore } from '../stores/workspace'
import {
  GENERATION_COMPLETED_EVENT,
  createValidationJob,
  getValidationJob,
  reportRuntimeError,
  requestExport
} from '../services/engine'
import { ValidationWorkbench } from './ValidationWorkbench'

vi.mock('../services/engine', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/engine')>()
  return {
    ...original,
    createValidationJob: vi.fn(),
    getValidationJob: vi.fn(),
    reportRuntimeError: vi.fn(),
    requestExport: vi.fn()
  }
})

const generated = generateDesign({ input, registry }, '2026-08-03T00:00:00.000Z')
const succeeded = {
  id: 'validation_test',
  requestId: 'request-test',
  generationId: generated.plan.generationId,
  state: 'succeeded' as const,
  createdAt: '2026-08-03T00:00:00.000Z',
  updatedAt: '2026-08-03T00:00:01.000Z',
  logs: [],
  report: {
    schemaVersion: '1.0' as const,
    generationId: generated.plan.generationId,
    createdAt: '2026-08-03T00:00:00.000Z',
    completedAt: '2026-08-03T00:00:01.000Z',
    environment: {
      locale: 'en-US',
      timezone: 'UTC',
      deviceScaleFactor: 1,
      fonts: ['Inter', 'system-ui', 'sans-serif'],
      viewports: [390, 768, 1440],
      browser: null
    },
    checks: [
      {
        name: 'runtime' as const,
        status: 'passed' as const,
        startedAt: '2026-08-03T00:00:00.000Z',
        completedAt: '2026-08-03T00:00:00.100Z',
        durationMs: 100,
        diagnostics: [],
        details: {}
      }
    ],
    summary: { passed: 6, failed: 0, skipped: 1, warnings: 0, blockingErrors: 0 },
    exportGate: { allowed: true, warningsRequireConfirmation: false, reasons: [] }
  }
}

beforeEach(() => {
  const { report: _report, ...queuedJob } = succeeded
  vi.mocked(createValidationJob).mockResolvedValue({
    job: { ...queuedJob, state: 'queued' },
    preview: {
      url: 'http://127.0.0.1:4174/preview/validation_test',
      origin: 'http://127.0.0.1:4174',
      sandbox: 'allow-scripts',
      csp: "default-src 'none'"
    }
  })
  vi.mocked(getValidationJob).mockResolvedValue(succeeded)
  vi.mocked(reportRuntimeError).mockResolvedValue({ ...succeeded, state: 'failed' })
  vi.mocked(requestExport).mockResolvedValue({
    blob: new Blob(['zip'], { type: 'application/zip' }),
    filename: 'forgeui-test-standalone.zip',
    archiveHash: 'abcd1234'
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:test')
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  useWorkspaceStore.setState({ selectedNodeId: undefined })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function announceGeneration() {
  window.dispatchEvent(
    new CustomEvent(GENERATION_COMPLETED_EVENT, {
      detail: { request: { input, registry }, result: generated }
    })
  )
}

describe('Batch 05 Studio validation workbench', () => {
  it('validates, renders isolated iframe policy and enables both export modes', async () => {
    const user = userEvent.setup()
    render(<ValidationWorkbench />)
    announceGeneration()

    await user.click(screen.getByRole('button', { name: 'Validate generation' }))

    expect(await screen.findByText('Validation passed. Export gates are available.')).toBeVisible()
    expect(screen.getByTitle('Isolated generated preview')).toHaveAttribute(
      'sandbox',
      'allow-scripts'
    )
    expect(screen.getByRole('button', { name: 'Standalone ZIP' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Integration ZIP' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Standalone ZIP' }))
    expect(requestExport).toHaveBeenCalledWith('validation_test', 'standalone', false)
  })

  it('accepts node selection only from the expected Preview window and origin', async () => {
    const user = userEvent.setup()
    render(<ValidationWorkbench />)
    announceGeneration()
    await user.click(screen.getByRole('button', { name: 'Validate generation' }))
    const frame = await screen.findByTitle('Isolated generated preview')

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        source: frame.contentWindow,
        data: {
          schemaVersion: '1.0',
          type: 'forge:node-select',
          payload: { nodeId: 'hero' }
        }
      })
    )
    expect(useWorkspaceStore.getState().selectedNodeId).toBeUndefined()

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'http://127.0.0.1:4174',
        source: frame.contentWindow,
        data: {
          schemaVersion: '1.0',
          type: 'forge:node-select',
          payload: { nodeId: 'hero' }
        }
      })
    )
    await waitFor(() => expect(useWorkspaceStore.getState().selectedNodeId).toBe('hero'))
  })
})
