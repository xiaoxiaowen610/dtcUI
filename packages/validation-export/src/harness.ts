import type { GeneratedFile, GeneratedProject, GenerationDiagnostic } from '@forge-ui/contracts'
import { stableHash } from '@forge-ui/shared'
import {
  FIXED_VIEWPORTS,
  FIXED_VISUAL_ENVIRONMENT,
  RUNTIME_BRIDGE_VERSION,
  ValidationExportError,
  type ValidationCheckName,
  type ValidationCheckResult,
  type ValidationEnvironment,
  type ValidationJobState,
  type ValidationReport
} from './types'

const allowedTransitions: Record<ValidationJobState, ReadonlySet<ValidationJobState>> = {
  queued: new Set(['running', 'cancelled']),
  running: new Set(['succeeded', 'failed', 'cancelled']),
  succeeded: new Set(['failed']),
  failed: new Set(),
  cancelled: new Set()
}

export function canTransitionValidationJob(
  from: ValidationJobState,
  to: ValidationJobState
): boolean {
  return allowedTransitions[from].has(to)
}

export function transitionValidationJob(
  from: ValidationJobState,
  to: ValidationJobState
): ValidationJobState {
  if (!canTransitionValidationJob(from, to)) {
    throw new ValidationExportError(
      'VALIDATION_STATE_INVALID',
      `Validation job cannot transition from ${from} to ${to}.`,
      409
    )
  }
  return to
}

export function generationDiagnostic(
  code: string,
  severity: GenerationDiagnostic['severity'],
  message: string,
  blocking: boolean,
  suggestedActions: string[]
): GenerationDiagnostic {
  return {
    code,
    stage: 'validation',
    severity,
    message,
    blocking,
    suggestedActions
  }
}

function safeFilePath(path: string): boolean {
  if (path.length === 0 || path.includes('\0') || path.includes('\\')) return false
  if (path.startsWith('/') || /^[a-zA-Z]:/.test(path)) return false
  const parts = path.split('/')
  return parts.every((part) => part.length > 0 && part !== '.' && part !== '..')
}

export function assertSafeExportEntries(entries: ReadonlyArray<{ path: string }>): void {
  const paths = new Set<string>()
  for (const entry of entries) {
    if (!safeFilePath(entry.path)) {
      throw new ValidationExportError(
        'EXPORT_PATH_INVALID',
        `Unsafe export path rejected: ${entry.path}`
      )
    }
    if (paths.has(entry.path)) {
      throw new ValidationExportError(
        'EXPORT_PATH_DUPLICATE',
        `Duplicate export path rejected: ${entry.path}`
      )
    }
    paths.add(entry.path)
  }
}

function requiredFile(project: GeneratedProject, path: string): GeneratedFile | undefined {
  return project.files.find((candidate) => candidate.path === path)
}

function validateSchema(project: GeneratedProject): {
  passed: boolean
  diagnostics: GenerationDiagnostic[]
  details: Record<string, unknown>
} {
  const diagnostics: GenerationDiagnostic[] = []
  const requiredPaths = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'src/main.tsx',
    'src/LandingPage.tsx',
    'src/sections/Hero.tsx'
  ]

  try {
    assertSafeExportEntries(project.files)
  } catch (error) {
    diagnostics.push(
      generationDiagnostic(
        error instanceof ValidationExportError ? error.code : 'PROJECT_PATH_INVALID',
        'error',
        error instanceof Error ? error.message : 'Generated project contains an unsafe path.',
        true,
        ['Regenerate the project with normalized relative output paths.']
      )
    )
  }

  const duplicateHashes = project.files.filter((file) => stableHash(file.content) !== file.contentHash)
  if (duplicateHashes.length > 0) {
    diagnostics.push(
      generationDiagnostic(
        'GENERATED_FILE_HASH_MISMATCH',
        'error',
        `${duplicateHashes.length} generated file hashes do not match their content.`,
        true,
        ['Regenerate the output and do not mutate generated files before validation.']
      )
    )
  }

  const missing = requiredPaths.filter((path) => !requiredFile(project, path))
  if (missing.length > 0) {
    diagnostics.push(
      generationDiagnostic(
        'GENERATED_PROJECT_INCOMPLETE',
        'error',
        `Generated project is missing required files: ${missing.join(', ')}.`,
        true,
        ['Regenerate the project before validation.']
      )
    )
  }

  return {
    passed: diagnostics.every((diagnostic) => !diagnostic.blocking),
    diagnostics,
    details: { fileCount: project.files.length, requiredPaths, missing }
  }
}

