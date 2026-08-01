# ADR-003: Babel AST generation with TypeScript validation

Status: Accepted

## Decision

Generate TSX through Babel AST and validate the emitted project with TypeScript and Vite. Do not maintain
parallel Babel and TypeScript AST generation models.

## Rationale

Babel Types express JSX and TypeScript syntax directly and avoid unsafe string concatenation for the
structural source. TypeScript remains the authority for type correctness, not source construction.

## Consequences

Generation Plan must contain all imports, props, content, and file boundaries. Generator changes require
deterministic tests and a real generated production build.
