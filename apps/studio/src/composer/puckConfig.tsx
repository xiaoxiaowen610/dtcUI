import type { ComponentData, Config, Slot } from '@puckeditor/core'

type ForgePuckProps = {
  HeroBlock: {
    eyebrow: string
    title: string
    subtitle: string
    actionText: string
    variant: 'campaign' | 'split' | 'centered'
  }
  PromoBanner: {
    title: string
    subtitle: string
    actionText: string
  }
  Section: {
    title: string
    content?: Slot
  }
  Grid: {
    columns: number
    items?: Slot
  }
  ProductGrid: {
    title: string
    subtitle: string
    columns: number
    variant: 'cards' | 'festival' | 'minimal'
    items?: Slot
  }
  ProductCard: {
    title: string
    price: number
    badge: string
    image: string
  }
  TextBlock: {
    text: string
  }
}

const productImage =
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=720&q=80'

function starterProduct(parentId: string): ComponentData {
  return {
    type: 'ProductCard',
    props: {
      id: `${parentId}-product-1`,
      title: 'AI 摄影手机',
      price: 3999,
      badge: '新品',
      image: productImage
    }
  }
}

export const forgePuckConfig: Config<
  ForgePuckProps,
  { pageName: string; styleKit: string },
  'marketing' | 'layout' | 'content'
