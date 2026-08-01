# Security rules

- Treat design data, Registry manifests, assets, prompts, and model output as untrusted.
- Enforce byte, node, depth, text, schema, import-root, and path limits before work begins.
- Never execute input scripts, lifecycle hooks, arbitrary installs, or dynamic imports.
- Keep model keys in Engine environment variables and redact authorization headers.
- Validate generated paths remain inside the exact output directory.
- Prefer a structured error or manual review to uncertain executable behavior.
