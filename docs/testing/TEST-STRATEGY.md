# ForgeUI Phase 1 Test Strategy

## 1. Objective

Verify that the Phase 1 vertical slice is not merely renderable, but deterministic, explainable,
safe on invalid input, contract-compatible across Studio and Engine, and buildable as generated code.

The strategy follows the repository trust model:

```text
untrusted input
-> runtime schema
-> Design IR limits and stable IDs
-> Registry allowlist and prop compatibility
-> deterministic Generation Plan
-> AST code generation
-> TypeScript and Vite validation
-> Studio presentation
```

## 2. Scope

Automated in this phase:

- pure utility and runtime-schema unit tests;
- Design IR normalization, limits, ordering, and lookup;
- Registry validation, exact match, prop compatibility, and manual-review degradation;
- Generation Plan success, failure, import, action, visual, and diagnostic behavior;
- generated-file determinism, escaping, ordering, token boundaries, and manifest/report behavior;
- Engine business pipeline and Fastify API contract tests;
- Studio initial, pending, success, error, preview, code, file-selection, and device interactions;
- generated TypeScript and real Vite production build;
- Engine and Studio production builds.

Explicitly out of the Phase 1 pass rate:

- Playwright screenshot baselines and pixel diffs;
- real-browser layout overlap/overflow assertions;
- isolated-origin iframe/CSP validation;
- AI Patch, rollback, ZIP export, and IndexedDB history;
- performance P95 claims on fixed reference hardware.

Those features remain Phase 4/5 work and are recorded as `not implemented`, not `passed`.

## 3. Test layers

| Layer       | Purpose                                      | Tool                    | Gate         |
| ----------- | -------------------------------------------- | ----------------------- | ------------ |
| Unit        | Pure functions, schemas, guards, serializers | Vitest                  | Every change |
| Business    | IR -> Registry -> Plan -> Codegen behavior   | Vitest                  | Every change |
| API         | Fastify request/response/error/CORS contract | Fastify inject + Vitest | Every change |
| UI          | User-visible Studio states and interactions  | Testing Library + jsdom | Every change |
| Integration | Flagship end-to-end in process               | Vitest                  | Every change |
| Build       | Generated TypeScript and production bundles  | TypeScript + Vite       | Every change |
| Visual E2E  | Fixed browser screenshots/layout             | Playwright              | Phase 4 only |

## 4. Prioritization

- P0: security boundary, deterministic output, schema/limit rejection, exact matching, generation,
  Engine API, Studio generation success/error, generated build.
- P1: sorting, metadata fallbacks, optional props, file selection, device switching, CORS.
- P2: visual polish, browser-specific layout, timing distributions, accessibility automation.

## 5. Test data

- Primary valid fixture: `presets/saas/input.json` + `presets/saas/registry.json`.
- Expected match fixture: `evals/flagship-saas/expected.json`.
- Invalid data is derived per test and never written into production presets.
- Time-dependent generation receives a fixed `createdAt` value.
- Generated file order, imports, props, tokens, and JSON are asserted as stable.

## 6. Quality gates

A change is releasable only when all are true:

1. `pnpm typecheck` passes.
2. All automated unit, business, API, and UI tests pass.
3. Coverage meets the configured global threshold: statements/lines/functions >= 75%, branches >= 70%.
4. Engine and Studio production builds pass.
5. Generated flagship TypeScript and Vite build pass.
6. `git diff --check` and secret-pattern scan pass.
7. Skipped runtime/visual checks remain explicitly reported as skipped.

## 7. Commands

```bash
pnpm test:unit
pnpm test:api
pnpm test:ui
pnpm test:coverage
pnpm check
```

`pnpm check` remains the repository definition of done. Coverage is executed and recorded separately
because it generates a local HTML artifact under ignored `coverage/`.
