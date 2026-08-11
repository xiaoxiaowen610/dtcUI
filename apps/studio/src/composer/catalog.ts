import {
  composerPageSchema,
  composerRegistrySchema,
  type ComposerNode,
  type ComposerPage,
  type ComposerRegistry
} from '@forge-ui/contracts/composer'

function productCard(id: string, title: string, price: number): ComposerNode {
  return {
    id,
    type: 'product-card',
    category: 'component',
    props: {
      title,
      price,
      badge: '限时',
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=720&q=80'
    },
    metadata: { label: title, source: 'template' }
  }
}

export const starterComposerRegistry: ComposerRegistry = composerRegistrySchema.parse({
  schemaVersion: '1.0',
  registryId: 'forge-v1-starter',
  registryVersion: '0.1.0',
  items: [
    {
      type: 'hero-block',
      name: '活动主视觉',
      category: 'block',
      exposable: true,
      defaultProps: {
        eyebrow: '618 数码狂欢',
        title: '爆款直降，限时抢购',
        subtitle: '热门数码好物最高立减 500 元',
        actionText: '立即抢购',
        variant: 'campaign'
      },
      variants: ['campaign', 'split', 'centered'],
      capabilities: ['editable-content', 'editable-style', 'responsive', 'ai-editable'],
      inspector: {
        groups: [
          {
            id: 'content',
            title: 'Content',
            fields: [
              { path: 'props.eyebrow', label: '眉题', type: 'text' },
              { path: 'props.title', label: '标题', type: 'text' },
              { path: 'props.subtitle', label: '副标题', type: 'textarea' },
              { path: 'props.actionText', label: '按钮文案', type: 'text' }
            ]
          },
          {
            id: 'appearance',
            title: 'Appearance',
            fields: [
              {
                path: 'props.variant',
                label: 'Variant',
                type: 'select',
                options: ['campaign', 'split', 'centered']
              }
            ]
          }
        ]
      },
      ai: {
        description: '页面首屏营销主视觉，用于活动标题、利益点和主 CTA。',
        keywords: ['hero', 'banner', '活动', '主视觉'],
        useCases: ['618', '双11', '新品活动']
      }
    },
    {
      type: 'promo-banner',
      name: '活动横幅',
      category: 'block',
      exposable: true,
      defaultProps: {
        title: '会员专享加码',
        subtitle: '下单再享 12 期免息',
        actionText: '查看活动'
      },
      variants: ['gradient', 'minimal'],
      capabilities: ['editable-content', 'editable-style', 'responsive', 'ai-editable'],
      inspector: {
        groups: [
          {
            id: 'content',
            title: 'Content',
            fields: [
              { path: 'props.title', label: '标题', type: 'text' },
              { path: 'props.subtitle', label: '副标题', type: 'text' },
              { path: 'props.actionText', label: '按钮文案', type: 'text' }
            ]
          }
        ]
      },
      ai: {
        description: '页面中段促销横幅，适合承接会员、免息或满减利益点。',
        keywords: ['banner', '促销', '免息'],
        useCases: ['活动页', '商品页']
      }
    },
    {
      type: 'section',
      name: 'Section',
      category: 'layout',
      exposable: true,
      defaultProps: { title: '自定义区域' },
      variants: [],
      slots: [
        {
          name: 'content',
          accepts: ['text-block', 'grid'],
          min: 0,
          max: 8
        }
      ],
      capabilities: ['container', 'responsive', 'ai-editable'],
      inspector: {
        groups: [
          {
            id: 'content',
            title: 'Content',
            fields: [{ path: 'props.title', label: '区域标题', type: 'text' }]
          }
        ]
      },
      ai: {
        description: '通用结构化页面区域，可承载文本或网格布局。',
        keywords: ['section', '区域', '容器'],
        useCases: ['自定义布局']
      }
    },
    {
      type: 'grid',
      name: 'Grid',
      category: 'layout',
      exposable: true,
      defaultProps: { columns: 3 },
      variants: [],
      slots: [
        {
          name: 'items',
          accepts: ['product-card', 'text-block'],
          min: 0,
          max: 8
        }
      ],
      capabilities: ['container', 'responsive', 'ai-editable'],
      inspector: {
        groups: [
          {
            id: 'layout',
            title: 'Layout',
            fields: [
              {
                path: 'props.columns',
                label: '列数',
                type: 'select',
                options: ['2', '3', '4'],
                responsive: true
              }
            ]
          }
        ]
      },
      ai: {
        description: '响应式网格布局，可组合商品卡或文字内容。',
        keywords: ['grid', '网格', '多列'],
        useCases: ['商品列表', '内容列表']
      }
    },
    {
      type: 'product-grid',
      name: '商品推荐',
      category: 'block',
      exposable: true,
      defaultProps: {
        title: '爆款推荐',
        subtitle: '精选热门数码好物',
        columns: 4,
        variant: 'cards'
      },
      variants: ['cards', 'festival', 'minimal'],
      slots: [
        {
          name: 'items',
          accepts: ['product-card'],
          min: 1,
          max: 8,
          required: true
        }
      ],
      capabilities: ['container', 'repeatable', 'responsive', 'ai-editable'],
      inspector: {
        groups: [
          {
            id: 'content',
            title: 'Content',
            fields: [
              { path: 'props.title', label: '标题', type: 'text' },
              { path: 'props.subtitle', label: '副标题', type: 'text' }
            ]
          },
          {
            id: 'layout',
            title: 'Layout',
            fields: [
              {
                path: 'props.columns',
                label: '列数',
                type: 'select',
                options: ['2', '3', '4'],
                responsive: true
              },
              {
                path: 'props.variant',
                label: 'Variant',
                type: 'select',
                options: ['cards', 'festival', 'minimal']
              }
            ]
          }
        ]
      },
      ai: {
        description: '完整商品推荐区块，包含标题和可排序商品卡 Slot。',
        keywords: ['商品', '推荐', 'product grid'],
        useCases: ['618', '商品推荐', '爆款专区'],
        recommendedAfter: ['hero-block']
      }
    },
    {
      type: 'product-card',
      name: '商品卡',
      category: 'component',
      exposable: true,
      defaultProps: {
        title: 'AI 摄影手机',
        price: 3999,
        badge: '新品',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=720&q=80'
      },
      variants: ['default', 'festival', 'minimal'],
      capabilities: ['editable-content', 'editable-style', 'ai-editable'],
      inspector: {
        groups: [
          {
            id: 'content',
            title: 'Content',
            fields: [
              { path: 'props.title', label: '商品名称', type: 'text' },
              { path: 'props.price', label: '价格', type: 'number' },
              { path: 'props.badge', label: '标签', type: 'text' },
              { path: 'props.image', label: '商品图', type: 'image' }
            ]
          }
        ]
      },
      ai: {
        description: '单个商品卡片，仅用于允许商品卡的 Slot。',
        keywords: ['商品卡', 'product card'],
        useCases: ['商品推荐', '秒杀']
      }
    },
    {
      type: 'text-block',
      name: '文本',
      category: 'primitive',
      exposable: true,
      defaultProps: { text: '可编辑文本内容' },
      variants: [],
      capabilities: ['editable-content', 'ai-editable'],
      inspector: {
        groups: [
          {
            id: 'content',
            title: 'Content',
            fields: [{ path: 'props.text', label: '文本', type: 'textarea' }]
          }
        ]
      },
      ai: {
        description: '基础文本物料，用于结构化布局内部。',
        keywords: ['text', '文本'],
        useCases: ['补充说明']
      }
    }
  ]
})

