# ADR-004: Resolve tokens before component matching and code generation

Status: Accepted

## Context

Phase 1 copied a fixed set of brand values into `tokens.css`. That proved the generated project could
build, but it did not prove that Design Input tokens were trustworthy inputs. The MVP requires stable
Primitive/Semantic tokens, aliases, cycles, missing references, type safety, conflict diagnostics and
CSS Variables generated from the input.

## Decision

- A dedicated `@forge-ui/token-resolver` package runs immediately after Design IR normalization.
- Persistent contracts remain arrays and plain objects. Maps are temporary indexes only.
- Alias values are structured `{ ref: token.path }` objects; raw CSS `var()` strings are not accepted
  as aliases.
- Duplicate paths, CSS-variable collisions, missing references, cross-type aliases, cycles and unsafe
  concrete CSS values are blocking diagnostics.
- Exact duplicate and perceptually similar values generate review suggestions. They never silently
  merge tokens with different semantic paths.
- Alias resolution is iterative so a 2,000-token chain does not depend on the JavaScript call stack.
- `GenerationPlan` carries the complete normalized resolution. Codegen renders `tokens.css` only from
  that plan and no longer owns brand constants.
- The Generation Report records total, referenced, reused, created and conflict counts.

## Consequences

The same token set produces stable ordered CSS regardless of input ordering. Invalid token graphs stop
before Registry matching or code generation and surface a recoverable Engine error. Similarity is an
explainable suggestion rather than an automatic semantic decision. Future Token editing and Patch work
must update the Design Input/IR and rerun this resolver instead of editing generated CSS.