function validateTypeScript(project: GeneratedProject): {
  passed: boolean
  diagnostics: GenerationDiagnostic[]
  details: Record<string, unknown>
} {
  const diagnostics: GenerationDiagnostic[] = []
  const sourceFiles = project.files.filter(
    (file) => file.language === 'tsx' || file.language === 'typescript'
  )
  const unresolved = sourceFiles.filter((file) =>
    /(?:<<<<<<<|=======|>>>>>>>|TODO\(blocking\)|@ts-ignore)/.test(file.content)
  )
  const missingNodeIds = sourceFiles.filter(
    (file) => file.path.includes('/sections/') && !file.content.includes('data-forge-node-id')
  )

  if (unresolved.length > 0) {
    diagnostics.push(
      generationDiagnostic(
        'TYPESCRIPT_UNRESOLVED_MARKER',
        'error',
        `Unresolved TypeScript markers were found in ${unresolved.map((file) => file.path).join(', ')}.`,
        true,
        ['Resolve merge markers and blocking suppressions before export.']
      )
    )
  }

  if (missingNodeIds.length > 0) {
    diagnostics.push(
      generationDiagnostic(
        'NODE_ID_TRACEABILITY_MISSING',
        'warning',
        `Generated sections lack stable node IDs: ${missingNodeIds.map((file) => file.path).join(', ')}.`,
        false,
        ['Preserve data-forge-node-id attributes for Studio traceability.']
      )
    )
  }

  return {
    passed: diagnostics.every((diagnostic) => !diagnostic.blocking),
    diagnostics,
    details: {
      sourceFiles: sourceFiles.length,
      unresolvedFiles: unresolved.map((file) => file.path)
    }
  }
}

function validateBuildContract(project: GeneratedProject): {
  passed: boolean
  diagnostics: GenerationDiagnostic[]
  details: Record<string, unknown>
} {
  const diagnostics: GenerationDiagnostic[] = []
  const packageFile = requiredFile(project, 'package.json')
  let packageJson: Record<string, unknown> | undefined
  if (packageFile) {
    try {
      packageJson = JSON.parse(packageFile.content) as Record<string, unknown>
    } catch {
      diagnostics.push(
        generationDiagnostic(
          'BUILD_PACKAGE_JSON_INVALID',
          'error',
          'Generated package.json is not valid JSON.',
          true,
          ['Regenerate package metadata.']
        )
      )
    }
  }

  const scripts = packageJson?.scripts
  const hasBuildScript =
    scripts !== null &&
    typeof scripts === 'object' &&
    typeof (scripts as Record<string, unknown>).build === 'string'
  if (!hasBuildScript) {
    diagnostics.push(
      generationDiagnostic(
        'BUILD_SCRIPT_MISSING',
        'error',
        'Generated project does not expose a build script.',
        true,
        ['Add a deterministic build script to the generated package.']
      )
    )
  }

  return {
    passed: diagnostics.every((diagnostic) => !diagnostic.blocking),
    diagnostics,
    details: {
      hasBuildScript,
      hasViteConfig: Boolean(requiredFile(project, 'vite.config.ts')),
      hasIndexHtml: Boolean(requiredFile(project, 'index.html'))
    }
  }
}

export function nodeIdsInProject(project: GeneratedProject): string[] {
  const ids = new Set<string>()
  for (const file of project.files) {
    for (const match of file.content.matchAll(/data-forge-node-id=["']([^"']+)["']/g)) {
      const id = match[1]
      if (id) ids.add(id)
    }
  }
  return [...ids].sort()
}

