import { describe, expect, it } from 'vitest'
import type { ComponentData } from '@puckeditor/core'
import { starterComposerPage, starterComposerRegistry } from './catalog'
import {
  composerPageToPuckData,
  diffComposerPages,
  puckDataToComposerPage
} from './puckAdapter'

function operationId() {
  let value = 0
  return () => `diff-${++value}`
}

describe('Puck composer adapter', () => {
  it('B02-ADAPTER-001 round-trips the starter page without losing Forge metadata', () => {
    const data = composerPageToPuckData(starterComposerPage)
    const restored = puckDataToComposerPage(data, starterComposerPage, starterComposerRegistry)

    expect(restored).toEqual(starterComposerPage)
  })

  it('B02-ADAPTER-002 translates a Puck field edit into update-props', () => {
    const data = composerPageToPuckData(starterComposerPage)
    const hero = data.content[0]!
    hero.props = { ...hero.props, title: 'Puck 修改后的标题' }

    const next = puckDataToComposerPage(data, starterComposerPage, starterComposerRegistry)
    const operations = diffComposerPages(starterComposerPage, next, operationId())

    expect(operations).toContainEqual(
      expect.objectContaining({
        type: 'update-props',
        nodeId: 'hero-01',
        patch: expect.objectContaining({ title: 'Puck 修改后的标题' })
      })
    )
  })

  it('B02-ADAPTER-003 translates root reordering into stable-id move operations', () => {
    const data = composerPageToPuckData(starterComposerPage)
    data.content = [data.content[0]!, data.content[2]!, data.content[1]!]

    const next = puckDataToComposerPage(data, starterComposerPage, starterComposerRegistry)
    const operations = diffComposerPages(starterComposerPage, next, operationId())

    expect(operations.some((candidate) => candidate.type === 'move' && candidate.nodeId === 'banner-01'))
      .toBe(true)
  })

  it('B02-ADAPTER-004 converts nested Slot data back to Forge slots', () => {
    const data = composerPageToPuckData(starterComposerPage)
    const productGrid = data.content[1]!
    const items = productGrid.props.items as ComponentData[]
    items.push({
      type: 'ProductCard',
      props: {
        id: 'product-added',
        title: '新增商品',
        price: 899,
        badge: '加购',
        image: 'https://example.com/product.png'
      }
    })

    const next = puckDataToComposerPage(data, starterComposerPage, starterComposerRegistry)
    const operations = diffComposerPages(starterComposerPage, next, operationId())

    expect(next.root.children?.[1]?.slots?.items?.at(-1)?.id).toBe('product-added')
    expect(operations).toContainEqual(
      expect.objectContaining({
        type: 'insert',
        parentId: 'products-01',
        slot: 'items',
        node: expect.objectContaining({ id: 'product-added', type: 'product-card' })
      })
    )
  })

  it('B02-ADAPTER-005 preserves hidden Forge layout metadata across Puck', () => {
    const page = structuredClone(starterComposerPage)
    page.root.children![0]!.layout = {
      display: 'flex',
      direction: 'column',
      gap: { token: 'spacing.lg' }
    }

    const data = composerPageToPuckData(page)
    const restored = puckDataToComposerPage(data, page, starterComposerRegistry)

    expect(restored.root.children?.[0]?.layout).toEqual(page.root.children?.[0]?.layout)
  })
})
