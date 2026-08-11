# ADR-008: Use Puck behind a Forge editor adapter

## Status

Accepted for ForgeUI V1 Batch 02.

## Context

ForgeUI V1 needs drag/drop, nested slots, selection, component fields and keyboard-accessible editor interactions. Rebuilding those primitives from pointer events would consume time without differentiating ForgeUI's Design-to-Code architecture.

The visual editor must not become the owner of the product document, because later AI tools, validation and code generation need a renderer-neutral Page Schema that remains stable if the editor framework changes.

## Decision

Use `@puckeditor/core` as the interaction engine for the V1 visual canvas.

Puck owns:

- drag/drop and sortable interaction;
- slot rendering and collision handling;
- selection primitives;
- component drawer and field rendering.

ForgeUI owns:

- `ComposerPage` as the single document source of truth;
- Component Registry metadata and allowed Slot relationships;
- `ComposerOperation` and history boundaries;
- post-interaction validation and rollback;
- Forge Layers;
- AI tool semantics and future code generation.

A dedicated adapter converts `ComposerPage` to Puck `Data`, converts Puck changes back into a candidate `ComposerPage`, diffs that candidate into `ComposerOperation[]`, validates every operation, and rolls Puck back if the resulting Forge document is invalid.

Puck-specific component type names and data shapes must remain inside `apps/studio/src/composer/puckAdapter.ts` and Puck configuration files. They must not be added to `packages/contracts`.

## Consequences

### Positive

- mature drag/drop and Slot behavior without rebuilding editor infrastructure;
- faster route to an interview-quality interactive Canvas;
- Page Schema remains independent from Puck;
- AI and human edits can converge on the same Forge operation model;
- Puck can be replaced later without migrating generated projects or core Composer contracts.

### Tradeoffs

- Puck maintains transient editor state that must be synchronized carefully;
- Puck may temporarily render an interaction that Forge validation rejects, requiring deterministic rollback;
- the Puck Config currently duplicates a small amount of Registry field metadata; a later batch can generate more of that configuration from Forge Registry definitions.

## Rejected alternatives

- **Build drag/drop from scratch:** too much low-differentiation interaction work for V1.
- **Use Puck Data as the Forge document model:** couples AI, validation and codegen to an editor implementation.
- **Use only low-level dnd-kit primitives:** gives maximum control but leaves nested editor, selection and field infrastructure to ForgeUI, increasing V1 scope.
