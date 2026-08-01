# ADR-002: React Studio plus localhost Node Engine

Status: Accepted

## Decision

Use a browser-based React Studio for interaction and a localhost-only Node Engine for trusted generation,
validation, future AI credentials, filesystem output, and browser automation.

## Rationale

The browser cannot safely run arbitrary build tools or protect model credentials. Node can enforce exact
temporary paths, timeouts, dependency allowlists, real TypeScript/Vite builds, and later Playwright checks.

## Consequences

All cross-boundary payloads require shared runtime schemas. Engine CORS is restricted to the local Studio,
and long-running work will use explicit job state rather than hidden browser tasks.
