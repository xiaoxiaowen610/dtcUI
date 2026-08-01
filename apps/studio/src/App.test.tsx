// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import input from '../../../presets/saas/input.json'
import registry from '../../../presets/saas/registry.json'
import { generateDesign } from '../../engine/src/pipeline'
import App from './App'
import { generateFlagship } from './services/engine'
import { useWorkspaceStore } from './stores/workspace'

vi.mock('./services/engine', () => ({ generateFlagship: vi.fn() }))

const generated = generateDesign({ input, registry }, '2026-08-01T00:00:00.000Z')
const generateMock = vi.mocked(generateFlagship)

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
  useWorkspaceStore.setState({
    device: 'desktop',
    activeTab: 'preview',
    selectedFile: 'src/sections/Hero.tsx'
  })
})

afterEach(() => {
  cleanup()
})

describe('ForgeUI Studio', () => {
  it('UI-001 renders the pre-generation workspace and empty Inspector', () => {
    renderApp()

    expect(screen.getByText('Pulse AI')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Generation pipeline' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate flagship' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Awaiting input')).toBeInTheDocument()
    expect(screen.getByText('No generation')).toBeInTheDocument()
  })

  it('UI-002 generates and displays the preview, mapping count and connection state', async () => {
    generateMock.mockResolvedValue(generated)
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /Generate flagship/ }))

    expect(await screen.findByRole('heading', { name: generated.plan.hero.title })).toBeVisible()
    expect(screen.getByText('3/3')).toBeInTheDocument()
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

    expect(screen.getByText(/--color-brand-primary: #7c5cff/)).toBeInTheDocument()
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
})
