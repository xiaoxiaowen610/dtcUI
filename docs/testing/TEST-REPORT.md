# ForgeUI Through Batch 04 Test Execution Report

## 1. Result

**PASS** — all automated quality gates through Batch 04 completed successfully on 2026-08-01.

| Gate                             | Result | Evidence                                                       |
| -------------------------------- | ------ | -------------------------------------------------------------- |
| TypeScript                       | Passed | `tsc --noEmit` returned exit code 0                            |
| Unit/business/API/UI/integration | Passed | 16 files, 154 tests, 0 failed                                  |
| Coverage                         | Passed | All configured global thresholds exceeded                      |
| Engine production build          | Passed | `tsup` produced the Node 24 ESM bundle                         |
| Studio production build          | Passed | Vite transformed 156 modules and emitted the production bundle |
| Generated flagship TypeScript    | Passed | Materialized output type-check succeeded                       |
| Generated flagship Vite build    | Passed | 7 Exact matches, 4 Section modules, 16 generated files built   |
| Fixed evaluation suite           | Passed | 6/6 cases; labeled Top-1 13/13 (100.0% on this fixed set)      |
| Token performance                | Passed | 2,000-token alias chain remained below the 500 ms unit budget  |

## 2. Environment

| Item            | Value                             |
| --------------- | --------------------------------- |
| Baseline commit | `5457a0a` (remote Batch 03)       |
| Branch          | `agent/batch-04-studio-workbench` |
| Node.js         | `v24.14.0`                        |
| pnpm            | `11.7.0`                          |
| Test runner     | Vitest `4.1.10`                   |
| UI environment  | jsdom `30.0.1` + Testing Library  |
| Execution date  | 2026-08-01 (Asia/Tokyo)           |

## 3. Coverage

Command: `pnpm test:coverage`

| Metric     |            Actual | Gate | Result |
| ---------- | ----------------: | ---: | ------ |
| Statements | 88.82% (946/1065) |  75% | Passed |
| Branches   |  80.66% (684/848) |  70% | Passed |
| Functions  |  93.10% (270/290) |  75% | Passed |
| Lines      |  90.14% (851/944) |  75% | Passed |

The coverage denominator is restricted to ForgeUI production logic implemented through Batch 04. The
example external UI package is excluded because it is a fixture dependency, not ForgeUI generation logic.

## 4. Defects found and corrected

| ID      | Severity | Finding                                                                                                                                                                       | Correction                                                                                                                             | Regression cases                                                          |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| DEF-001 | P0       | Registry matching accepted wrong primitive types, illegal enum values, and unknown props as exact matches. Enum definitions could also omit their allowed values.             | Added manifest validation and deterministic prop compatibility diagnostics; incompatible components now degrade to manual review.      | BL-REG-005–011                                                            |
| DEF-002 | P1       | Studio assumed every failed Engine response was valid JSON, which could surface `undefined: undefined` or a JSON parse error instead of useful diagnostics.                   | Added `EngineRequestError`, preserved structured code/message/request ID/status, and added a safe non-JSON fallback.                   | UI-008, UI-009                                                            |
| DEF-003 | P1       | Engine startup accepted zero, negative, fractional, partially numeric, and out-of-range ports.                                                                                | Added strict integer/range validation with a deterministic 4,000 fallback.                                                             | API-008                                                                   |
| DEF-004 | P1       | Unexpected Engine failures were returned with HTTP 400, incorrectly classifying server faults as client faults.                                                               | Added error-to-status mapping so `INTERNAL_ERROR` returns HTTP 500 while recoverable contract failures remain HTTP 400.                | Error mapper branch review; public error contracts covered by API-004–006 |
| DEF-005 | P0       | Registry allowed `style: default`, but Generation Plan and Babel output always emitted named imports, producing uncompilable source for valid manifests.                      | Preserved default bindings in `ImportPlan` and emitted mixed/default Babel import specifiers.                                          | BL-PLAN-008, UT-CODEGEN-009                                               |
| DEF-006 | P0       | Invalid export/prop identifiers, duplicate component IDs, conflicting defaults, and colliding local import bindings could pass Registry validation and reach code generation. | Added binding, JSX attribute, uniqueness, default-binding, and cross-import collision guards with typed diagnostics.                   | BL-REG-012–016                                                            |
| DEF-007 | P0       | Multiple Hero semantics were silently resolved to the first node, hiding ambiguous input.                                                                                     | Required exactly one Hero and added `HERO_SECTION_AMBIGUOUS`.                                                                          | BL-PLAN-007                                                               |
| DEF-008 | P1       | Studio error UI omitted the request ID and an explicit recovery action; decorative glyphs polluted accessible button names and selection state was visual-only.               | Added request ID display, retry flow, hidden decorative glyphs, alert semantics, and `aria-pressed` state.                             | UI-004, UI-012, UI-013                                                    |
| DEF-009 | P1       | Whitespace-only node names passed the versioned input schema.                                                                                                                 | Trimmed and rejected blank node names at the contract boundary.                                                                        | UT-CONTRACT-006                                                           |
| DEF-010 | P1       | The Studio client trusted non-string request IDs in otherwise JSON-shaped Engine errors.                                                                                      | Tightened the response guard and retained the safe response-header fallback.                                                           | UI-014                                                                    |
| DEF-011 | P0       | An import such as `@example/ui/../../untrusted` passed the prefix allowlist despite containing traversal segments.                                                            | Added segment-level import validation before matching or code generation.                                                              | B03-SEC-001                                                               |
| DEF-012 | P1       | Generation Report hardcoded Adapter, Recipe, and Native counters to zero even when real match results used those strategies.                                                  | Derived every strategy count from the actual match collection.                                                                         | B03-REPORT-001                                                            |
| DEF-013 | P0       | A generated Section wrapper could have the same local name as its imported Registry component (`FeatureGrid`), producing invalid TypeScript.                                  | Generation Plan now reserves Hero/import bindings and assigns a deterministic conflict-free wrapper name such as `FeatureGridSection`. | B03-CODEGEN-001 plus generated TypeScript/Vite validation                 |
| DEF-014 | P1       | Generated Hero title, eyebrow, and description lacked stable node markers, so Code navigation could identify only a related file.                                             | Added normalized copy node IDs to the Generation Plan and Babel AST output.                                                            | B04-UI-003, UT-CODEGEN-001                                                |
| DEF-015 | P1       | A latest Engine mutation failure replaced the success view, preventing review of the last valid output while correcting the error.                                            | Retained the last successful result and render later failures as a recoverable banner with Request ID and Retry.                       | B04-UI-002, B04-UI-008                                                    |
| DEF-016 | P0       | Studio could send only the built-in flagship request and had no type/size/syntax/schema boundary for local JSON.                                                              | Added explicit Preset/Registry controls, guarded file/editor import, and a custom-request integration path.                            | B04-UT-003–005, B04-SEC-001, B04-UI-001, B04-INT-001                      |

