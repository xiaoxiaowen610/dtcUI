# Batch 00 — Composer Contracts

## Goal

Define the renderer-neutral language used by ForgeUI V1 before Canvas or AI implementation begins.

Page Schema is the single source of truth. Canvas, Layers, Inspector, AI tools, history and Codegen must never maintain competing document trees.

## Scope

This batch introduces versioned contracts for:

- Page / Node schema
- constrained Layout and responsive values
- token-based node style values
- Composer Registry metadata
- slot acceptance/cardinality metadata
- Inspector metadata
- AI component metadata
- Style Kit contracts
- schema Operations shared by user and AI edits

The existing Design Input / Design IR contracts remain unchanged so the current deterministic generation pipeline keeps working.

## Important decisions

### Composer contracts extend, not replace, legacy D2C input contracts

The existing `RawDesignNode` and `DesignDocument` describe imported design input and normalized IR. `ComposerPage` describes an editable product document. They have different lifecycle requirements and should not be forced into one type.

### No React concepts in Composer contracts

Composer schemas describe semantic component types such as `product-grid` and `commerce-hero`. They do not contain React components, DOM tags, class names or editor-engine-specific fields.

### Responsive Web first

V1 supports `mobile`, `tablet`, and `desktop` responsive values. The schema is renderer-neutral, while V1 code generation remains React Web only.

### Constrained layout

V1 layout supports block/flex/grid flow and up to four grid columns. Arbitrary x/y positioning is intentionally absent.

### Human and AI edits share the same operation protocol

Canvas drag, Inspector edits and AI tools will all map to the same operation types (`insert`, `remove`, `move`, `update-*`, `apply-style-kit`).

## Deliverables

- `packages/contracts/src/composer.ts`
- `packages/contracts/src/composer.test.ts`
- package subpath export `@forge-ui/contracts/composer`
- V1 product plan and Batch 00 test plan

## Follow-up

Batch 1 will build the Forge Design System against these contracts. Runtime mutation/application logic will be extracted into a dedicated Composer core package when Canvas integration requires it, instead of prematurely creating workspace packages in Batch 0.
