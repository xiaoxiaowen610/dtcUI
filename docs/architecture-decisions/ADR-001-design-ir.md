# ADR-001: Use a versioned Design IR

Status: Accepted

## Decision

Normalize every supported input into a versioned, framework-agnostic Design IR before linting,
matching, planning, or generation.

## Rationale

Direct Design JSON-to-JSX couples source quirks to output syntax and makes matching, patches, diffs,
and tests unstable. A stable IR creates one boundary for IDs, limits, semantics, and later adapters.

## Consequences

Adapters must preserve source references and stable IDs. React, hooks, imports, and CSS classes are
forbidden in the IR. Schema migrations become explicit work instead of silent compatibility behavior.
