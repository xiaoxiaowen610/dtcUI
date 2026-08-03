import type { GeneratedProject } from '@forge-ui/contracts'
import { stableHash } from '@forge-ui/shared'
import { generationDiagnostic, transitionValidationJob, validateGeneratedProject } from './harness'
import {
  ValidationExportError,
  type ValidationCheckName,
  type ValidationEnvironment,
  type ValidationJobSnapshot,
  type ValidationLogEntry,
  type ValidationJobState
} from './types'

interface StoredValidationJob {
  snapshot: ValidationJobSnapshot
  project: GeneratedProject
}

export class ValidationJobManager {
  private readonly jobs = new Map<string, StoredValidationJob>()
  private counter = 0

  constructor(
    private readonly environment: ValidationEnvironment = {},
    private readonly now: () => Date = environment.now ?? (() => new Date())
  ) {}

  create(project: GeneratedProject, requestId: string): ValidationJobSnapshot {
    this.counter += 1
    const createdAt = this.now().toISOString()
    const id = `validation_${stableHash(`${project.manifest.generationId}:${requestId}:${this.counter}`)}`
    const snapshot: ValidationJobSnapshot = {
      id,
      requestId,
      generationId: project.manifest.generationId,
      state: 'queued',
      createdAt,
      updatedAt: createdAt,
      logs: [
        {
          sequence: 1,
          timestamp: createdAt,
          level: 'info',
          event: 'job.queued',
          message: 'Validation job queued.'
        }
      ]
    }
    this.jobs.set(id, { snapshot, project })
    return structuredClone(snapshot)
  }

  get(id: string): ValidationJobSnapshot | undefined {
    const stored = this.jobs.get(id)
    return stored ? structuredClone(stored.snapshot) : undefined
  }

  projectFor(id: string): GeneratedProject | undefined {
    return this.jobs.get(id)?.project
  }

  private appendLog(
    stored: StoredValidationJob,
    level: ValidationLogEntry['level'],
    event: string,
    message: string,
    check?: ValidationCheckName,
    details?: Record<string, unknown>
  ): void {
    const timestamp = this.now().toISOString()
    stored.snapshot.logs.push({
      sequence: stored.snapshot.logs.length + 1,
      timestamp,
      level,
      event,
      message,
      ...(check ? { check } : {}),
      ...(details ? { details } : {})
    })
    stored.snapshot.updatedAt = timestamp
  }

  async run(id: string): Promise<ValidationJobSnapshot> {
    const stored = this.jobs.get(id)
    if (!stored) {
      throw new ValidationExportError('VALIDATION_JOB_NOT_FOUND', `Validation job ${id} was not found.`, 404)
    }
    stored.snapshot.state = transitionValidationJob(stored.snapshot.state, 'running')
    this.appendLog(stored, 'info', 'job.running', 'Validation job started.')
    const report = await validateGeneratedProject(stored.project, {
      ...this.environment,
      now: this.now
    })
    stored.snapshot.report = report
    const nextState: ValidationJobState = report.exportGate.allowed ? 'succeeded' : 'failed'
    stored.snapshot.state = transitionValidationJob(stored.snapshot.state, nextState)
    for (const check of report.checks) {
      this.appendLog(
        stored,
        check.status === 'failed' ? 'error' : check.status === 'skipped' ? 'warning' : 'info',
        `check.${check.status}`,
        `${check.name} validation ${check.status}.`,
        check.name,
        check.details
      )
    }
    this.appendLog(
      stored,
      nextState === 'succeeded' ? 'info' : 'error',
      `job.${nextState}`,
      `Validation job ${nextState}.`
    )
    return structuredClone(stored.snapshot)
  }

  cancel(id: string): ValidationJobSnapshot {
    const stored = this.jobs.get(id)
    if (!stored) {
      throw new ValidationExportError('VALIDATION_JOB_NOT_FOUND', `Validation job ${id} was not found.`, 404)
    }
    stored.snapshot.state = transitionValidationJob(stored.snapshot.state, 'cancelled')
    this.appendLog(stored, 'warning', 'job.cancelled', 'Validation job cancelled.')
    return structuredClone(stored.snapshot)
  }

  recordRuntimeError(id: string, message: string, stack?: string): ValidationJobSnapshot {
    const stored = this.jobs.get(id)
    if (!stored) {
      throw new ValidationExportError('VALIDATION_JOB_NOT_FOUND', `Validation job ${id} was not found.`, 404)
    }
    if (!stored.snapshot.report) {
      throw new ValidationExportError(
        'VALIDATION_STATE_INVALID',
        'Runtime errors can only be attached after validation has produced a report.',
        409
      )
    }
    const runtime = stored.snapshot.report.checks.find((check) => check.name === 'runtime')
    if (runtime) {
      runtime.status = 'failed'
      runtime.diagnostics.push(
        generationDiagnostic(
          'RUNTIME_BRIDGE_ERROR',
          'error',
          message,
          true,
          ['Inspect the isolated Preview runtime stack and regenerate or patch the output.']
        )
      )
      runtime.details = { ...runtime.details, bridgeError: message, ...(stack ? { stack } : {}) }
    }
    stored.snapshot.report.summary.failed = stored.snapshot.report.checks.filter(
      (check) => check.status === 'failed'
    ).length
    stored.snapshot.report.summary.passed = stored.snapshot.report.checks.filter(
      (check) => check.status === 'passed'
    ).length
    stored.snapshot.report.summary.blockingErrors += 1
    stored.snapshot.report.exportGate = {
      allowed: false,
      warningsRequireConfirmation: false,
      reasons: ['runtime validation failed']
    }
    if (stored.snapshot.state === 'succeeded') {
      stored.snapshot.state = transitionValidationJob(stored.snapshot.state, 'failed')
    }
    this.appendLog(stored, 'error', 'runtime.error', message, 'runtime', stack ? { stack } : undefined)
    return structuredClone(stored.snapshot)
  }
}
