# Fixed evaluation suite

`cases.ts` is the executable source of truth for committed evaluation cases. It imports the canonical
AI SaaS preset and derives explicit immutable variants so Registry and input versions cannot drift
between duplicated JSON files.

The minimum suite always contains:

- a valid flagship case with labeled component matches;
- a degraded unknown-component case that must remain generatable and explainable;
- an invalid malformed-design case that must fail with the declared error code.

Run `pnpm evals`. The deterministic machine-readable report is written to
`.forge-output/evaluation-report.json` for CI artifact upload. Runtime duration and wall-clock time are
deliberately excluded from that report; performance evidence is handled by the release-evidence batch.
