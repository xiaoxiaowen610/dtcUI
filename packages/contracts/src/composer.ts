import { z } from 'zod'

export const COMPOSER_SCHEMA_VERSION = '1.0' as const

export const composerNodeCategorySchema = z.enum([
  'root',
  'layout',
  'primitive',
  'component',
  'block',
  'overlay'
])

export type ComposerNodeCategory = z.infer<typeof composerNodeCategorySchema>

export const composerBreakpointSchema = z.enum(['mobile', 'tablet', 'desktop'])
export type ComposerBreakpoint = z.infer<typeof composerBreakpointSchema>

export const tokenReferenceSchema = z
  .object({
    token: z.string().trim().min(1)
  })
  .strict()

export const customValueSchema = z
  .object({
    value: z.union([z.string(), z.number()])
  })
  .strict()

export const composerStyleValueSchema = z.union([tokenReferenceSchema, customValueSchema])
export type ComposerStyleValue = z.infer<typeof composerStyleValueSchema>

function responsiveValueSchema<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.union([
    valueSchema,
    z
      .object({
        mobile: valueSchema.optional(),
        tablet: valueSchema.optional(),
        desktop: valueSchema.optional()
      })
      .strict()
      .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
        message: 'A responsive value must define at least one breakpoint.'
      })
  ])
}

const columnsValueSchema = z.number().int().min(1).max(4)
const spacingValueSchema = composerStyleValueSchema

export const responsiveColumnsSchema = responsiveValueSchema(columnsValueSchema)
export const responsiveSpacingValueSchema = responsiveValueSchema(spacingValueSchema)
export const responsiveBooleanSchema = responsiveValueSchema(z.boolean())

export const composerSpacingSchema = z
  .object({
    top: responsiveSpacingValueSchema.optional(),
    right: responsiveSpacingValueSchema.optional(),
    bottom: responsiveSpacingValueSchema.optional(),
    left: responsiveSpacingValueSchema.optional(),
    x: responsiveSpacingValueSchema.optional(),
    y: responsiveSpacingValueSchema.optional(),
    all: responsiveSpacingValueSchema.optional()
  })
  .strict()
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: 'Spacing must define at least one side.'
  })

export type ComposerSpacing = z.infer<typeof composerSpacingSchema>

export const composerLayoutSchema = z
  .object({
    display: z.enum(['block', 'flex', 'grid']).optional(),
    direction: z.enum(['row', 'column']).optional(),
    wrap: z.enum(['nowrap', 'wrap']).optional(),
    columns: responsiveColumnsSchema.optional(),
    gap: responsiveSpacingValueSchema.optional(),
    align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
    justify: z.enum(['start', 'center', 'end', 'between', 'around']).optional(),
    width: z.enum(['auto', 'full', 'content']).optional(),
    maxWidth: z.enum(['sm', 'md', 'lg', 'xl', 'full']).optional(),
    padding: composerSpacingSchema.optional(),
    margin: composerSpacingSchema.optional()
  })
  .strict()

export type ComposerLayout = z.infer<typeof composerLayoutSchema>

export const composerNodeStyleSchema = z
  .object({
    background: composerStyleValueSchema.optional(),
    color: composerStyleValueSchema.optional(),
    radius: composerStyleValueSchema.optional(),
    shadow: composerStyleValueSchema.optional(),
    border: composerStyleValueSchema.optional(),
    gradient: composerStyleValueSchema.optional()
  })
  .strict()

export type ComposerNodeStyle = z.infer<typeof composerNodeStyleSchema>

export const composerResponsiveSchema = z
  .object({
    visibility: responsiveBooleanSchema.optional()
  })
  .strict()

export type ComposerResponsive = z.infer<typeof composerResponsiveSchema>

export const composerNodeMetadataSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    locked: z.boolean().optional(),
    source: z.enum(['blank', 'template', 'ai', 'user']).optional()
  })
  .strict()

export type ComposerNodeMetadata = z.infer<typeof composerNodeMetadataSchema>

export type ComposerNode = {
  id: string
  type: string
  category?: ComposerNodeCategory | undefined
  props?: Record<string, unknown> | undefined
  layout?: ComposerLayout | undefined
  style?: ComposerNodeStyle | undefined
  responsive?: ComposerResponsive | undefined
  children?: ComposerNode[] | undefined
  slots?: Record<string, ComposerNode[]> | undefined
  metadata?: ComposerNodeMetadata | undefined
}

