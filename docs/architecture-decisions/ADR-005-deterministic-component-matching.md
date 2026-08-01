# ADR-005: Filter hard constraints before deterministic component ranking

Status: Accepted

## Context

Source Key equality alone cannot prove that a registered React component is safe to generate. Props,
variants, slots, capabilities, required tokens, import paths, and local bindings can still be
incompatible. Conversely, presenting a semantic score as probability would hide why a candidate was
accepted or rejected. The reviewed design requires Exact, Adapter, Recipe, Native, and Manual paths
without runtime JSX invention.

## Decision

- Registry validation blocks unsafe imports, duplicate identities/bindings, invalid props/slots,
  ambiguous Adapters/Recipes, and missing Recipe members before matching.
- Source Key Exact has priority, but it remains subject to the same prop, slot, capability, and token
  hard constraints as every other registered component.
- Adapters are declarative only: source/semantic selection, prop rename, default value, and enum map.
  No code string or executable transform is accepted.
- Compatible semantic candidates use fixed `35/25/20/15/5` rule weights. Scores `>=85` may be
  preselected, `70–84` require confirmation, and lower scores continue to Recipe/native/manual.
- Equal scores use Component ID as the stable tie-break. Confidence labels describe rule bands, not
  model probability.
- Recipes contain only registered component IDs and declared capability requirements. Native fallback
  exists only for a small semantic allowlist; every other unresolved node becomes Manual Review.
- Every result carries reasons, incompatibilities, warnings, strategy, score when applicable, and a
  confidence label. The Generation Report counts all five strategies from actual match data.

## Consequences

An incompatible exact component cannot be rescued by a high semantic score, and the same input and
Registry always produce the same ordered result. The matcher can explain both its chosen path and the
highest rejected candidate. Recipe/native/manual outcomes remain reviewable decisions; later Studio
work can confirm project-level overrides without mutating the external Registry.
