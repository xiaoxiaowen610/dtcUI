import { describe, expect, it } from 'vitest'
import {
  COMPOSER_SCHEMA_VERSION,
  composerOperationSchema,
  composerPageSchema,
  composerRegistrySchema,
  composerSlotDefinitionSchema,
  composerStyleKitSchema
} from './composer'

const productCard = {
  id: 'product-card-1',
  type: 'product-card',
  category: 'component' as const,
  props: {
    title: 'AI 摄影手机',
    price: 3999
  }
}

const validPage = {
  schemaVersion: COMPOSER_SCHEMA_VERSION,
  id: 'page-618',
  name: '618 数码大促',
  styleKit: 'commerce-festival',
  viewport: {
    mobile: 375,
    tablet: 768,
    desktop: 1440
  },
  root: {
    id: 'page-root',
    type: 'page-root',
    category: 'root' as const,
    children: [
      {
        id: 'hero-1',
        type: 'commerce-hero',
        category: 'block' as const,
        props: {
          title: '618 年中狂欢'
        }
      },
      {
        id: 'product-grid-1',
        type: 'product-grid',
        category: 'block' as const,
        layout: {
          display: 'grid' as const,
          columns: {
            mobile: 2,
            tablet: 3,
            desktop: 4
          },
          gap: { token: 'spacing.md' }
        },
        slots: {
          items: [productCard]
        }
      }
    ]
  }
}

describe('ForgeUI V1 composer contracts', () => {
  it('B00-UT-001 parses a responsive Page Schema', () => {
    const page = composerPageSchema.parse(validPage)
    expect(page.root.children?.[1]?.layout?.columns).toEqual({
      mobile: 2,
      tablet: 3,
      desktop: 4
    })
  })

  it('B00-UT-002 rejects a non page-root document root', () => {
    expect(
      composerPageSchema.safeParse({
        ...validPage,
        root: {
          ...validPage.root,
          type: 'section',
          category: 'layout'
        }
      }).success
    ).toBe(false)
  })

  it('B00-UT-003 rejects duplicate node IDs across children and slots', () => {
    expect(
      composerPageSchema.safeParse({
        ...validPage,
        root: {
          ...validPage.root,
          children: [
            ...validPage.root.children,
            {
              id: 'product-card-1',
              type: 'notice-bar',
              category: 'block'
            }
          ]
        }
      }).success
    ).toBe(false)
  })

  it('B00-UT-004 constrains responsive grids to four columns in V1', () => {
    const invalid = structuredClone(validPage)
    const grid = invalid.root.children[1]!
    grid.layout = {
      display: 'grid',
      columns: { mobile: 2, tablet: 3, desktop: 5 },
      gap: { token: 'spacing.md' }
    }
    expect(composerPageSchema.safeParse(invalid).success).toBe(false)
  })

  it('B00-UT-005 validates slot cardinality metadata', () => {
    expect(
      composerSlotDefinitionSchema.safeParse({
        name: 'items',
        accepts: ['product-card'],
        min: 4,
        max: 2
      }).success
    ).toBe(false)
  })

  it('B00-UT-006 validates registry metadata for Canvas, Inspector and AI', () => {
    const registry = composerRegistrySchema.parse({
      schemaVersion: COMPOSER_SCHEMA_VERSION,
      registryId: 'forge-commerce',
      registryVersion: '1.0.0',
      items: [
        {
          type: 'product-grid',
          name: '商品推荐',
          category: 'block',
          slots: [{ name: 'items', accepts: ['product-card'], min: 1, max: 20 }],
          capabilities: ['responsive', 'container', 'ai-editable'],
          inspector: {
            groups: [
              {
                id: 'layout',
                title: 'Layout',
                fields: [
                  {
                    path: 'layout.columns',
                    label: 'Columns',
                    type: 'number',
                    responsive: true
                  }
                ]
              }
            ]
          },
          ai: {
            description: '展示多个商品，适用于营销页商品推荐区域。',
            keywords: ['商品', '推荐'],
            useCases: ['618', '新人活动']
          }
        }
      ]
    })

    expect(registry.items[0]?.slots[0]?.accepts).toEqual(['product-card'])
  })

  it('B00-UT-007 validates Style Kit tokens and block defaults', () => {
    const styleKit = composerStyleKitSchema.parse({
      schemaVersion: COMPOSER_SCHEMA_VERSION,
      id: 'commerce-festival',
      name: 'Commerce Festival',
      description: '高对比、高转化的国内电商大促视觉。',
      tokens: {
        'color.brand': '#ff4d4f',
        'radius.card': '16px',
        'spacing.section': '24px'
      },
      blockDefaults: {
        'commerce-hero': { variant: 'campaign' },
        'product-card': { variant: 'festival' }
      }
    })

    expect(styleKit.blockDefaults?.['product-card']?.variant).toBe('festival')
  })

  it.each([
    {
      operationId: 'op-insert-1',
      actor: 'user',
      type: 'insert',
      parentId: 'page-root',
      index: 1,
      node: { id: 'coupon-1', type: 'coupon-section', category: 'block' }
    },
    {
      operationId: 'op-move-1',
      actor: 'ai',
      type: 'move',
      nodeId: 'product-grid-1',
      targetParentId: 'page-root',
      targetIndex: 1
    },
    {
      operationId: 'op-layout-1',
      actor: 'ai',
      type: 'update-layout',
      nodeId: 'product-grid-1',
      patch: { columns: { mobile: 2, desktop: 3 } }
    },
    {
      operationId: 'op-theme-1',
      actor: 'user',
      type: 'apply-style-kit',
      styleKit: 'youth-trend'
    }
  ])('B00-UT-008 parses operation $type', (operation) => {
    expect(composerOperationSchema.safeParse(operation).success).toBe(true)
  })
})