async function validateRuntime(
  project: GeneratedProject,
  environment: ValidationEnvironment
): Promise<{
  passed: boolean
  diagnostics: GenerationDiagnostic[]
  details: Record<string, unknown>
}> {
  if (environment.runtimeProbe) {
    const probe = await environment.runtimeProbe(project)
    return {
      passed: probe.passed,
      diagnostics: probe.errors.map((message) =>
        generationDiagnostic(
          'RUNTIME_EXECUTION_FAILED',
          'error',
          message,
          true,
          ['Inspect the isolated Preview runtime error and regenerate or patch the output.']
        )
      ),
      details: {
        selectedNodeIds: probe.selectedNodeIds,
        ...(probe.details ?? {})
      }
    }
  }

  const main = requiredFile(project, 'src/main.tsx')
  const landing = requiredFile(project, 'src/LandingPage.tsx')
  const nodeIds = nodeIdsInProject(project)
  const errors: string[] = []
  if (!main?.content.includes("document.getElementById('root')")) {
    errors.push('Generated runtime does not resolve the required #root mount point.')
  }
  if (!landing?.content.includes('<main>')) {
    errors.push('Generated runtime does not render a semantic main landmark.')
  }
  if (nodeIds.length === 0) {
    errors.push('Generated runtime exposes no selectable stable node IDs.')
  }

  return {
    passed: errors.length === 0,
    diagnostics: errors.map((message) =>
      generationDiagnostic(
        'RUNTIME_CONTRACT_FAILED',
        'error',
        message,
        true,
        ['Regenerate the project and preserve the runtime mount and node bridge contracts.']
      )
    ),
    details: { mode: 'deterministic-runtime-contract', selectableNodeIds: nodeIds }
  }
}

function validateLayout(project: GeneratedProject): {
  passed: boolean
  diagnostics: GenerationDiagnostic[]
  details: Record<string, unknown>
} {
  const diagnostics: GenerationDiagnostic[] = []
  const heroCss = requiredFile(project, 'src/sections/Hero.module.css')?.content ?? ''
  const globalCss = requiredFile(project, 'src/global.css')?.content ?? ''
  const hero = requiredFile(project, 'src/sections/Hero.tsx')?.content ?? ''
  const hasResponsiveBreakpoint = /@media\s*\(max-width:\s*800px\)/.test(heroCss)
  const guardsHorizontalOverflow = /overflow:\s*hidden/.test(heroCss)
  const hasMobileFloor = /min-width:\s*320px/.test(globalCss)
  const heroVisible = /<section/.test(hero) && !/hidden=/.test(hero)

  if (!hasResponsiveBreakpoint || !guardsHorizontalOverflow || !hasMobileFloor || !heroVisible) {
    diagnostics.push(
      generationDiagnostic(
        'LAYOUT_ASSERTION_FAILED',
        'error',
        'Generated layout does not satisfy the fixed responsive and visibility assertions.',
        true,
        ['Ensure the Hero is visible and responsive at 390, 768, and 1440 pixel viewports.']
      )
    )
  }

  const assertions = FIXED_VIEWPORTS.map((width) => ({
    width,
    criticalHorizontalOverflow: false,
    heroVisible,
    responsiveRuleApplied: width <= 800 ? hasResponsiveBreakpoint : true
  }))

  return {
    passed: diagnostics.length === 0,
    diagnostics,
    details: { viewports: assertions }
  }
}

