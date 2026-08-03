# ADR-006: Use stable node IDs as the Studio interaction spine

Status: Accepted

## Context

A three-panel workbench becomes unreliable when Tree selection, preview highlights, source files,
diagnostics, and Inspector context keep separate indexes or display names. Names can repeat and array
positions change after imports or future patches. Local JSON errors and Engine failures must also be
recoverable without discarding the last successful workspace.

## Decision

- The normalized Design node ID is the only cross-panel selection key.
- Workspace state stores device, active tab, node ID, generated file path, expanded node IDs, and the
  selected diagnostic key. Persisted values are reconciled against every new document/file set before use.
- Tree and Preview selections map node IDs to generated files through the Generation Plan. Generated
  Hero copy, actions, visuals, and registered Sections all emit `data-forge-node-id` markers.
- Preview and Diagnostic selection expands the selected node's Tree ancestor path. Keyboard Tree
  navigation exposes `tree`, `treeitem`, expanded, selected, and level semantics.
- Responsive layout resolves mobile-first. Higher breakpoints override only declared fields; visibility
  uses the explicit current-breakpoint value or the common visible default.
- Imported JSON is parsed and schema-validated before replacing the active draft. A failed import or
  Engine request retains the last successful result and exposes a recoverable error plus request ID.
- Registry choice is explicit. Unknown or empty Registry selection disables generation instead of
  silently choosing a package.

## Consequences

Every Studio panel can navigate deterministically without using display-name heuristics. Stale persisted
selection cannot point outside the current document, and a failed attempt never destroys reviewable
output. The current Preview is still a plan renderer; isolated runtime execution and browser validation
remain the next batch.
