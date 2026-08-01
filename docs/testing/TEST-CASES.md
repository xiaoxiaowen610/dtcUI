# ForgeUI Phase 1 Detailed Test Cases

Legend: P0 is release-blocking, P1 is important regression coverage, and P2 is future/manual. `Auto`
means implemented in Vitest or the build scripts; `Phase 4` is deliberately excluded from this release.

## 1. Shared utilities and contracts

| ID              | Priority | Scenario and input                                          | Expected result                                             | Execution |
| --------------- | -------- | ----------------------------------------------------------- | ----------------------------------------------------------- | --------- |
| UT-SHARED-001   | P0       | Hash the same Unicode string twice                          | Same 8-character hexadecimal hash                           | Auto      |
| UT-SHARED-002   | P1       | Hash two different strings                                  | Hashes differ                                               | Auto      |
| UT-SHARED-003   | P0       | Stable-stringify objects with different key insertion order | Serialized strings are identical and nested keys are sorted | Auto      |
| UT-SHARED-004   | P1       | Convert camelCase/dotted token path to CSS variable         | Stable kebab-case `--` variable is returned                 | Auto      |
| UT-CONTRACT-001 | P0       | Parse valid AI SaaS input                                   | Schema succeeds with version `1.0`                          | Auto      |
| UT-CONTRACT-002 | P0       | Input schema version is unsupported                         | Schema rejects the envelope                                 | Auto      |
| UT-CONTRACT-003 | P0       | Layout columns are zero or above 12                         | Schema rejects invalid layout                               | Auto      |
| UT-CONTRACT-004 | P0       | Registry contains no components                             | Schema rejects manifest                                     | Auto      |
| UT-CONTRACT-005 | P1       | Asset source URL is malformed                               | Schema rejects asset                                        | Auto      |

## 2. Design IR business logic

| ID        | Priority | Scenario and input                       | Expected result                                                  | Execution |
| --------- | -------- | ---------------------------------------- | ---------------------------------------------------------------- | --------- |
| BL-IR-001 | P0       | Normalize same input twice               | Generated IDs and IR are identical                               | Auto      |
| BL-IR-002 | P0       | Two nodes share explicit ID              | `DESIGN_DUPLICATE_ID` blocks processing                          | Auto      |
| BL-IR-003 | P0       | Input misses required contract field     | `DESIGN_SCHEMA_INVALID` is returned                              | Auto      |
| BL-IR-004 | P0       | Text exceeds 20,000 characters           | `DESIGN_LIMIT_EXCEEDED` is returned                              | Auto      |
| BL-IR-005 | P0       | Tree depth exceeds 30                    | `DESIGN_LIMIT_EXCEEDED` is returned                              | Auto      |
| BL-IR-006 | P0       | Input metadata makes payload exceed 5 MB | Byte limit blocks processing                                     | Auto      |
| BL-IR-007 | P1       | Tokens/assets arrive unsorted            | Tokens and assets are sorted; missing/resolved status is derived | Auto      |
| BL-IR-008 | P1       | Walk tree and search by semantic         | Preorder traversal and semantic lookup are stable                | Auto      |
| BL-IR-009 | P1       | Names contain surrounding spaces         | Normalized name is trimmed and source reference preserved        | Auto      |
| BL-IR-010 | P0       | Tree contains more than 2,000 nodes      | `DESIGN_LIMIT_EXCEEDED` is returned                              | Auto      |

## 3. Registry and component matching

