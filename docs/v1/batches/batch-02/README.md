# ForgeUI V1 · Batch 02 Visual Canvas

## Goal

Turn the renderer-neutral Composer contracts from Batch 00 into a visual editor without making the editor framework the source of truth.

Batch 02 is intentionally a Canvas foundation. The starter commerce blocks are architecture fixtures until Batch 01 Design System assets are implemented.

## Entry point

Run the Studio and open either:

- `/composer`
- `/?mode=composer`

The legacy compiler-style D2C Studio remains the default route during the transition.

## Architecture

```text
Puck interaction
  Drag / Drop / Slot / Selection / Fields
                |
                v
        Puck <-> Forge Adapter
                |
                v
         ComposerOperation[]
                |
                v
     Registry + Slot Validation
                |
                v
          ComposerPage
                |
       +--------+---------+
       |        |         |
     Layers   Canvas   Future AI/Codegen
```

`ComposerPage` remains the only durable page document. Puck state is transient editor state.

## Implemented scope

- Puck compositional editor integration;
- root block drag/reorder;
- nested ProductGrid/ProductCard Slot interaction;
- Forge-owned root and Slot drop rules;
- Puck to Forge round-trip adapter;
- Puck diff to `ComposerOperation[]`;
- deterministic rollback for invalid editor changes;
- Forge Layers derived from Page Schema;
- Puck Fields used as the first Inspector renderer;
- Mobile / Tablet / Desktop Canvas width controls;
- snapshot-backed Undo / Redo with operation-first mutations;
- starter 618 commerce page for Canvas verification;
- preservation of the legacy Studio.

## Explicit boundaries

Not completed in this batch:

- production Forge Design System and the final 14 Blocks;
- drag reordering inside the custom Forge Layers panel;
- IndexedDB project persistence;
- AI Generate / AI Edit;
- new Composer React Codegen;
- multi-select, arbitrary resize, rotation or absolute positioning;
- cross-platform renderers.

## Puck boundary

Puck-specific names such as `HeroBlock`, `ProductGrid` and `ComponentData` are adapter concerns. Core contracts continue to use Forge semantic names such as `hero-block`, `product-grid` and `ComposerNode`.

Invalid interactions never bypass Forge validation. The adapter asks Forge to apply the resulting operations; if the target document cannot be represented legally, Puck is reset to the last valid Forge document.

## Review checklist

- root rejects leaf components such as ProductCard;
- ProductGrid only accepts ProductCard in its `items` Slot;
- moving a node keeps its stable ID;
- Page Schema is unchanged by selection/device/panel state;
- old Studio still loads normally;
- `/composer` renders the new Studio;
- unit tests, typecheck, build and the repository-wide `pnpm check` pass.