export const composerNodeSchema: z.ZodType<ComposerNode> = z.lazy(() =>
  z
    .object({
      id: z.string().trim().min(1),
      type: z.string().trim().min(1),
      category: composerNodeCategorySchema.optional(),
      props: z.record(z.string(), z.unknown()).optional(),
      layout: composerLayoutSchema.optional(),
      style: composerNodeStyleSchema.optional(),
      responsive: composerResponsiveSchema.optional(),
      children: z.array(composerNodeSchema).optional(),
      slots: z.record(z.string().min(1), z.array(composerNodeSchema)).optional(),
      metadata: composerNodeMetadataSchema.optional()
    })
    .strict()
)

export const composerViewportSchema = z
  .object({
    mobile: z.number().int().min(240).max(767),
    tablet: z.number().int().min(600).max(1199),
    desktop: z.number().int().min(960).max(2560)
  })
  .strict()
  .refine((value) => value.mobile < value.tablet && value.tablet < value.desktop, {
    message: 'Viewport widths must be ordered mobile < tablet < desktop.'
  })

export type ComposerViewport = z.infer<typeof composerViewportSchema>

function collectNodeIds(root: ComposerNode) {
  const ids: string[] = []
  const visit = (node: ComposerNode) => {
    ids.push(node.id)
    for (const child of node.children ?? []) visit(child)
    for (const slotChildren of Object.values(node.slots ?? {})) {
      for (const child of slotChildren) visit(child)
    }
  }
  visit(root)
  return ids
}

export const composerPageSchema = z
  .object({
    schemaVersion: z.literal(COMPOSER_SCHEMA_VERSION),
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    styleKit: z.string().trim().min(1),
    viewport: composerViewportSchema,
    root: composerNodeSchema,
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.root.type !== 'page-root' || value.root.category !== 'root') {
      context.addIssue({
        code: 'custom',
        path: ['root'],
        message: 'Composer pages must use a page-root node with category root.'
      })
    }

    const seen = new Set<string>()
    for (const id of collectNodeIds(value.root)) {
      if (seen.has(id)) {
        context.addIssue({
          code: 'custom',
          path: ['root'],
          message: `Composer node IDs must be unique. Duplicate: ${id}`
        })
        break
      }
      seen.add(id)
    }
  })

export type ComposerPage = z.infer<typeof composerPageSchema>

export const composerSlotDefinitionSchema = z
  .object({
    name: z.string().trim().min(1),
    accepts: z.array(z.string().trim().min(1)).min(1),
    min: z.number().int().min(0).optional(),
    max: z.number().int().positive().optional(),
    required: z.boolean().optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
      context.addIssue({
        code: 'custom',
        path: ['max'],
        message: 'Slot max must be greater than or equal to min.'
      })
    }
  })

export type ComposerSlotDefinition = z.infer<typeof composerSlotDefinitionSchema>

export const composerCapabilitySchema = z.enum([
  'editable-content',
  'editable-style',
  'responsive',
  'repeatable',
  'container',
  'data-source',
  'ai-editable'
])

export type ComposerCapability = z.infer<typeof composerCapabilitySchema>

export const inspectorFieldSchema = z
  .object({
    path: z.string().trim().min(1),
    label: z.string().trim().min(1),
    type: z.enum(['text', 'textarea', 'number', 'select', 'switch', 'token', 'image', 'products']),
    options: z.array(z.string().trim().min(1)).optional(),
    responsive: z.boolean().optional()
  })
  .strict()

export const inspectorGroupSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    fields: z.array(inspectorFieldSchema)
  })
  .strict()

export const composerInspectorSchema = z
  .object({
    groups: z.array(inspectorGroupSchema)
  })
  .strict()

export type ComposerInspector = z.infer<typeof composerInspectorSchema>

export const composerAiMetadataSchema = z
  .object({
    description: z.string().trim().min(1),
    keywords: z.array(z.string().trim().min(1)).default([]),
    useCases: z.array(z.string().trim().min(1)).default([]),
    recommendedBefore: z.array(z.string().trim().min(1)).optional(),
    recommendedAfter: z.array(z.string().trim().min(1)).optional()
  })
  .strict()