export const starterComposerPage: ComposerPage = composerPageSchema.parse({
  schemaVersion: '1.0',
  id: 'page-618-demo',
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
    category: 'root',
    children: [
      {
        id: 'hero-01',
        type: 'hero-block',
        category: 'block',
        props: {
          eyebrow: '618 数码狂欢',
          title: '爆款直降，限时抢购',
          subtitle: '热门数码好物最高立减 500 元，领券叠加更优惠',
          actionText: '立即抢购',
          variant: 'campaign'
        },
        metadata: { label: '618 Hero', source: 'template' }
      },
      {
        id: 'products-01',
        type: 'product-grid',
        category: 'block',
        props: {
          title: '爆款推荐',
          subtitle: '编辑器拖拽、排序和属性修改都通过统一 Page Schema 回写',
          columns: 4,
          variant: 'cards'
        },
        slots: {
          items: [
            productCard('product-01', '轻薄性能本', 5999),
            productCard('product-02', '旗舰降噪耳机', 1299),
            productCard('product-03', 'AI 摄影手机', 3999),
            productCard('product-04', '便携游戏掌机', 2499)
          ]
        },
        metadata: { label: '爆款推荐', source: 'template' }
      },
      {
        id: 'banner-01',
        type: 'promo-banner',
        category: 'block',
        props: {
          title: '会员专享加码',
          subtitle: '下单再享 12 期免息，今晚 24:00 截止',
          actionText: '查看活动'
        },
        metadata: { label: '会员加码', source: 'template' }
      }
    ]
  },
  metadata: {
    purpose: 'batch-02-canvas-foundation'
  }
})
