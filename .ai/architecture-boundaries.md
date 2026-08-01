# Architecture boundaries

- Browser interaction belongs in `apps/studio`; trusted local execution belongs in `apps/engine`.
- Shared transport schemas belong in `packages/contracts`.
- Design IR is framework-agnostic and never contains hooks, CSS classes, or JSX.
- Generation Plan owns structure and imports; Code Generator owns source syntax.
- Registry components remain separate from ForgeUI workbench UI.
- Packages never import app code. AI providers never enter deterministic domain packages.