export type ComposerAiMetadata = z.infer<typeof composerAiMetadataSchema>

export const composerRegistryItemSchema = z
  .object({
    type: z.string().trim().min(1),
    name: z.string().trim().min(1),
    category: composerNodeCategorySchema,
    exposable: z.boolean().default(true),
    defaultProps: z.record(z.string(), z.unknown()).default({}),
    variants: z.array(z.string().trim().min(1)).default([]),
    slots: z.array(composerSlotDefinitionSchema).default([]),
    capabilities: z.array(composerCapabilitySchema).default([]),
    inspector: composerInspectorSchema.optional(),
    ai: composerAiMetadataSchema.optional()
  })
  .strict()

export type ComposerRegistryItem = z.infer<typeof composerRegistryItemSchema>

export const composerRegistrySchema = z
  .object({
    schemaVersion: z.literal(COMPOSER_SCHEMA_VERSION),
    registryId: z.string().trim().min(1),
    registryVersion: z.string().trim().min(1),
    items: z.array(composerRegistryItemSchema).min(1)
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>()
    value.items.forEach((item, index) => {
      if (seen.has(item.type)) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'type'],
          message: `Composer registry types must be unique. Duplicate: ${item.type}`
        })
      }
      seen.add(item.type)
    })
  })

export type ComposerRegistry = z.infer<typeof composerRegistrySchema>

export const styleKitTokenValueSchema = z.union([z.string(), z.number(), z.boolean()])

export const composerStyleKitSchema = z
  .object({
    schemaVersion: z.literal(COMPOSER_SCHEMA_VERSION),
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    tokens: z.record(z.string().trim().min(1), styleKitTokenValueSchema),
    blockDefaults: z
      .record(
        z.string().trim().min(1),
        z
          .object({
            variant: z.string().trim().min(1).optional(),
            props: z.record(z.string(), z.unknown()).optional()
          })
          .strict()
      )
      .optional()
  })
  .strict()

export type ComposerStyleKit = z.infer<typeof composerStyleKitSchema>

const operationBaseSchema = z.object({
  operationId: z.string().trim().min(1),
  actor: z.enum(['user', 'ai', 'system']).default('user')
})

export const insertComposerOperationSchema = operationBaseSchema.extend({
  type: z.literal('insert'),
  parentId: z.string().trim().min(1),
  slot: z.string().trim().min(1).optional(),
  index: z.number().int().min(0),
  node: composerNodeSchema
})

export const removeComposerOperationSchema = operationBaseSchema.extend({
  type: z.literal('remove'),
  nodeId: z.string().trim().min(1)
})

export const moveComposerOperationSchema = operationBaseSchema.extend({
  type: z.literal('move'),
  nodeId: z.string().trim().min(1),
  targetParentId: z.string().trim().min(1),
  targetSlot: z.string().trim().min(1).optional(),
  targetIndex: z.number().int().min(0)
})

export const updatePropsComposerOperationSchema = operationBaseSchema.extend({
  type: z.literal('update-props'),
  nodeId: z.string().trim().min(1),
  patch: z.record(z.string(), z.unknown())
})

export const updateLayoutComposerOperationSchema = operationBaseSchema.extend({
  type: z.literal('update-layout'),
  nodeId: z.string().trim().min(1),
  patch: composerLayoutSchema.partial()
})

export const updateStyleComposerOperationSchema = operationBaseSchema.extend({
  type: z.literal('update-style'),
  nodeId: z.string().trim().min(1),
  patch: composerNodeStyleSchema.partial()
})

export const applyStyleKitComposerOperationSchema = operationBaseSchema.extend({
  type: z.literal('apply-style-kit'),
  styleKit: z.string().trim().min(1)
})

export const composerOperationSchema = z.discriminatedUnion('type', [
  insertComposerOperationSchema,
  removeComposerOperationSchema,
  moveComposerOperationSchema,
  updatePropsComposerOperationSchema,
  updateLayoutComposerOperationSchema,
  updateStyleComposerOperationSchema,
  applyStyleKitComposerOperationSchema
])

export type ComposerOperation = z.infer<typeof composerOperationSchema>
