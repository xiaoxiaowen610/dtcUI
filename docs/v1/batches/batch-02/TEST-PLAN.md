# Batch 02 Test Plan

## Automated unit coverage

### Composer model

- B02-MODEL-001 starter page passes Registry validation.
- B02-MODEL-002 Page Root accepts Blocks but rejects leaf Components.
- B02-MODEL-003 ProductGrid Slot accepts ProductCard and rejects TextBlock.
- B02-MODEL-004 insert operation updates the immutable document.
- B02-MODEL-005 move operation preserves stable node ID.
- B02-MODEL-006 prop update does not mutate the previous page.
- B02-MODEL-007 duplicate IDs are blocked.
- B02-MODEL-008 move cycles are blocked.
- B02-MODEL-009 required Slot cardinality is enforced.

### Puck adapter

- B02-ADAPTER-001 Forge -> Puck -> Forge round-trip is lossless.
- B02-ADAPTER-002 Puck field edits become `update-props` operations.
- B02-ADAPTER-003 root reorder becomes stable-ID move operations.
- B02-ADAPTER-004 nested Slot additions become Slot insert operations.
- B02-ADAPTER-005 Forge-only layout metadata survives Puck round-trip.

### Composer store

- B02-STORE-001 valid Puck edits update Page Schema and history.
- B02-STORE-002 invalid root insertion keeps Forge Page Schema unchanged and requests Puck rollback.
- B02-STORE-003 Undo / Redo restores document snapshots.
- B02-STORE-004 Reset restores the deterministic starter page.

## Repository gates

Required before Batch 02 review:

```bash
pnpm install --frozen-lockfile
pnpm test:coverage
pnpm check
```

`pnpm check` covers typecheck, full test suite, Engine/Studio build, flagship validation and committed evals.

## Manual Canvas acceptance

1. Open `/composer`.
2. Drag a Promo Banner into root content.
3. Reorder Hero, Product Grid and Banner in the central Canvas.
4. Select Product Grid and edit title/columns in Inspector.
5. Drag ProductCard into ProductGrid `items`.
6. Attempt to drag an invalid leaf component into Page Root and confirm the document rolls back with a visible error.
7. Select nested ProductCard from Forge Layers and confirm Canvas/Inspector selection follows.
8. Switch Mobile / Tablet / Desktop widths.
9. Undo and Redo a content edit and reorder.
10. Open `/` and confirm the legacy D2C Studio remains available.

## Deferred tests

Visual regression, real browser drag gestures, IndexedDB recovery and large-document performance are deferred until the Canvas UI stabilizes and Batch 01 production Blocks exist.
