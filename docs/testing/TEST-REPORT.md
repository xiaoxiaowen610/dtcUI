# ForgeUI Phase 1 Test Execution Report

## 1. Result

**PASS** — all automated Phase 1 quality gates completed successfully on 2026-08-01.

| Gate                             | Result | Evidence                                                      |
| -------------------------------- | ------ | ------------------------------------------------------------- |
| TypeScript                       | Passed | `tsc --noEmit` returned exit code 0                           |
| Unit/business/API/UI/integration | Passed | 11 files, 90 tests, 0 failed                                  |
| Coverage                         | Passed | All configured global thresholds exceeded                     |
| Engine production build          | Passed | `tsup` produced the Node 24 ESM bundle                        |
| Studio production build          | Passed | Vite transformed 71 modules and emitted the production bundle |
| Generated flagship TypeScript    | Passed | Materialized output type-check succeeded                      |
| Generated flagship Vite build    | Passed | Production build succeeded with 3 exact component matches     |

## 2. Environment

| Item            | Value                            |
| --------------- | -------------------------------- |
| Baseline commit | `5675277`                        |
| Branch          | `main`                           |
| Node.js         | `v24.14.0`                       |
| pnpm            | `11.7.0`                         |
| Test runner     | Vitest `4.1.10`                  |
| UI environment  | jsdom `30.0.1` + Testing Library |
| Execution date  | 2026-08-01 (Asia/Tokyo)          |

## 3. Coverage

Command: `pnpm test:coverage`

| Metric     |           Actual | Gate | Result |
| ---------- | ---------------: | ---: | ------ |
| Statements | 96.04% (364/379) |  75% | Passed |
| Branches   | 89.23% (257/288) |  70% | Passed |
| Functions  | 96.18% (126/131) |  75% | Passed |
| Lines      | 96.29% (338/351) |  75% | Passed |

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

Final commands:

```bash
pnpm test:coverage
pnpm check
```

`pnpm check` executes type checking, all tests, Engine/Studio builds, and generated flagship
validation. The final command returned exit code 0.

## 6. Explicit exclusions

The following are not counted as passed:

- real-browser screenshots and pixel-diff baselines;
- fixed-viewport overflow/overlap checks;
- browser axe automation;
- isolated preview origin/CSP checks;
- AI Patch, rollback, ZIP export, and IndexedDB history.

They depend on Phase 4/5 features that are not implemented. Treating them as skipped keeps the report
consistent with the product and technical design rather than inventing coverage.
