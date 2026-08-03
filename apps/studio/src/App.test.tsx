// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import input from '../../../presets/saas/input.json'
import registry from '../../../presets/saas/registry.json'
import { generateDesign } from '../../engine/src/pipeline'
import App from './App'
import { generateProject } from './services/engine'
import { useWorkspaceStore } from './stores/workspace'

vi.mock('./services/engine', () => ({ generateProject: vi.fn() }))

const generated = generateDesign({ input, registry }, '2026-08-01T00:00:00.000Z')
const generateMock = vi.mocked(generateProject)

function renderApp() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  generateMock.mockReset()
  window.localStorage.clear()
  useWorkspaceStore.setState({
    device: 'desktop',
    activeTab: 'preview',
    selectedNodeId: undefined,
    selectedFile: 'src/sections/Hero.tsx',
    expandedNodeIds: [],
    selectedDiagnosticKey: undefined
  })
})

afterEach(() => {
  cleanup()
})

describe('ForgeUI Studio', () => {
  it('UI-001 renders the pre-generation workspace and empty Inspector', () => {
    renderApp()

    expect(screen.getByText('AI SaaS Flagship')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Generation pipeline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate flagship' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Awaiting generation')).toBeInTheDocument()
    expect(screen.getByText('No generation')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Component Registry' })).toHaveValue(
      'forgeui-example-external-ui'
    )
  })

  it('UI-002 generates and displays the preview, mapping count and connection state', async () => {
    generateMock.mockResolvedValue(generated)
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /Generate flagship/ }))

    expect(await screen.findByRole('heading', { name: generated.plan.hero.title })).toBeVisible()
    expect(screen.getByText('7/7')).toBeInTheDocument()
    expect(screen.getByText(/Engine connected/)).toBeInTheDocument()
    expect(screen.getByText(generated.plan.generationId)).toBeInTheDocument()
  })

  it('UI-003 disables both run controls while generation is pending', async () => {
    generateMock.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /Generate flagship/ }))

    expect(await screen.findByRole('button', { name: /Running pipeline/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Running$/ })).toBeDisabled()
    expect(screen.getByLabelText('Current')).toBeInTheDocument()
  })

  it('UI-004 renders the Engine error without losing its diagnostic message', async () => {
    generateMock.mockRejectedValue(
      Object.assign(new Error('REGISTRY_INVALID: Registry is unsafe.'), {
        requestId: 'request-ui-4'
      })
    )
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /Generate flagship/ }))

    expect(await screen.findByRole('heading', { name: 'Generation failed' })).toBeVisible()
    expect(screen.getByText('REGISTRY_INVALID: Registry is unsafe.')).toBeInTheDocument()
    expect(screen.getByText('Request ID: request-ui-4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry generation' })).toBeEnabled()
  })

  it('UI-005 opens generated code and defaults to Hero TSX', async () => {
    generateMock.mockResolvedValue(generated)
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /Generate flagship/ }))
    await screen.findByRole('heading', { name: generated.plan.hero.title })

    await user.click(screen.getByRole('button', { name: 'Generated code' }))

    expect(screen.getByRole('navigation', { name: 'Generated files' })).toBeInTheDocument()
    expect(screen.getByText(/export function Hero/)).toBeInTheDocument()
  })

  it('UI-006 changes the code panel when tokens.css is selected', async () => {
    generateMock.mockResolvedValue(generated)
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /Generate flagship/ }))
    await screen.findByRole('heading', { name: generated.plan.hero.title })
    await user.click(screen.getByRole('button', { name: 'Generated code' }))

    await user.click(screen.getByRole('button', { name: 'src/tokens.css' }))

    expect(screen.getByText(/--color-brand-primary: var\(--color-purple-500\)/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'src/tokens.css' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('UI-007 switches preview state from desktop to tablet and mobile', async () => {
    generateMock.mockResolvedValue(generated)
    const user = userEvent.setup()
    const { container } = renderApp()
    await user.click(screen.getByRole('button', { name: /Generate flagship/ }))
    await screen.findByRole('heading', { name: generated.plan.hero.title })

    await user.click(screen.getByRole('button', { name: 'tablet' }))
    await waitFor(() =>
      expect(container.querySelector('.previewFrame')).toHaveClass('previewFrame--tablet')
    )
    expect(container.querySelector('.planPreview')).toHaveAttribute('data-columns', '1')
    await user.click(screen.getByRole('button', { name: 'mobile' }))
    await waitFor(() =>
      expect(container.querySelector('.previewFrame')).toHaveClass('previewFrame--mobile')
    )
    expect(screen.getByRole('button', { name: 'mobile' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('UI-012 retries a failed generation and recovers to the preview', async () => {
    generateMock
      .mockRejectedValueOnce(new Error('NETWORK_ERROR: Engine unavailable.'))
      .mockResolvedValueOnce(generated)
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Generate flagship' }))
    await screen.findByRole('heading', { name: 'Generation failed' })
    await user.click(screen.getByRole('button', { name: 'Retry generation' }))

    expect(await screen.findByRole('heading', { name: generated.plan.hero.title })).toBeVisible()
    expect(generateMock).toHaveBeenCalledTimes(2)
  })

  it('UI-013 exposes clean accessible names and pressed selection state', () => {
    renderApp()

    expect(screen.getByRole('button', { name: 'Generate flagship' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run pipeline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Generated code' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByRole('button', { name: 'desktop' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('B04-UI-001 applies valid local JSON and updates the draft Design Tree', async () => {
    const customInput = structuredClone(input)
    customInput.documentId = 'custom-local-design'
    customInput.source.name = 'Imported campaign'
    customInput.root.name = 'Imported Campaign Page'
    const user = userEvent.setup()
    renderApp()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Design source' }), 'local')
    fireEvent.change(screen.getByRole('textbox', { name: 'Design JSON editor' }), {
      target: { value: JSON.stringify(customInput, null, 2) }
    })
    await user.click(screen.getByRole('button', { name: 'Apply JSON' }))

    expect(screen.getByRole('status')).toHaveTextContent('Loaded custom-local-design')
    expect(screen.getByRole('treeitem', { name: /Imported Campaign Page/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate imported design' })).toBeEnabled()
  })

  it('B04-UI-002 reports invalid JSON without clearing the last successful workspace', async () => {
    generateMock.mockResolvedValue(generated)
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Generate flagship' }))
    await screen.findByRole('heading', { name: generated.plan.hero.title })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Design source' }), 'local')
    fireEvent.change(screen.getByRole('textbox', { name: 'Design JSON editor' }), {
      target: { value: '{\n  "schemaVersion": "1.0",\n  broken\n}' }
    })
    await user.click(screen.getByRole('button', { name: 'Apply JSON' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/JSON syntax error at line 3, column/)
    expect(screen.getByRole('heading', { name: generated.plan.hero.title })).toBeVisible()
    expect(screen.getByText(generated.plan.generationId)).toBeInTheDocument()
  })

  it('B04-UI-003 links Tree selection to Preview, Inspector, and Code', async () => {
    generateMock.mockResolvedValue(generated)
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Generate flagship' }))
    await screen.findByRole('heading', { name: generated.plan.hero.title })

    await user.click(screen.getByRole('treeitem', { name: /^Hero$/ }))
    const titleItem = await screen.findByRole('treeitem', { name: 'Hero Title' })
    await user.click(titleItem)

    expect(titleItem).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByText('hero-title').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: generated.plan.hero.title })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    await user.click(screen.getByRole('button', { name: 'Generated code' }))
    expect(screen.getByText('Located node hero-title in src/sections/Hero.tsx')).toBeInTheDocument()
  })

  it('B04-UI-004 links Preview selection back to Tree and Inspector', async () => {
    generateMock.mockResolvedValue(generated)
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Generate flagship' }))
    await screen.findByRole('heading', { name: generated.plan.hero.title })

    await user.click(screen.getByRole('button', { name: 'Start building' }))

    expect(await screen.findByRole('treeitem', { name: 'Primary CTA' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByText('hero-primary-action')).toBeInTheDocument()
    expect(screen.getByText('exact-component')).toBeInTheDocument()
  })

  it('B04-UI-005 navigates from a node diagnostic to matching context', async () => {
    const degradedInput = structuredClone(input)
    const action = degradedInput.root.children[0]!.children![3]!
    action.componentKey = 'external.unknown'
    action.semantic = 'unknown-widget'
    const degraded = generateDesign({ input: degradedInput, registry })
    generateMock.mockResolvedValue(degraded)
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Generate flagship' }))
    await screen.findByRole('heading', { name: degraded.plan.hero.title })

    await user.click(screen.getByRole('button', { name: /COMPONENT_MANUAL_REVIEW/ }))

    expect(await screen.findByRole('treeitem', { name: 'Primary CTA' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getAllByText('COMPONENT_MANUAL_REVIEW').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Select a registered component/).length).toBeGreaterThan(0)
  })

  it('B04-UI-006 preserves viewport and node selection across Code navigation', async () => {
    generateMock.mockResolvedValue(generated)
    const user = userEvent.setup()
    const { container } = renderApp()
    await user.click(screen.getByRole('button', { name: 'Generate flagship' }))
    await screen.findByRole('heading', { name: generated.plan.hero.title })
    await user.click(screen.getByRole('button', { name: 'mobile' }))
    await user.click(screen.getByRole('button', { name: 'Start building' }))
    await user.click(screen.getByRole('button', { name: 'Generated code' }))
    await user.click(screen.getByRole('button', { name: 'Preview' }))

    expect(container.querySelector('.previewFrame')).toHaveClass('previewFrame--mobile')
    expect(screen.getByRole('button', { name: 'Start building' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'mobile' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('B04-UI-007 prevents duplicate generation while a request is pending', async () => {
    generateMock.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Generate flagship' }))
    const runButton = await screen.findByRole('button', { name: 'Running' })
    expect(runButton).toBeDisabled()
    await user.click(runButton)

    expect(generateMock).toHaveBeenCalledTimes(1)
  })

  it('B04-UI-008 retains the last success across an Engine failure and recovers on retry', async () => {
    generateMock
      .mockResolvedValueOnce(generated)
      .mockRejectedValueOnce(
        Object.assign(new Error('REGISTRY_INVALID: Updated Registry is unsafe.'), {
          requestId: 'request-b04-8'
        })
      )
      .mockResolvedValueOnce(generated)
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Generate flagship' }))
    await screen.findByRole('heading', { name: generated.plan.hero.title })

    await user.click(screen.getByRole('button', { name: 'Run pipeline' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('request-b04-8')
    expect(screen.getByRole('heading', { name: generated.plan.hero.title })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(generateMock).toHaveBeenCalledTimes(3)
  })

  it('B04-UI-009 requires an explicit known Registry before generation', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Component Registry' }), '')

    expect(screen.getByRole('button', { name: 'Generate flagship' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Run pipeline' })).toBeDisabled()
    expect(screen.getByText('Not selected')).toBeInTheDocument()
  })

  it('B04-A11Y-001 supports arrow navigation and keyboard selection in the Tree', async () => {
    const user = userEvent.setup()
    renderApp()
    const root = screen.getByRole('treeitem', { name: 'AI SaaS Landing Page' })
    root.focus()

    await user.keyboard('{ArrowDown}')
    const hero = screen.getByRole('treeitem', { name: 'Hero' })
    expect(hero).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    await screen.findByRole('treeitem', { name: 'Hero Eyebrow' })
    await user.keyboard('{ArrowDown}{Enter}')

    expect(screen.getByRole('treeitem', { name: 'Hero Eyebrow' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  it('B04-INT-001 sends an imported non-flagship Design through the Engine contract', async () => {
    const customInput = structuredClone(input)
    customInput.documentId = 'custom-engine-design'
    customInput.source.name = 'Custom Engine Design'
    const titleNode = customInput.root.children[0]!.children![1]!
    if (titleNode.content?.kind === 'text') titleNode.content.value = 'A custom imported headline.'
    generateMock.mockImplementation(async (request) =>
      generateDesign(request, '2026-08-01T00:00:00.000Z')
    )
    const user = userEvent.setup()
    renderApp()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Design source' }), 'local')
    fireEvent.change(screen.getByRole('textbox', { name: 'Design JSON editor' }), {
      target: { value: JSON.stringify(customInput) }
    })
    await user.click(screen.getByRole('button', { name: 'Apply JSON' }))
    await user.click(screen.getByRole('button', { name: 'Generate imported design' }))

    expect(
      await screen.findByRole('heading', { name: 'A custom imported headline.' })
    ).toBeVisible()
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ documentId: 'custom-engine-design' })
      })
    )
  })
})
