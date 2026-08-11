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

  it('B02-STORE-005 hydrates a compatible persisted page without creating history', () => {
    const persisted = structuredClone(useComposerStore.getState().page)
    persisted.name = '恢复后的活动页'
    persisted.root.children![0]!.props = {
      ...persisted.root.children![0]!.props,
      title: '从 IndexedDB 恢复'
    }

    const hydrated = useComposerStore.getState().hydrate(persisted)
    const state = useComposerStore.getState()

    expect(hydrated.name).toBe('恢复后的活动页')
    expect(state.page.root.children?.[0]?.props?.title).toBe('从 IndexedDB 恢复')
    expect(state.past).toEqual([])
    expect(state.future).toEqual([])
  })

  it('B02-STORE-006 rejects persisted pages that violate the active Registry', () => {
    const persisted = structuredClone(useComposerStore.getState().page)
    persisted.root.children!.push({
      id: 'invalid-persisted-product',
      type: 'product-card',
      category: 'component',
      props: { title: '非法根节点' }
    })

    expect(() => useComposerStore.getState().hydrate(persisted)).toThrowError(
      /incompatible with the active Registry/
    )
  })
})