| ID         | Priority | Scenario and input                            | Expected result                                 | Execution |
| ---------- | -------- | --------------------------------------------- | ----------------------------------------------- | --------- |
| BL-REG-001 | P0       | Source Key maps to valid registered component | Exact match with high confidence                | Auto      |
| BL-REG-002 | P0       | Import path is outside allowlisted root       | `REGISTRY_IMPORT_NOT_ALLOWED` blocks Registry   | Auto      |
| BL-REG-003 | P0       | Two components declare same Source Key        | `REGISTRY_DUPLICATE_SOURCE_KEY` blocks Registry | Auto      |
| BL-REG-004 | P0       | Source Key is unknown                         | Manual review with low confidence               | Auto      |
| BL-REG-005 | P0       | Required prop is absent                       | Manual review lists missing prop                | Auto      |
| BL-REG-006 | P0       | Prop has wrong primitive type                 | Manual review lists type incompatibility        | Auto      |
| BL-REG-007 | P0       | Enum prop value is outside allowed values     | Manual review lists enum incompatibility        | Auto      |
| BL-REG-008 | P0       | Input supplies prop absent from manifest      | Manual review lists unknown prop                | Auto      |
| BL-REG-009 | P1       | All optional/required props are compatible    | Exact match remains allowed                     | Auto      |
| BL-REG-010 | P0       | Enum definition omits allowed values          | Registry validation blocks ambiguous contract   | Auto      |
| BL-REG-011 | P1       | Component declares one prop twice             | Registry validation blocks duplicate definition | Auto      |

## 4. Generation Plan and code generation

| ID             | Priority | Scenario and input                                 | Expected result                                           | Execution |
| -------------- | -------- | -------------------------------------------------- | --------------------------------------------------------- | --------- |
| BL-PLAN-001    | P0       | Flagship IR and matches                            | Hero copy, actions, visual and stable imports are planned | Auto      |
| BL-PLAN-002    | P0       | No `hero` semantic section                         | `HERO_SECTION_REQUIRED` blocks generation                 | Auto      |
| BL-PLAN-003    | P1       | Manual-review match exists                         | Non-blocking diagnostic is retained                       | Auto      |
| BL-PLAN-004    | P1       | Component match exists outside Hero                | It is not imported into Hero output                       | Auto      |
| BL-PLAN-005    | P1       | Page metadata is absent                            | Documented title/description fallbacks apply              | Auto      |
| BL-PLAN-006    | P0       | Same document/Registry versions used twice         | Source hash and generation ID are identical               | Auto      |
| UT-CODEGEN-001 | P0       | Generate same plan with fixed timestamp twice      | All generated files and hashes are identical              | Auto      |
| UT-CODEGEN-002 | P0       | HTML metadata contains tags, quotes and ampersands | `index.html` escapes untrusted metadata                   | Auto      |
| UT-CODEGEN-003 | P0       | Hero text contains JSX-looking content             | AST emits safe string literal, not executable JSX         | Auto      |
| UT-CODEGEN-004 | P1       | Inspect generated file list                        | Paths are sorted and content hashes match contents        | Auto      |
| UT-CODEGEN-005 | P0       | Search brand hex outside `tokens.css`              | Brand literal is isolated to token output                 | Auto      |
| UT-CODEGEN-006 | P1       | No visual component is matched                     | Accessible hidden visual placeholder is generated         | Auto      |
| UT-CODEGEN-007 | P1       | Inspect manifest/report                            | Versions/counts/skipped validators are explicit           | Auto      |
| UT-CODEGEN-008 | P0       | Materialize generated path containing traversal    | Output writer rejects path escaping target root           | Auto      |

## 5. Engine pipeline and API

| ID          | Priority | Scenario and input                                                              | Expected result                                                        | Execution |
| ----------- | -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------- |
| BL-PIPE-001 | P0       | Analyze flagship request                                                        | 8 nodes, 3 component nodes, 3 exact, 0 manual                          | Auto      |
| BL-PIPE-002 | P0       | Generate flagship with fixed time                                               | 12 files and stable generation ID                                      | Auto      |
| BL-PIPE-003 | P0       | Unknown component in otherwise valid Hero                                       | Manual review propagates to analysis, plan and report                  | Auto      |
| BL-PIPE-004 | P0       | Missing Hero                                                                    | Typed Generation Plan error is thrown                                  | Auto      |
| BL-PIPE-005 | P0       | Invalid Registry allowlist                                                      | Typed Registry error is thrown                                         | Auto      |
| API-001     | P0       | `GET /api/health`                                                               | 200 with Engine/schema versions and capabilities                       | Auto      |
| API-002     | P0       | `POST /api/analyze` valid request                                               | 200 with exact-match summary                                           | Auto      |
| API-003     | P0       | `POST /api/generate` valid request                                              | 200 with plan, files, manifest and report                              | Auto      |
| API-004     | P0       | Request schema/version invalid                                                  | 400 `REQUEST_SCHEMA_INVALID` with request ID                           | Auto      |
| API-005     | P0       | Registry import violates allowlist                                              | 400 `REGISTRY_INVALID`                                                 | Auto      |
| API-006     | P0       | Valid request has no Hero                                                       | 400 `GENERATION_PLAN_FAILED` with recovery action                      | Auto      |
| API-007     | P1       | Allowed Studio Origin sends preflight/request                                   | CORS header is present; unknown Origin is not reflected                | Auto      |
| API-008     | P1       | `PORT` is absent, valid, fractional, malformed, negative, zero, or above 65,535 | Valid port is retained; every invalid value safely falls back to 4,000 | Auto      |

