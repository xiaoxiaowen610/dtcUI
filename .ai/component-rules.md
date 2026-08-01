# Component rules

1. Validate Registry schema, allowed import roots, exports, props, and capabilities first.
2. Match in this order: exact Source Key, compatible adapter, registered recipe, native, manual review.
3. A score cannot override a hard incompatibility.
4. Unknown capability must degrade visibly; never invent an import or prop.
5. Keep ForgeUI workbench components separate from external Registry examples.
