# Code generation rules

- Consume only a validated Generation Plan.
- Use Babel AST for TSX and stable templates for non-code assets.
- Sort imports, files, props, and serialized objects.
- Emit semantic HTML, CSS Variables, CSS Modules, and `data-forge-node-id` in preview source.
- Never emit timestamps in source, dynamic imports, executable strings, random classes, or unknown packages.
- Every generator change requires a deterministic test and a generated Vite build.