function validateAccessibility(project: GeneratedProject): {
  passed: boolean
  diagnostics: GenerationDiagnostic[]
  details: Record<string, unknown>
} {
  const diagnostics: GenerationDiagnostic[] = []
  const html = requiredFile(project, 'index.html')?.content ?? ''
  const hero = requiredFile(project, 'src/sections/Hero.tsx')?.content ?? ''
  const assertions = {
    documentLanguage: /<html\s+lang=["'][^"']+["']/.test(html),
    documentTitle: /<title>[^<]+<\/title>/.test(html),
    mainHeading: /<h1/.test(hero),
    stableFocusStyle: /:focus-visible/.test(requiredFile(project, 'src/global.css')?.content ?? '')
  }

  const missing = Object.entries(assertions)
    .filter(([, passed]) => !passed)
    .map(([name]) => name)
  if (missing.length > 0) {
    diagnostics.push(
      generationDiagnostic(
        'ACCESSIBILITY_ASSERTION_FAILED',
        'error',
        `Blocking accessibility assertions failed: ${missing.join(', ')}.`,
        true,
        ['Restore language, title, heading, and visible keyboard focus contracts.']
      )
    )
  }

  return { passed: missing.length === 0, diagnostics, details: assertions }
}

function validateVisual(
  project: GeneratedProject,
  environment: ValidationEnvironment
): {
  status: 'passed' | 'failed' | 'skipped'
  diagnostics: GenerationDiagnostic[]
  details: Record<string, unknown>
} {
  const browser = environment.browser
  if (!browser || !environment.currentVisualHashes) {
    return {
      status: 'skipped',
      diagnostics: [
        generationDiagnostic(
          'VISUAL_ENVIRONMENT_UNAVAILABLE',
          'info',
          'Visual comparison was skipped because a fixed browser and screenshot hashes were not provided.',
          false,
          ['Run the visual gate in the pinned browser image before approving a visual baseline.']
        )
      ],
      details: { skippedReason: 'fixed-browser-environment-unavailable' }
    }
  }

  const environmentMatches =
    browser.locale === FIXED_VISUAL_ENVIRONMENT.locale &&
    browser.timezone === FIXED_VISUAL_ENVIRONMENT.timezone &&
    browser.deviceScaleFactor === FIXED_VISUAL_ENVIRONMENT.deviceScaleFactor &&
    FIXED_VIEWPORTS.every((viewport) => browser.viewports.includes(viewport)) &&
    FIXED_VISUAL_ENVIRONMENT.fonts.every((font) => browser.fonts.includes(font))

  if (!environmentMatches) {
    return {
      status: 'skipped',
      diagnostics: [
        generationDiagnostic(
          'VISUAL_ENVIRONMENT_MISMATCH',
          'warning',
          'Visual comparison environment does not match the fixed locale, timezone, DPR, fonts, and viewports.',
          false,
          ['Use the approved fixed visual environment; do not auto-approve this run.']
        )
      ],
      details: { skippedReason: 'fixed-environment-mismatch', browser }
    }
  }

  const baseline = environment.visualBaseline
  if (!baseline) {
    return {
      status: 'failed',
      diagnostics: [
        generationDiagnostic(
          'VISUAL_BASELINE_APPROVAL_REQUIRED',
          'error',
          'Visual output has no explicitly approved baseline.',
          true,
          ['Review the screenshots and approve a baseline through the explicit approval workflow.']
        )
      ],
      details: { currentHashes: environment.currentVisualHashes, autoApproved: false }
    }
  }

  const changed = Object.entries(environment.currentVisualHashes)
    .filter(([path, hash]) => baseline.hashes[path] !== hash)
    .map(([path]) => path)
  return {
    status: changed.length === 0 ? 'passed' : 'failed',
    diagnostics:
      changed.length === 0
        ? []
        : [
            generationDiagnostic(
              'VISUAL_BASELINE_CHANGED',
              'error',
              `Unapproved visual differences were detected for: ${changed.join(', ')}.`,
              true,
              ['Review the visual diff; approve a new baseline only after human review.']
            )
          ],
    details: {
      baselineId: baseline.id,
      changed,
      autoApproved: false,
      generationId: project.manifest.generationId
    }
  }
}

function nowIso(now: () => Date): string {
  return now().toISOString()
}

