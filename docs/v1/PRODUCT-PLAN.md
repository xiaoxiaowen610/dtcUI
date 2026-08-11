# ForgeUI V1 Product Plan

## Positioning

ForgeUI V1 is an AI-native visual page composer and Design-to-Code platform for high-quality domestic marketing and campaign pages.

The product goal is not to replace Figma or become a generic CRUD low-code platform. ForgeUI focuses on one closed loop:

```text
Template / Prompt
  -> Page Schema
  -> Visual Canvas
  -> Drag / Inspector / AI Edit
  -> Design Token + Component Registry
  -> React + TypeScript Codegen
  -> Preview / Export
```

The core principle is: **visual freedom under structural constraints, with maintainable generated code**.

## V1 flagship scenario

The flagship experience is a domestic e-commerce campaign page, starting with a 618 digital-products promotion. The initial block set will cover hero, category navigation, coupons, flash sale, product grid, ranking, brand area, benefits, activity rules, footer, and mobile CTA.

## Product pillars

1. **Forge Design System** — layout primitives, business components, high-quality blocks, variants and style kits.
2. **Visual Canvas** — constrained drag-and-drop composition instead of arbitrary x/y positioning.
3. **Page Schema** — the single source of truth shared by Canvas, Inspector, Layers, AI and Codegen.
4. **AI Generate / AI Edit** — structured planning and tool calls that mutate validated schema operations, never arbitrary source rewriting.
5. **React Codegen** — deterministic React + TypeScript output that reuses registered components and design tokens.

## V1 platform boundary

V1 outputs responsive React Web for mobile, tablet and desktop. It does not implement React Native, Mini Program, Flutter or Vue renderers. The Page Schema stays renderer-neutral so additional renderers can be added later.

## V1 batches

- Batch 0 — Composer contracts: Page Schema, Layout, Registry metadata, Style Kit, Operations.
- Batch 1 — Forge Design System and flagship campaign page.
- Batch 2 — Visual Canvas, slots, layers, inspector, history and persistence.
- Batch 3 — AI Generate: Prompt -> Page Plan -> Page Schema.
- Batch 4 — AI Edit and structured Agent tools.
- Batch 5 — React Codegen V2 for Composer Schema.
- Batch 6 — Runtime Preview, Code View, Export and build validation.
- Batch 7 — Templates and local project lifecycle.
- Batch 8 — Quality, evals, E2E and visual regression.
- Batch 9 — Product polish and interview-ready documentation/demo.

## Architecture boundary

The existing deterministic D2C pipeline remains valuable infrastructure and should be reused rather than removed:

```text
Design IR / Token Resolver / Component Registry / Generation Plan / AST Codegen / Validation
```

V1 adds a Composer layer in front of it:

```text
Canvas / AI
  -> Composer Operation
  -> Composer Page Schema
  -> Registry / Token mapping
  -> existing deterministic generation infrastructure
```

This keeps the legacy generation work reusable while changing ForgeUI from a compiler-style workbench into a usable visual product.

## V1 non-goals

- pixel-level infinite canvas or arbitrary absolute positioning
- general-purpose backend CRUD builder
- multiplayer collaboration
- arbitrary npm execution or user-provided executable code
- full Figma editor/import compatibility
- multi-framework or multi-platform output in V1
- AI directly rewriting generated project files

## V1 acceptance loop

A successful V1 demo must support:

1. create a 618 campaign page from a template or prompt;
2. drag/reorder blocks and edit props in Inspector;
3. switch mobile/tablet/desktop preview;
4. use AI to insert, move, remove and update blocks through tools;
5. switch a Style Kit;
6. view deterministic React + TypeScript output;
7. export a buildable project.
