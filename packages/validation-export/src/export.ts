import type { GeneratedProject } from '@forge-ui/contracts'
import { stableHash, stableStringify } from '@forge-ui/shared'
import { assertSafeExportEntries } from './harness'
import {
  ValidationExportError,
  type ExportMode,
  type ExportResult,
  type ValidationReport
} from './types'

export interface ZipEntry {
  path: string
  bytes: Uint8Array
}

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true)
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true)
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((total, part) => total + part.length, 0)
  const output = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

export function createDeterministicZip(entries: ZipEntry[]): Uint8Array {
  assertSafeExportEntries(entries)
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0
  const sorted = [...entries].sort((left, right) => left.path.localeCompare(right.path))

  for (const entry of sorted) {
    const name = encoder.encode(entry.path)
    const checksum = crc32(entry.bytes)
    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    writeUint32(localView, 0, 0x04034b50)
    writeUint16(localView, 4, 20)
    writeUint16(localView, 6, 0x0800)
    writeUint16(localView, 8, 0)
    writeUint16(localView, 10, 0)
    writeUint16(localView, 12, 0x0021)
    writeUint32(localView, 14, checksum)
    writeUint32(localView, 18, entry.bytes.length)
    writeUint32(localView, 22, entry.bytes.length)
    writeUint16(localView, 26, name.length)
    writeUint16(localView, 28, 0)
    local.set(name, 30)
    localParts.push(local, entry.bytes)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    writeUint32(centralView, 0, 0x02014b50)
    writeUint16(centralView, 4, 20)
    writeUint16(centralView, 6, 20)
    writeUint16(centralView, 8, 0x0800)
    writeUint16(centralView, 10, 0)
    writeUint16(centralView, 12, 0)
    writeUint16(centralView, 14, 0x0021)
    writeUint32(centralView, 16, checksum)
    writeUint32(centralView, 20, entry.bytes.length)
    writeUint32(centralView, 24, entry.bytes.length)
    writeUint16(centralView, 28, name.length)
    writeUint16(centralView, 30, 0)
    writeUint16(centralView, 32, 0)
    writeUint16(centralView, 34, 0)
    writeUint16(centralView, 36, 0)
    writeUint32(centralView, 38, 0)
    writeUint32(centralView, 42, offset)
    central.set(name, 46)
    centralParts.push(central)
    offset += local.length + entry.bytes.length
  }

  const centralDirectory = concatBytes(centralParts)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  writeUint32(endView, 0, 0x06054b50)
  writeUint16(endView, 4, 0)
  writeUint16(endView, 6, 0)
  writeUint16(endView, 8, sorted.length)
  writeUint16(endView, 10, sorted.length)
  writeUint32(endView, 12, centralDirectory.length)
  writeUint32(endView, 16, offset)
  writeUint16(endView, 20, 0)
  return concatBytes([...localParts, centralDirectory, end])
}

function stripTemporalFields(report: ValidationReport): Record<string, unknown> {
  return {
    schemaVersion: report.schemaVersion,
    generationId: report.generationId,
    environment: report.environment,
    checks: report.checks.map((check) => ({
      name: check.name,
      status: check.status,
      diagnostics: check.diagnostics,
      details: check.details
    })),
    summary: report.summary,
    exportGate: report.exportGate
  }
}

export function exportGeneratedProject(
  project: GeneratedProject,
  report: ValidationReport,
  options: { mode: ExportMode; confirmWarnings?: boolean }
): ExportResult {
  if (!report.exportGate.allowed) {
    throw new ValidationExportError(
      'EXPORT_VALIDATION_BLOCKED',
      `Export blocked: ${report.exportGate.reasons.join('; ') || 'validation failed'}.`,
      409
    )
  }
  if (report.exportGate.warningsRequireConfirmation && options.confirmWarnings !== true) {
    throw new ValidationExportError(
      'EXPORT_WARNING_CONFIRMATION_REQUIRED',
      'Export contains validation or generation warnings and requires explicit confirmation.',
      409
    )
  }

  const encoder = new TextEncoder()
  const manifest = {
    ...project.manifest,
    outputMode: options.mode,
    validation: {
      schemaVersion: report.schemaVersion,
      summary: report.summary,
      exportGate: report.exportGate
    }
  }
  const exportFiles =
    options.mode === 'standalone'
      ? project.files
      : project.files.filter(
          (file) =>
            file.path.startsWith('src/') ||
            file.path === 'tsconfig.json' ||
            file.path === 'vite.config.ts'
        )
  const entries: ZipEntry[] = exportFiles.map((file) => ({
    path: file.path,
    bytes: encoder.encode(file.content)
  }))
  entries.push(
    {
      path: 'forge/manifest.json',
      bytes: encoder.encode(`${stableStringify(manifest, 2)}\n`)
    },
    {
      path: 'forge/validation-report.json',
      bytes: encoder.encode(`${stableStringify(stripTemporalFields(report), 2)}\n`)
    },
    {
      path: 'forge/dependencies.json',
      bytes: encoder.encode(`${stableStringify(project.manifest.dependencies, 2)}\n`)
    }
  )
  if (options.mode === 'integration') {
    entries.push({
      path: 'README.integration.md',
      bytes: encoder.encode(
        '# ForgeUI Integration Export\n\nCopy `src/` into the host application, install the dependencies in `forge/dependencies.json`, and preserve the validation report with the change.\n'
      )
    })
  }
  assertSafeExportEntries(entries)
  const bytes = createDeterministicZip(entries)
  const resultEntries = entries
    .map((entry) => ({
      path: entry.path,
      contentHash: stableHash(new TextDecoder().decode(entry.bytes)),
      size: entry.bytes.length
    }))
    .sort((left, right) => left.path.localeCompare(right.path))
  const archiveHash = stableHash(Array.from(bytes).join(','))
  return {
    mode: options.mode,
    filename: `forgeui-${project.manifest.generationId}-${options.mode}.zip`,
    mimeType: 'application/zip',
    bytes,
    entries: resultEntries,
    archiveHash
  }
}
