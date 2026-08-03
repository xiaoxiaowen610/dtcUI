import { describe, expect, it } from 'vitest'
import type { GeneratedProject } from '@forge-ui/contracts'
import { stableHash } from '@forge-ui/shared'
import {
  FIXED_VIEWPORTS,
  ValidationExportError,
  ValidationJobManager,
  approveVisualBaseline,
  assertSafeExportEntries,
  canTransitionValidationJob,
  createDeterministicZip,
  exportGeneratedProject,
  transitionValidationJob,
  validateGeneratedProject,
  validateRuntimeBridgeEvent
} from './index'

function file(
  path: string,
  language: 'json' | 'typescript' | 'tsx' | 'html' | 'css',
  content: string
) {
  return { path, language, content, contentHash: stableHash(content) }
}

function project(warning = false): GeneratedProject {
  const diagnostics = warning
    ? [
        {
          code: 'MANUAL_REVIEW',
          stage: 'validation' as const,
          severity: 'warning' as const,
          message: 'Human review recommended.',
          blocking: false,
          suggestedActions: ['Review the generated output.']
        }
      ]
    : []
  return {
    files: [
      file(
        'package.json',
        'json',
        JSON.stringify({ scripts: { build: 'vite build' }, dependencies: { react: '19.2.8' } })
      ),
      file('tsconfig.json', 'json', '{}'),
      file('vite.config.ts', 'typescript', 'export default {}\n'),
      file(
        'index.html',
        'html',
        '<!doctype html><html lang="en"><head><title>Demo</title></head><body><div id="root"></div></body></html>'
      ),
      file(
        'src/main.tsx',
        'tsx',
        "const root = document.getElementById('root')\nif (!root) throw new Error('Missing root')\n"
      ),
      file(
        'src/LandingPage.tsx',
        'tsx',
        'export default function LandingPage(){return <main><Hero /></main>}\n'
      ),
      file(
        'src/sections/Hero.tsx',
        'tsx',
        'export function Hero(){return <section data-forge-node-id="hero"><h1 data-forge-node-id="title">Demo</h1></section>}\n'
      ),
      file(
        'src/sections/Hero.module.css',
        'css',
        '.hero{overflow:hidden}@media (max-width: 800px){.hero{display:block}}\n'
      ),
      file('src/global.css', 'css', 'body{min-width:320px}:focus-visible{outline:3px solid}\n')
    ],
    manifest: {
      generationId: 'generation_test',
      createdAt: '2026-08-03T00:00:00.000Z',
      inputHash: 'input-hash',
      engineVersion: '0.1.0',
      generatorVersion: '0.1.0',
      registry: { id: 'registry', version: '1.0.0' },
      schemaVersions: { input: '1.0' },
      dependencies: { react: '19.2.8' },
      outputMode: 'standalone'
    },
    report: {
      metadata: { generationId: 'generation_test', inputHash: 'input-hash' },
      nodes: { total: 2, eligibleForComponentMatch: 1 },
      matches: { exact: 1, adapted: 0, recipes: 0, native: 0, manual: 0 },
      tokens: { total: 0, referenced: 0, reused: 0, created: 0, conflicts: 0 },
      validation: {
        schema: 'passed',
        typescript: 'pending',
        build: 'pending',
        runtime: 'skipped',
        visual: 'skipped'
      },
      diagnostics
    },
    diagnostics
  }
}

