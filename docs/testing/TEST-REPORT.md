# ForgeUI Through Batch 02 Test Execution Report

## 1. Result

**PASS** — all automated quality gates through Batch 02 completed successfully on 2026-08-01.

| Gate                             | Result | Evidence                                                      |
| -------------------------------- | ------ | ------------------------------------------------------------- |
| TypeScript                       | Passed | `tsc --noEmit` returned exit code 0                           |
| Unit/business/API/UI/integration | Passed | 13 files, 117 tests, 0 failed                                 |
| Coverage                         | Passed | All configured global thresholds exceeded                     |
| Engine production build          | Passed | `tsup` produced the Node 24 ESM bundle                        |
| Studio production build          | Passed | Vite transformed 71 modules and emitted the production bundle |
| Generated flagship TypeScript    | Passed | Materialized output type-check succeeded                      |
| Generated flagship Vite build    | Passed | Production build succeeded with 3 exact component matches     |
| Fixed evaluation suite           | Passed | valid/degraded/invalid cases: 6/6 passed                      |
| Token performance                | Passed | 2,000-token alias chain remained below the 500 ms unit budget |

## 2. Environment

| Item            | Value                            |
| --------------- | -------------------------------- |
| Baseline commit | `7b8b1ee` (remote Batch 01)      |
| Branch          | `agent/batch-02-token-engine`    |
| Node.js         | `v24.14.0`                       |
| pnpm            | `11.7.0`                         |
| Test runner     | Vitest `4.1.10`                  |
| UI environment  | jsdom `30.0.1` + Testing Library |
| Execution date  | 2026-08-01 (Asia/Tokyo)          |

## 3. Coverage

Command: `pnpm test:coverage`

| Metric     |           Actual | Gate | Result |
| ---------- | ---------------: | ---: | ------ |
| Statements | 91.97% (596/648) |  75% | Passed |
| Branches   | 81.45% (404/496) |  70% | Passed |
| Functions  | 95.72% (179/187) |  75% | Passed |
| Lines      | 93.05% (549/590) |  75% | Passed |

The coverage denominator is restricted to Phase 1 production logic. The example external UI package
is excluded because it is a fixture dependency, not ForgeUI generation logic.

## 4. Defects found and corrected

| ID      | Severity | Finding                                                                                                                                                                       | Correction                                                                                                                        | Regression cases                                                          |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| DEF-001 | P0       | Registry matching accepted wrong primitive types, illegal enum values, and unknown props as exact matches. Enum definitions could also omit their allowed values.             | Added manifest validation and deterministic prop compatibility diagnostics; incompatible components now degrade to manual review. | BL-REG-005–011                                                            |
| DEF-002 | P1       | Studio assumed every failed Engine response was valid JSON, which could surface `undefined: undefined` or a JSON parse error instead of useful diagnostics.                   | Added `EngineRequestError`, preserved structured code/message/request ID/status, and added a safe non-JSON fallback.              | UI-008, UI-009                                                            |
| DEF-003 | P1       | Engine startup accepted zero, negative, fractional, partially numeric, and out-of-range ports.                                                                                | Added strict integer/range validation with a deterministic 4,000 fallback.                                                        | API-008                                                                   |
| DEF-004 | P1       | Unexpected Engine failures were returned with HTTP 400, incorrectly classifying server faults as client faults.                                                               | Added error-to-status mapping so `INTERNAL_ERROR` returns HTTP 500 while recoverable contract failures remain HTTP 400.           | Error mapper branch review; public error contracts covered by API-004–006 |
| DEF-005 | P0       | Registry allowed `style: default`, but Generation Plan and Babel output always emitted named imports, producing uncompilable source for valid manifests.                      | Preserved default bindings in `ImportPlan` and emitted mixed/default Babel import specifiers.                                     | BL-PLAN-008, UT-CODEGEN-009                                               |
| DEF-006 | P0       | Invalid export/prop identifiers, duplicate component IDs, conflicting defaults, and colliding local import bindings could pass Registry validation and reach code generation. | Added binding, JSX attribute, uniqueness, default-binding, and cross-import collision guards with typed diagnostics.              | BL-REG-012–016                                                            |
| DEF-007 | P0       | Multiple Hero semantics were silently resolved to the first node, hiding ambiguous input.                                                                                     | Required exactly one Hero and added `HERO_SECTION_AMBIGUOUS`.                                                                     | BL-PLAN-007                                                               |
| DEF-008 | P1       | Studio error UI omitted the request ID and an explicit recovery action; decorative glyphs polluted accessible button names and selection state was visual-only.               | Added request ID display, retry flow, hidden decorative glyphs, alert semantics, and `aria-pressed` state.                        | UI-004, UI-012, UI-013                                                    |
| DEF-009 | P1       | Whitespace-only node names passed the versioned input schema.                                                                                                                 | Trimmed and rejected blank node names at the contract boundary.                                                                   | UT-CONTRACT-006                                                           |
| DEF-010 | P1       | The Studio client trusted non-string request IDs in otherwise JSON-shaped Engine errors.                                                                                      | Tightened the response guard and retained the safe response-header fallback.                                                      | UI-014                                                                    |

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
- AI Patch, rollback, ZIP export, and IndexedDB history.

They depend on Phase 4/5 features that are not implemented. Treating them as skipped keeps the report
consistent with the product and technical design rather than inventing coverage.