## 6. Studio UI and client service

| ID     | Priority | User steps                                         | Expected result                                                      | Execution  |
| ------ | -------- | -------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| UI-001 | P0       | Open Studio before generation                      | Project, tree, workflow, CTA and empty Inspector are visible         | Auto/jsdom |
| UI-002 | P0       | Click `Generate flagship` and Engine resolves      | Hero preview, generation ID, 3/3 matches and connected status appear | Auto/jsdom |
| UI-003 | P0       | Generation Promise remains pending                 | Run controls are disabled and pending labels are shown               | Auto/jsdom |
| UI-004 | P0       | Engine rejects generation                          | Error title and structured message are visible                       | Auto/jsdom |
| UI-005 | P1       | Generate, then open `Generated code`               | Generated-file navigation and Hero TSX are displayed                 | Auto/jsdom |
| UI-006 | P1       | Select `tokens.css`                                | Code panel changes to token content                                  | Auto/jsdom |
| UI-007 | P1       | Switch desktop -> tablet -> mobile                 | Preview frame receives the selected device state/class               | Auto/jsdom |
| UI-008 | P0       | Client receives non-2xx structured Engine response | Service throws typed error preserving code/message/request ID        | Auto       |
| UI-009 | P1       | Client receives non-JSON/invalid error response    | Safe fallback error is thrown, not `undefined: undefined`            | Auto       |
| UI-010 | P2       | Real browser at 1440/768/390 viewports             | No overflow/overlap and focus order is valid                         | Phase 4    |
| UI-011 | P2       | Run axe and screenshot baseline                    | No blocking a11y error or unapproved visual diff                     | Phase 4    |

## 7. Integration, build and security

| ID      | Priority | Scenario                                                            | Expected result                      | Execution            |
| ------- | -------- | ------------------------------------------------------------------- | ------------------------------------ | -------------------- |
| INT-001 | P0       | Run entire flagship pipeline in process                             | Expected Eval match map is satisfied | Auto                 |
| INT-002 | P0       | Type-check materialized generated project                           | No TypeScript diagnostics            | Build script         |
| INT-003 | P0       | Vite-build materialized generated project                           | Production build succeeds            | Build script         |
| INT-004 | P0       | Build Engine and Studio                                             | Both production bundles succeed      | `pnpm build`         |
| SEC-001 | P0       | Registry prefix resembles allowlisted package but is not child path | Import is rejected                   | Auto                 |
| SEC-002 | P0       | Generated output path tries `../` traversal                         | Materialization is rejected          | Auto                 |
| SEC-003 | P0       | HTML metadata contains injection payload                            | Output is escaped                    | Auto                 |
| SEC-004 | P1       | Authorization header is logged                                      | Logger configuration redacts header  | Configuration review |
| SEC-005 | P2       | Preview posts message from foreign origin                           | Message is ignored                   | Phase 4              |

## 8. Exit criteria

- Every automated P0/P1 case passes.
- No unresolved release-blocking defect remains.
- Coverage gate passes.
- Build and generated-output validation pass.
- Phase 4 cases remain explicitly excluded from the denominator.
