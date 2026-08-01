# Patch schema boundary

The future MVP Patch protocol allows only `update_token`, `update_content`, and allowlisted
`update_prop` operations. Every patch must carry schema, patch, request, and base-version IDs.

Patch application is immutable and transactional: validate version and idempotency, validate paths and
types, derive a candidate, regenerate affected files, validate, then commit or keep the prior version.
Never implement natural-language full-file replacement as a shortcut.