describe('Batch 05 validation and export', () => {
  it('B05-UT-001 only allows directed job state transitions', () => {
    expect(canTransitionValidationJob('queued', 'running')).toBe(true)
    expect(canTransitionValidationJob('running', 'succeeded')).toBe(true)
    expect(canTransitionValidationJob('succeeded', 'running')).toBe(false)
    expect(() => transitionValidationJob('failed', 'running')).toThrow(ValidationExportError)
  })

  it('B05-UT-002 rejects Zip Slip, absolute, Windows and duplicate paths', () => {
    for (const path of ['../secret', '/etc/passwd', 'C:/secret', 'src\\secret.ts']) {
      expect(() => assertSafeExportEntries([{ path }])).toThrowError(
        expect.objectContaining({ code: 'EXPORT_PATH_INVALID' })
      )
    }
    expect(() =>
      assertSafeExportEntries([{ path: 'src/a.ts' }, { path: 'src/a.ts' }])
    ).toThrowError(expect.objectContaining({ code: 'EXPORT_PATH_DUPLICATE' }))
  })

  it('B05-UT-003 creates deterministic ZIP bytes and export hashes', async () => {
    const generated = project()
    const report = await validateGeneratedProject(generated)
    const first = exportGeneratedProject(generated, report, { mode: 'standalone' })
    const second = exportGeneratedProject(generated, report, { mode: 'standalone' })

    expect(first.archiveHash).toBe(second.archiveHash)
    expect([...first.bytes]).toEqual([...second.bytes])
    expect(first.bytes.slice(0, 4)).toEqual(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))
  })

  it('B05-UT-004 rejects wrong bridge origin, source, version and payload', () => {
    const source = {}
    expect(
      validateRuntimeBridgeEvent(
        { origin: 'https://evil.example', source, data: {} },
        'http://127.0.0.1:4174',
        source
      ).diagnostic?.code
    ).toBe('BRIDGE_ORIGIN_REJECTED')
    expect(
      validateRuntimeBridgeEvent(
        {
          origin: 'http://127.0.0.1:4174',
          source: {},
          data: { schemaVersion: '1.0', type: 'forge:ready', payload: {} }
        },
        'http://127.0.0.1:4174',
        source
      ).diagnostic?.code
    ).toBe('BRIDGE_SOURCE_REJECTED')
    expect(
      validateRuntimeBridgeEvent(
        {
          origin: 'http://127.0.0.1:4174',
          source,
          data: { schemaVersion: '2.0', type: 'forge:ready', payload: {} }
        },
        'http://127.0.0.1:4174',
        source
      ).diagnostic?.code
    ).toBe('BRIDGE_SCHEMA_REJECTED')
    expect(
      validateRuntimeBridgeEvent(
        {
          origin: 'http://127.0.0.1:4174',
          source,
          data: { schemaVersion: '1.0', type: 'forge:node-select', payload: {} }
        },
        'http://127.0.0.1:4174',
        source
      ).diagnostic?.code
    ).toBe('BRIDGE_PAYLOAD_REJECTED')
  })

  it('runs schema, TypeScript, build, runtime, layout and accessibility checks', async () => {
    const report = await validateGeneratedProject(project())

    expect(report.exportGate.allowed).toBe(true)
    expect(report.checks.find((check) => check.name === 'runtime')?.status).toBe('passed')
    expect(report.checks.find((check) => check.name === 'layout')?.details.viewports).toEqual(
      FIXED_VIEWPORTS.map((width) => expect.objectContaining({ width, heroVisible: true }))
    )
    expect(report.checks.find((check) => check.name === 'visual')?.status).toBe('skipped')
  })

  it('requires explicit warning confirmation before export', async () => {
    const generated = project(true)
    const report = await validateGeneratedProject(generated)

    expect(report.exportGate.warningsRequireConfirmation).toBe(true)
    expect(() => exportGeneratedProject(generated, report, { mode: 'integration' })).toThrowError(
      expect.objectContaining({ code: 'EXPORT_WARNING_CONFIRMATION_REQUIRED' })
    )
    expect(
      exportGeneratedProject(generated, report, {
        mode: 'integration',
        confirmWarnings: true
      }).entries.some((entry) => entry.path === 'README.integration.md')
    ).toBe(true)
  })

  it('never auto-approves visual changes', async () => {
    const generated = project()
    const baseline = approveVisualBaseline(
      generated.manifest.generationId,
      { '390.png': 'approved' },
      'reviewer@example.com',
      '2026-08-03T00:00:00.000Z'
    )
    const report = await validateGeneratedProject(generated, {
      browser: {
        name: 'chromium',
        version: 'fixed',
        locale: 'en-US',
        timezone: 'UTC',
        deviceScaleFactor: 1,
        fonts: ['Inter', 'system-ui', 'sans-serif'],
        viewports: [390, 768, 1440]
      },
      visualBaseline: baseline,
      currentVisualHashes: { '390.png': 'changed' }
    })

    expect(report.checks.find((check) => check.name === 'visual')).toMatchObject({
      status: 'failed',
      details: { autoApproved: false }
    })
    expect(report.exportGate.allowed).toBe(false)
  })

  it('records structured job logs and runtime bridge failures', async () => {
    const manager = new ValidationJobManager()
    const created = manager.create(project(), 'request-b05')
    const completed = await manager.run(created.id)
    expect(completed.state).toBe('succeeded')
    expect(completed.logs.map((entry) => entry.event)).toContain('check.passed')

    const failed = manager.recordRuntimeError(created.id, 'Preview crashed', 'stack')
    expect(failed.state).toBe('failed')
    expect(failed.report?.exportGate.allowed).toBe(false)
  })

  it('writes a minimal deterministic ZIP without compression dependencies', () => {
    const bytes = createDeterministicZip([
      { path: 'a.txt', bytes: new TextEncoder().encode('a') },
      { path: 'b.txt', bytes: new TextEncoder().encode('b') }
    ])
    expect(bytes.length).toBeGreaterThan(100)
  })
})
