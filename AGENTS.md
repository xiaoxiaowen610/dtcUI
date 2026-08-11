# ForgeUI Agent Guide

This file is the repository-level operating contract for human and AI contributors.
For V1 work, `docs/v1/PRODUCT-PLAN.md` and the active batch design under `docs/v1/batches/` are the source of truth. Existing product/technical review documents remain historical design input for the deterministic D2C engine. When guidance conflicts, prefer security and deterministic generation, then the active V1 batch design, then this file.

## Product boundary

ForgeUI V1 is an AI-native visual page composer and Design-to-Code platform for high-quality domestic marketing and campaign pages. It is not a pixel-level Figma replacement, generic CRUD low-code platform, package scanner, or arbitrary code runner.

The V1 product loop is:

```text
Template / Prompt -> Composer Page Schema -> Visual Canvas / AI Operations
-> Registry + Design Token mapping -> deterministic generation
-> React + TypeScript preview / validation / export
```

The existing deterministic D2C pipeline remains reusable infrastructure:

```text
Design JSON -> schema validation -> Design IR -> lint/token/component resolution
-> Generation Plan -> Babel TSX AST -> validation -> preview/report/export
```

AI may propose structured page plans and operations. It must never directly rewrite generated source or bypass schema, registry, allowlist, version, build, validation, or rollback checks.

## Repository commands

Use pnpm from the repository root.

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm validate:flagship
pnpm check
```

`pnpm check` is the minimum definition-of-done gate for code changes.

## Architecture boundaries

- `apps/studio`: React workbench UI and browser-only interaction state.
- `apps/engine`: localhost-only Fastify API, generation jobs, validation, export, and AI gateway.
- `packages/contracts`: versioned transport schemas and shared API types, including Composer contracts. No UI or filesystem code.
- `packages/design-ir`: imported-design normalization and stable IDs. No React concepts.
- `packages/component-registry`: manifest validation and deterministic matching.
- `packages/generation-plan`: file/component/content planning. No source-string generation.
- `packages/code-generator`: AST-based source generation. It consumes plans, never raw prompts.
- `packages/example-external-ui`: independent example design-system package used through Registry.
- `presets`: versioned trusted examples; `evals`: fixed success, degraded, and failure cases.

Do not import from an app into a package. Domain packages may depend on `contracts`, but must not depend on `studio` or `engine`. Keep external UI separate from ForgeUI's own workbench UI.

Composer-specific rules:

- Composer Page Schema is the single document source of truth for Canvas, Layers, Inspector, AI and future Composer Codegen.
- Editor-only state such as selection, hover, panel visibility, zoom, and drag state must not enter Page Schema.
- Third-party editor engine fields must stay behind an adapter boundary and must not leak into Composer contracts.
- V1 layout is flow-based and constrained. Avoid arbitrary absolute x/y page composition.
- Human edits and AI edits must converge on the same versioned operation protocol.

## Determinism and versioning

- Every public input, Composer document, IR, registry, plan, operation, patch, report, and manifest schema has an explicit version.
- The same input plus engine/registry/generator versions must produce the same generated source files.
- Do not place timestamps, random IDs, absolute paths, or environment-specific values in generated source.
- `createdAt` is allowed only in the generation manifest and must be injected at the boundary.
- Composer node IDs must remain stable across move/prop/style edits. Creation/duplication may allocate new IDs before the document enters deterministic generation.
- Stable ordering is required for imports, files, diagnostics, tokens, and serialized generated JSON.
- A generator change requires a deterministic snapshot or integration test.

## Component and token rules

- Prefer exact registered components, then validated adapters/recipes, then semantic native elements, then manual review. Never guess an incompatible component.
- Validate import roots, exports, required props, variants, slots, capabilities, and Composer drop rules before matching or inserting.
- Brand colors and standard spacing belong in tokens, not component or generated CSS literals.
- Token aliases must detect cycles, missing references, and type mismatches.
- Scores are deterministic rule scores. Confidence is a calibrated label, not a fabricated probability.
- High-level marketing Blocks are first-class V1 assets; avoid forcing AI to rebuild standard sections from arbitrary primitives on every generation.

## Generated-code rules

- Generate React + TypeScript + CSS Variables + CSS Modules in V1.
- Use Babel AST for TSX; use TypeScript/Vite for validation.
- Use semantic HTML and preserve `data-forge-node-id` in development preview output.
- Deduplicate and stably sort imports. Avoid random class names and unnecessary wrapper elements.
- Keep sections independently generated when their semantics justify a file boundary.
- Do not emit dynamic imports, executable strings, lifecycle scripts, or unapproved dependencies.
- V1 supports responsive Web output (mobile/tablet/desktop), not React Native, Mini Program, Flutter, or Vue renderers.

## Security rules

- Treat Design JSON, Composer schema, registry manifests, asset metadata, text, node names, and AI output as untrusted.
- Enforce input size, node-count, depth, text-length, MIME, and schema limits before normalization or document application.
- Never execute imported scripts or run package lifecycle scripts from user input.
- Model credentials stay in the Engine environment and never enter browser bundles, logs, or exports.
- Preview must use a separate origin, restrictive iframe sandbox, origin-checked messages, and CSP.
- Temporary build directories must be created through safe APIs and cleaned by their exact resolved path.
- On uncertainty, return a structured diagnostic and safe degradation instead of plausible-looking code.

## Testing and review

Add the narrowest relevant test and preserve these layers:

1. unit: stable IDs, schemas, operation guards, resolver/matcher rules, patch guards, codegen;
2. snapshot: input -> IR/Composer mapping -> plan -> stable generated files;
3. integration: preset/page schema + registry -> generate -> TypeScript/Vite build;
4. E2E/visual: fixed browser, font, locale, timezone, and viewport environments only.

Never silently update visual baselines. A skipped validator must include a reason and must not count as passed. README claims and metrics must come from committed evals or reproducible commands.

## Change discipline

- Keep each change inside one V1 batch unless a cross-batch dependency is documented.
- Update README/status docs when behavior changes materially.
- Update an ADR when changing an architecture boundary or a deliberate technology choice.
- Preserve unrelated user changes. Stage explicit paths instead of using broad staging in a mixed tree.
- Use concise conventional commits such as `feat(contracts): add composer page schema` or `test(codegen): cover deterministic output`.
- Default to a branch + draft PR workflow. Do not merge a batch until its quality gates are green and review findings are addressed.

## Current implementation target

The active V1 target is Batch 00 — Composer Contracts.

Acceptance for this batch:

- a versioned renderer-neutral Composer Page Schema;
- stable semantic nodes with children and named slots;
- constrained responsive layout for mobile/tablet/desktop;
- token-oriented node styles and versioned Style Kit metadata;
- Composer Registry metadata for Canvas, Inspector and AI;
- one operation protocol shared by future user and AI edits;
- focused unit tests that reject invalid roots, duplicate IDs, invalid slot cardinality and unsupported layout values;
- no regression to the existing Design Input -> IR -> Registry -> Generation Plan -> AST pipeline.

Later-batch APIs may be stubbed only when they fail explicitly with a documented `skipped` or `not implemented` status. Do not present a placeholder as completed V1 behavior.
