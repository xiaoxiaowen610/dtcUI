# ForgeUI Phase 1 Test Execution Report

## 1. Result

**PASS** — all automated Phase 1 quality gates completed successfully on 2026-08-01.

| Gate                             | Result | Evidence                                                      |
| -------------------------------- | ------ | ------------------------------------------------------------- |
| TypeScript                       | Passed | `tsc --noEmit` returned exit code 0                           |
| Unit/business/API/UI/integration | Passed | 11 files, 77 tests, 0 failed                                  |
| Coverage                         | Passed | All configured global thresholds exceeded                     |
| Engine production build          | Passed | `tsup` produced the Node 24 ESM bundle                        |
| Studio production build          | Passed | Vite transformed 71 modules and emitted the production bundle |
| Generated flagship TypeScript    | Passed | Materialized output type-check succeeded                      |
| Generated flagship Vite build    | Passed | Production build succeeded with 3 exact component matches     |

## 2. Environment

| Item            | Value                            |
| --------------- | -------------------------------- |
| Baseline commit | `766c58a`                        |
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
| Statements | 95.66% (331/346) |  75% | Passed |
| Branches   | 87.95% (219/249) |  70% | Passed |
| Functions  | 96.03% (121/126) |  75% | Passed |
| Lines      | 95.93% (307/320) |  75% | Passed |

The coverage denominator is restricted to Phase 1 production logic. The example external UI package
is excluded because it is a fixture dependency, not ForgeUI generation logic.

## 4. Defects found and corrected

| ID      | Severity | Finding                                                                                                                                                           | Correction                                                                                                                        | Regression cases                                                          |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| DEF-001 | P0       | Registry matching accepted wrong primitive types, illegal enum values, and unknown props as exact matches. Enum definitions could also omit their allowed values. | Added manifest validation and deterministic prop compatibility diagnostics; incompatible components now degrade to manual review. | BL-REG-005–011                                                            |
| DEF-002 | P1       | Studio assumed every failed Engine response was valid JSON, which could surface `undefined: undefined` or a JSON parse error instead of useful diagnostics.       | Added `EngineRequestError`, preserved structured code/message/request ID/status, and added a safe non-JSON fallback.              | UI-008, UI-009                                                            |
| DEF-003 | P1       | Engine startup accepted zero, negative, fractional, partially numeric, and out-of-range ports.                                                                    | Added strict integer/range validation with a deterministic 4,000 fallback.                                                        | API-008                                                                   |
| DEF-004 | P1       | Unexpected Engine failures were returned with HTTP 400, incorrectly classifying server faults as client faults.                                                   | Added error-to-status mapping so `INTERNAL_ERROR` returns HTTP 500 while recoverable contract failures remain HTTP 400.           | Error mapper branch review; public error contracts covered by API-004–006 |

No P0 or P1 product defect remains open from this execution.

## 5. Execution history

The first automated run completed 74 of 76 assertions. The two failures were false negatives in new
test code: one assumed JavaScript default sorting instead of the generator's documented comparator,
and one omitted the CSS type icon from a button's accessible name. Both assertions were corrected;
the second run passed 76/76. A node-limit regression case and Eval map assertion were then added; an
incremental run exposed and corrected a test-fixture variable shadowing mistake. The final release gate
passed 77/77.

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
