# ADR-007: Validation jobs, isolated Preview and gated deterministic export

Status: accepted

## Context

ForgeUI can generate deterministic React source, but generation alone is not sufficient evidence that an artifact is safe to preview or export. Batch 05 needs independently observable validation stages, an isolated runtime boundary, a versioned postMessage bridge and reproducible export artifacts.

## Decision

1. Validation is represented as an explicit job with the states `queued`, `running`, `succeeded`, `failed` and `cancelled`. Only directed transitions are legal and every transition/check emits a structured log entry.
2. Schema, TypeScript contract, build contract, runtime, layout, accessibility and visual checks are reported independently. Runtime and layout are no longer hard-coded as skipped. Visual validation is skipped with a reason unless the fixed browser, locale, timezone, DPR, fonts and three viewports are present.
3. Preview is served by the Engine process on a second configurable origin (default `127.0.0.1:4174`). The iframe uses `sandbox="allow-scripts"`; the Preview response has a nonce CSP with `connect-src 'none'`, no forms, no objects and a restricted `frame-ancestors` Studio origin.
4. Runtime bridge messages are accepted only when origin, Window source, schema version, type and payload all match. Preview node selection synchronizes the Studio workspace; runtime errors are persisted into the validation report and close the export gate.
5. Standalone and Integration exports use a deterministic, dependency-free ZIP writer. All paths are normalized and validated before archive creation; absolute paths, traversal, Windows separators and duplicate entries are rejected.
6. Export is refused after blocking validation. Generation/validation warnings require a separate explicit confirmation. Visual changes are never auto-approved.

## Consequences

- The Preview runtime cannot make arbitrary network requests.
- Validation and export APIs are testable without a browser while browser/visual evidence remains explicitly distinguishable from deterministic contract checks.
- Repeated export of the same project/report produces the same entry list and ZIP hash.
- The current job store is in-memory and suitable for the MVP; persistent jobs and distributed workers remain a later production concern.