> = {
  categories: {
    marketing: {
      title: '营销区块',
      components: ['HeroBlock', 'PromoBanner', 'ProductGrid'],
      defaultExpanded: true
    },
    layout: {
      title: '布局',
      components: ['Section', 'Grid'],
      defaultExpanded: true
    },
    content: {
      title: '内容组件',
      components: ['ProductCard', 'TextBlock'],
      defaultExpanded: true
    }
  },

  root: {
    fields: {
      pageName: { type: 'text', label: '页面名称' },
      styleKit: {
        type: 'select',
        label: 'Style Kit',
        options: [
          { label: 'Commerce Festival', value: 'commerce-festival' },
          { label: 'Youth Trend', value: 'youth-trend' },
          { label: 'Minimal Tech', value: 'minimal-tech' }
        ]
      }
    },
    defaultProps: {
      pageName: '618 数码大促',
      styleKit: 'commerce-festival'
    },
    render: ({ children }) => <main className="forgeCanvasPage">{children}</main>
  },

  components: {
    HeroBlock: {
      label: '活动主视觉',
      fields: {
        eyebrow: { type: 'text', label: '眉题' },
        title: { type: 'text', label: '标题', contentEditable: true },
        subtitle: { type: 'textarea', label: '副标题' },
        actionText: { type: 'text', label: '按钮文案' },
        variant: {
          type: 'select',
          label: 'Variant',
          options: [
            { label: 'Campaign', value: 'campaign' },
            { label: 'Split', value: 'split' },
            { label: 'Centered', value: 'centered' }
          ]
        }
      },
      defaultProps: {
        eyebrow: '618 数码狂欢',
        title: '爆款直降，限时抢购',
        subtitle: '热门数码好物最高立减 500 元',
        actionText: '立即抢购',
        variant: 'campaign'
      },
      render: ({ eyebrow, title, subtitle, actionText, variant }) => (
        <section className={`forgeHero forgeHero--${variant}`}>
          <div className="forgeHero__content">
            <span className="forgeHero__eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <button type="button">{actionText}</button>
          </div>
          <div className="forgeHero__visual" aria-hidden="true">
            <span>6</span>
            <span>1</span>
            <span>8</span>
          </div>
        </section>
      )
    },

    PromoBanner: {
      label: '活动横幅',
      fields: {
        title: { type: 'text', label: '标题', contentEditable: true },
        subtitle: { type: 'text', label: '副标题' },
        actionText: { type: 'text', label: '按钮文案' }
      },
      defaultProps: {
        title: '会员专享加码',
        subtitle: '下单再享 12 期免息',
        actionText: '查看活动'
      },
      render: ({ title, subtitle, actionText }) => (
        <section className="forgePromoBanner">
          <div>
            <span>MEMBER+</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button">{actionText}</button>
        </section>
      )
    },

    Section: {
      label: 'Section',
      fields: {
        title: { type: 'text', label: '区域标题' },
        content: {
          type: 'slot',
          label: 'Content',
          allow: ['TextBlock', 'Grid']
        }
      },
      defaultProps: {
        title: '自定义区域'
      },
      render: ({ title, content: Content }) => (
        <section className="forgeSection">
          <header className="forgeSection__header">
            <h2>{title}</h2>
          </header>
          {Content ? (
            <Content minEmptyHeight={120} />
          ) : (
            <div className="forgeEmptySlot">拖入文本或 Grid</div>
          )}
        </section>
      )
    },

    Grid: {
      label: 'Grid',
      fields: {
        columns: { type: 'number', label: '列数', min: 1, max: 4 },
        items: {
          type: 'slot',
          label: 'Items',
          allow: ['ProductCard', 'TextBlock']
        }
      },
      defaultProps: {
        columns: 3
      },
      render: ({ columns, items: Items }) =>
        Items ? (
          <Items
            className="forgeGenericGrid"
            collisionAxis="dynamic"
            minEmptyHeight={128}
            style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, columns || 1))}, 1fr)` }}
          />
        ) : (
          <div className="forgeEmptySlot">拖入内容组件</div>
        )
    },

    ProductGrid: {
      label: '商品推荐',
      fields: {
        title: { type: 'text', label: '标题', contentEditable: true },
        subtitle: { type: 'text', label: '副标题' },
        columns: { type: 'number', label: '列数', min: 2, max: 4 },
        variant: {
          type: 'select',
          label: 'Variant',
          options: [
            { label: 'Cards', value: 'cards' },
            { label: 'Festival', value: 'festival' },
            { label: 'Minimal', value: 'minimal' }
          ]
        },
        items: {
          type: 'slot',
          label: 'Products',
          allow: ['ProductCard']
        }
      },
      defaultProps: {
        title: '爆款推荐',
        subtitle: '精选热门数码好物',
        columns: 4,
        variant: 'cards'
      },
      resolveData: async ({ props }, { trigger }) => {
        if (trigger !== 'insert') return { props }
        const parentId = String((props as unknown as Record<string, unknown>).id ?? 'product-grid')
        return {
          props: {
            ...props,
            items: [starterProduct(parentId)]
          } as unknown as typeof props
        }
      },
      render: ({ title, subtitle, columns, variant, items: Items }) => (
        <section className={`forgeProductGrid forgeProductGrid--${variant}`}>
          <header className="forgeSection__header forgeSection__header--split">
            <div>
              <span>HOT PICKS</span>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
            <strong>精选</strong>
          </header>
          {Items ? (
            <Items
              className="forgeProductGrid__items"
              collisionAxis="dynamic"
              minEmptyHeight={180}
              style={{ gridTemplateColumns: `repeat(${Math.max(2, Math.min(4, columns || 2))}, 1fr)` }}
            />
          ) : (
            <div className="forgeEmptySlot">拖入商品卡</div>
          )}
        </section>
      )
    },

    ProductCard: {
      label: '商品卡',
      fields: {
        title: { type: 'text', label: '商品名称', contentEditable: true },
        price: { type: 'number', label: '价格', min: 0 },
        badge: { type: 'text', label: '标签' },
        image: { type: 'text', label: '商品图 URL' }
      },
      defaultProps: {
        title: 'AI 摄影手机',
        price: 3999,
        badge: '新品',
        image: productImage
      },
      render: ({ title, price, badge, image }) => (
        <article className="forgeProductCard">
          <div className="forgeProductCard__media">
            <img alt="" src={image} />
            <span>{badge}</span>
          </div>
          <div className="forgeProductCard__body">
            <h3>{title}</h3>
            <div className="forgeProductCard__price">
              <small>¥</small>
              <strong>{price}</strong>
            </div>
          </div>
        </article>
      )
    },

    TextBlock: {
      label: '文本',
      fields: {
        text: { type: 'textarea', label: '文本' }
      },
      defaultProps: {
        text: '可编辑文本内容'
      },
      render: ({ text }) => <p className="forgeTextBlock">{text}</p>
    }
  }
}