async function runCheck(
  name: ValidationCheckName,
  now: () => Date,
  execute: () =>
    | Promise<{
        passed?: boolean
        status?: 'passed' | 'failed' | 'skipped'
        diagnostics: GenerationDiagnostic[]
        details: Record<string, unknown>
      }>
    | {
        passed?: boolean
        status?: 'passed' | 'failed' | 'skipped'
        diagnostics: GenerationDiagnostic[]
        details: Record<string, unknown>
      }
): Promise<ValidationCheckResult> {
  const started = now()
  try {
    const result = await execute()
    const completed = now()
    const status = result.status ?? (result.passed ? 'passed' : 'failed')
    return {
      name,
      status,
      startedAt: started.toISOString(),
      completedAt: completed.toISOString(),
      durationMs: Math.max(0, completed.getTime() - started.getTime()),
      diagnostics: result.diagnostics,
      details: result.details
    }
  } catch (error) {
    const completed = now()
    return {
      name,
      status: 'failed',
      startedAt: started.toISOString(),
      completedAt: completed.toISOString(),
      durationMs: Math.max(0, completed.getTime() - started.getTime()),
      diagnostics: [
        generationDiagnostic(
          'VALIDATION_CHECK_CRASHED',
          'error',
          error instanceof Error ? error.message : `${name} validation crashed.`,
          true,
          ['Inspect the validation job logs and retry.']
        )
      ],
      details: { crashed: true }
    }
  }
}

export async function validateGeneratedProject(
  project: GeneratedProject,
  environment: ValidationEnvironment = {}
): Promise<ValidationReport> {
  const now = environment.now ?? (() => new Date())
  const createdAt = nowIso(now)
  const checks: ValidationCheckResult[] = []
  checks.push(await runCheck('schema', now, () => validateSchema(project)))
  checks.push(await runCheck('typescript', now, () => validateTypeScript(project)))
  checks.push(await runCheck('build', now, () => validateBuildContract(project)))
  checks.push(await runCheck('runtime', now, () => validateRuntime(project, environment)))
  checks.push(await runCheck('layout', now, () => validateLayout(project)))
  checks.push(await runCheck('accessibility', now, () => validateAccessibility(project)))
  checks.push(await runCheck('visual', now, () => validateVisual(project, environment)))

  const diagnostics = checks.flatMap((check) => check.diagnostics)
  const blockingErrors = diagnostics.filter((diagnostic) => diagnostic.blocking).length
  const warnings = [
    ...project.diagnostics.filter((diagnostic) => diagnostic.severity === 'warning'),
    ...diagnostics.filter((diagnostic) => diagnostic.severity === 'warning')
  ].length
  const reasons = checks
    .filter((check) => check.status === 'failed')
    .map((check) => `${check.name} validation failed`)
  const allowed = blockingErrors === 0 && reasons.length === 0

  return {
    schemaVersion: RUNTIME_BRIDGE_VERSION,
    generationId: project.manifest.generationId,
    createdAt,
    completedAt: nowIso(now),
    environment: {
      locale: environment.browser?.locale ?? FIXED_VISUAL_ENVIRONMENT.locale,
      timezone: environment.browser?.timezone ?? FIXED_VISUAL_ENVIRONMENT.timezone,
      deviceScaleFactor:
        environment.browser?.deviceScaleFactor ?? FIXED_VISUAL_ENVIRONMENT.deviceScaleFactor,
      fonts: [...(environment.browser?.fonts ?? FIXED_VISUAL_ENVIRONMENT.fonts)],
      viewports: [...(environment.browser?.viewports ?? FIXED_VIEWPORTS)],
      browser: environment.browser ? `${environment.browser.name} ${environment.browser.version}` : null
    },
    checks,
    summary: {
      passed: checks.filter((check) => check.status === 'passed').length,
      failed: checks.filter((check) => check.status === 'failed').length,
      skipped: checks.filter((check) => check.status === 'skipped').length,
      warnings,
      blockingErrors
    },
    exportGate: {
      allowed,
      warningsRequireConfirmation: allowed && warnings > 0,
      reasons
    }
  }
}
