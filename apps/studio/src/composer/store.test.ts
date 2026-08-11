import { beforeEach, describe, expect, it } from 'vitest'
import type { ComponentData } from '@puckeditor/core'
import { composerPageToPuckData } from './puckAdapter'
import { useComposerStore } from './store'

beforeEach(() => {
  useComposerStore.getState().reset()
})

describe('composer store', () => {
  it('B02-STORE-001 accepts a valid Puck field change and records history', () => {
    const state = useComposerStore.getState()
    const data = composerPageToPuckData(state.page)
    data.content[0]!.props = {
      ...data.content[0]!.props,
      title: '新的活动标题'
    }

    const result = useComposerStore.getState().syncFromPuck(data)
    const next = useComposerStore.getState()

    expect(result.ok).toBe(true)
    expect(result.operations.some((operation) => operation.type === 'update-props')).toBe(true)
    expect(next.page.root.children?.[0]?.props?.title).toBe('新的活动标题')
    expect(next.past).toHaveLength(1)
  })

  it('B02-STORE-002 rejects an invalid root ProductCard and provides rollback data', () => {
    const state = useComposerStore.getState()
    const data = composerPageToPuckData(state.page)
    data.content.push({
      type: 'ProductCard',
      props: {
        id: 'invalid-root-product',
        title: '非法根节点商品',
        price: 1,
        badge: 'invalid',
        image: 'https://example.com/invalid.png'
      }
    } as ComponentData)

    const result = useComposerStore.getState().syncFromPuck(data)
    const next = useComposerStore.getState()

    expect(result.ok).toBe(false)
    expect(next.page).toEqual(state.page)
    expect(next.rollbackData).toBeDefined()
    expect(next.lastError).toMatch(/Page root only accepts/)
  })

  it('B02-STORE-003 undo and redo restore Forge document snapshots', () => {
    const data = composerPageToPuckData(useComposerStore.getState().page)
    data.content[0]!.props = {
      ...data.content[0]!.props,
      title: 'History title'
    }
    useComposerStore.getState().syncFromPuck(data)

    const afterEdit = useComposerStore.getState().page
    expect(afterEdit.root.children?.[0]?.props?.title).toBe('History title')

    const undone = useComposerStore.getState().undo()
    expect(undone?.root.children?.[0]?.props?.title).toBe('爆款直降，限时抢购')
    expect(useComposerStore.getState().future).toHaveLength(1)

    const redone = useComposerStore.getState().redo()
    expect(redone?.root.children?.[0]?.props?.title).toBe('History title')
    expect(useComposerStore.getState().past).toHaveLength(1)
  })

  it('B02-STORE-004 reset restores the deterministic starter document', () => {
    const data = composerPageToPuckData(useComposerStore.getState().page)
    data.content = [data.content[2]!, data.content[0]!, data.content[1]!]
    useComposerStore.getState().syncFromPuck(data)

    const reset = useComposerStore.getState().reset()

    expect(reset.root.children?.map((node) => node.id)).toEqual([
      'hero-01',
      'products-01',
      'banner-01'
    ])
    expect(useComposerStore.getState().past).toEqual([])
    expect(useComposerStore.getState().future).toEqual([])
  })
})
