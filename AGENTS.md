# ForgeUI Agent Guide

This file is the repository-level operating contract for human and AI contributors.
Product requirements in `ForgeUI-产品文档-评审修订版(1).md` and technical decisions in
`ForgeUI-技术设计文档-评审修订版(1).md` are the source of truth. When guidance conflicts,
prefer security and deterministic generation, then the technical design, then this file.

## Product boundary

ForgeUI is a design-system-aware D2C workbench for enterprise marketing pages. It is not a
general screenshot-to-JSX tool, low-code platform, package scanner, or arbitrary code runner.

The MVP pipeline is:

```text
Design JSON -> schema validation -> Design IR -> lint/token/component resolution
-> Generation Plan -> Babel TSX AST -> validation -> preview/report/export
```

AI may propose structured patches. It must never directly rewrite generated source or bypass
schema, allowlist, version, build, or rollback checks.

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
- `packages/contracts`: versioned transport schemas and shared API types. No UI or filesystem code.
- `packages/design-ir`: input normalization and stable IDs. No React concepts.
- `packages/component-registry`: manifest validation and deterministic matching.
- `packages/generation-plan`: file/component/content planning. No source-string generation.
- `packages/code-generator`: AST-based source generation. It consumes plans, never raw prompts.
- `packages/example-external-ui`: independent example design-system package used through Registry.
- `presets`: versioned trusted examples; `evals`: fixed success, degraded, and failure cases.

Do not import from an app into a package. Domain packages may depend on `contracts`, but must not
depend on `studio` or `engine`. Keep external UI separate from ForgeUI's own workbench UI.

## Determinism and versioning

- Every public input, IR, registry, plan, patch, report, and manifest schema has an explicit version.
- The same input plus engine/registry/generator versions must produce the same source files.
- Do not place timestamps, random IDs, absolute paths, or environment-specific values in generated source.
- `createdAt` is allowed only in the generation manifest and must be injected at the boundary.
- Stable ordering is required for imports, files, diagnostics, tokens, and serialized JSON.
- A generator change requires a deterministic snapshot or integration test.

## Component and token rules

- Prefer exact registered components, then validated adapters/recipes, then semantic native elements,
  then manual review. Never guess an incompatible component.
- Validate import roots, exports, required props, variants, slots, and capabilities before matching.
- Brand colors and standard spacing belong in tokens, not component or generated CSS literals.
- Token aliases must detect cycles, missing references, and type mismatches.
- Scores are deterministic rule scores. Confidence is a calibrated label, not a fabricated probability.

## Generated-code rules

- Generate React + TypeScript + CSS Variables + CSS Modules.
- Use Babel AST for TSX; use TypeScript/Vite for validation.
- Use semantic HTML and preserve `data-forge-node-id` in development preview output.
- Deduplicate and stably sort imports. Avoid random class names and unnecessary wrapper elements.
- Keep sections independently generated when their semantics justify a file boundary.
- Do not emit dynamic imports, executable strings, lifecycle scripts, or unapproved dependencies.

## Security rules

- Treat Design JSON, registry manifests, asset metadata, text, node names, and AI output as untrusted.
- Enforce input size, node-count, depth, text-length, MIME, and schema limits before normalization.
- Never execute imported scripts or run package lifecycle scripts from user input.
- Model credentials stay in the Engine environment and never enter browser bundles, logs, or exports.
- Preview must use a separate origin, restrictive iframe sandbox, origin-checked messages, and CSP.
- Temporary build directories must be created through safe APIs and cleaned by their exact resolved path.
- On uncertainty, return a structured diagnostic and safe degradation instead of plausible-looking code.

## Testing and review

Add the narrowest relevant test and preserve these layers:

1. unit: stable IDs, schemas, resolver/matcher rules, patch guards, codegen;
2. snapshot: input -> IR -> plan -> stable generated files;
3. integration: preset + registry -> generate -> TypeScript/Vite build;
4. E2E/visual: only for fixed browser, font, locale, timezone, and viewport environments.

Never silently update visual baselines. A skipped validator must include a reason and must not count as
passed. README claims and metrics must come from committed evals or reproducible commands.

## Change discipline

- Keep each change inside one roadmap phase unless a cross-phase dependency is documented.
- Update README status, limitations, and commands when behavior changes.
- Update an ADR when changing an architecture boundary or a deliberate technology choice.
- Preserve unrelated user changes. Stage explicit paths instead of using broad staging in a mixed tree.
- Use concise conventional commits such as `feat(engine): add analyze endpoint` or
  `test(codegen): cover deterministic output`.

## Current implementation target

Phase 1 acceptance is a real, inspectable vertical slice:

- versioned contracts and AI SaaS input;
- deterministic Design IR and stable IDs;
- minimal external Registry and exact component match;
- Generation Plan -> Babel AST -> readable TSX;
- localhost Node Engine and React Studio;
- generated Hero output that passes TypeScript and a real Vite production build.

Later-phase APIs may be stubbed only when they fail explicitly with a documented `skipped` or
`not implemented` status. Do not present a placeholder as completed MVP behavior.
