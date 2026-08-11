# Batch 00 Test Plan

## Automated contract tests

- `B00-UT-001` parses a valid responsive Page Schema.
- `B00-UT-002` rejects a root that is not `page-root` / `root`.
- `B00-UT-003` rejects duplicate stable node IDs across children and slots.
- `B00-UT-004` rejects grid columns outside the V1 1–4 boundary.
- `B00-UT-005` rejects invalid slot min/max cardinality.
- `B00-UT-006` parses Registry metadata used by Canvas, Inspector and AI.
- `B00-UT-007` parses Style Kit token and block-default metadata.
- `B00-UT-008` parses representative human/AI operation types.

## Repository gates

Required before merge:

```bash
pnpm typecheck
pnpm test:unit
pnpm build
pnpm check
```

`pnpm check` remains the definition-of-done gate from the repository contribution contract.

## Environment note

The ChatGPT execution container used to author this batch cannot resolve GitHub/npm hosts, so it can only run dependency-free TypeScript parsing checks. Full repository gates must execute in GitHub Actions or a normal local checkout before the draft PR is marked ready.