No P0 or P1 product defect remains open from this execution.

## 5. Execution history

The initial quality pass established 77 passing tests. The second expert audit added contract,
Registry, default-import, Hero ambiguity, API limit, client-guard, retry, and accessibility cases. A
deliberate red run reproduced 14 failures across those missing behaviors; after production fixes, the
targeted suite passed 67/67; the final full suite passed 90/90 after adding the cross-import binding
collision regression.

Batch 01 added six automated contract/evaluation cases and three executable fixed Eval cases. The
suite now proves that a valid case succeeds, an unknown component degrades without blocking, and a
malformed design fails with the expected error code. The normalized report deliberately excludes
timestamps and durations so repeated runs are byte-stable.

Batch 02 added a dedicated Token Resolver, 21 contract/unit/business/API/integration regressions and
three fixed Token Eval cases. Flagship generation now resolves 16 input tokens, including two semantic
aliases, and writes their stable values into `tokens.css`. Duplicate paths, CSS-variable collisions,
missing references, type mismatches, cycles and unsafe CSS are blocking failures; exact/similar values
remain non-blocking review suggestions.

Batch 03 added the five-stage deterministic matcher, declaration-only Adapters, registered Recipes,
safe native/manual fallbacks, 8 base components, and 4 marketing Sections. The test suite covers hard
prop/slot/capability/token constraints, semantic thresholds, stable tie-breaks, invalid Registry rules,
real report counters, and labeled Top-1 evaluation. A deliberate generated-project validation exposed
the Section/import binding collision; after the naming fix, both TypeScript and Vite passed with all
16 generated files.

Batch 04 replaced the flagship-only presentation with a node-linked workbench. Local JSON is validated
before becoming the active draft, Registry selection is explicit, and the complete Tree is keyboard
navigable. Tree, Preview, Code, Inspector, and Diagnostics share stable node IDs; device, selection,
expansion, and file state survive panel changes. Engine errors retain the last success and remain
retryable with their Request ID. The mobile-first resolver has independent unit coverage.

Final commands:

```bash
pnpm test:coverage
pnpm check
pnpm evals
```

`pnpm check` executes type checking, all tests, Engine/Studio builds, generated flagship validation,
and the fixed Eval suite. The final command returned exit code 0.

## 6. Explicit exclusions

The following are not counted as passed:

- real-browser screenshots and pixel-diff baselines;
- fixed-viewport overflow/overlap checks;
- browser axe automation;
- isolated preview origin/CSP checks;
- AI Patch, rollback, ZIP export, and IndexedDB history;
- interactive confirmation and persistence of Recipe/native/manual project overrides.

They depend on Phase 4/5 features that are not implemented. Treating them as skipped keeps the report
consistent with the product and technical design rather than inventing coverage.
