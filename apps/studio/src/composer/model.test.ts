import { describe, expect, it } from 'vitest'
import type { ComposerOperation } from '@forge-ui/contracts/composer'
import { starterComposerPage, starterComposerRegistry } from './catalog'
import {
  ComposerModelError,
  applyComposerOperation,
  findComposerLocation,
  findComposerNode,
  validateComposerPageAgainstRegistry,
  validateDrop
} from './model'

type OperationInput = ComposerOperation extends infer Operation
  ? Operation extends ComposerOperation
    ? Omit<Operation, 'operationId' | 'actor'>
    : never
  : never

function operation(value: OperationInput): ComposerOperation {
  return {
    ...value,
    operationId: `test-${value.type}`,
    actor: 'user'
  } as ComposerOperation
}

describe('composer model', () => {
  it('B02-MODEL-001 accepts the starter page against the starter registry', () => {
    expect(validateComposerPageAgainstRegistry(starterComposerPage, starterComposerRegistry)).toEqual(
      []
    )
  })

  it('B02-MODEL-002 allows blocks at root but rejects leaf components at root', () => {
    expect(
      validateDrop(starterComposerPage, starterComposerRegistry, 'promo-banner', 'page-root')
        .allowed
    ).toBe(true)
    expect(
      validateDrop(starterComposerPage, starterComposerRegistry, 'product-card', 'page-root')
        .allowed
    ).toBe(false)
  })

  it('B02-MODEL-003 enforces ProductGrid slot type rules', () => {
    expect(
      validateDrop(
        starterComposerPage,
        starterComposerRegistry,
        'product-card',
        'products-01',
        'items'
      ).allowed
    ).toBe(true)
    expect(
      validateDrop(
        starterComposerPage,
        starterComposerRegistry,
        'text-block',
        'products-01',
        'items'
      ).allowed
    ).toBe(false)
  })

  it('B02-MODEL-004 inserts a registered block using an operation', () => {
    const next = applyComposerOperation(
      starterComposerPage,
      starterComposerRegistry,
      operation({
        type: 'insert',
        parentId: 'page-root',
        index: 1,
        node: {
          id: 'banner-new',
          type: 'promo-banner',
          category: 'block',
          props: { title: '新增 Banner' }
        }
      })
    )

    expect(next.root.children?.[1]?.id).toBe('banner-new')
    expect(starterComposerPage.root.children?.[1]?.id).toBe('products-01')
  })

  it('B02-MODEL-005 moves an existing node without changing its stable id', () => {
    const next = applyComposerOperation(
      starterComposerPage,
      starterComposerRegistry,
      operation({
        type: 'move',
        nodeId: 'banner-01',
        targetParentId: 'page-root',
        targetIndex: 1
      })
    )

    expect(next.root.children?.map((node) => node.id)).toEqual([
      'hero-01',
      'banner-01',
      'products-01'
    ])
    expect(findComposerLocation(next.root, 'banner-01')).toEqual({
      parentId: 'page-root',
      index: 1
    })
  })

  it('B02-MODEL-006 updates props without mutating the original document', () => {
    const next = applyComposerOperation(
      starterComposerPage,
      starterComposerRegistry,
      operation({
        type: 'update-props',
        nodeId: 'hero-01',
        patch: { title: '新的活动标题' }
      })
    )

    expect(findComposerNode(next.root, 'hero-01')?.props?.title).toBe('新的活动标题')
    expect(findComposerNode(starterComposerPage.root, 'hero-01')?.props?.title).toBe(
      '爆款直降，限时抢购'
    )
  })

  it('B02-MODEL-007 prevents duplicate node ids on insert', () => {
    expect(() =>
      applyComposerOperation(
        starterComposerPage,
        starterComposerRegistry,
        operation({
          type: 'insert',
          parentId: 'page-root',
          index: 0,
          node: {
            id: 'hero-01',
            type: 'promo-banner',
            category: 'block'
          }
        })
      )
    ).toThrowError(ComposerModelError)
  })

  it('B02-MODEL-008 prevents moving a node into its own subtree', () => {
    expect(() =>
      applyComposerOperation(
        starterComposerPage,
        starterComposerRegistry,
        operation({
          type: 'move',
          nodeId: 'products-01',
          targetParentId: 'product-01',
          targetIndex: 0
        })
      )
    ).toThrowError(/own subtree/)
  })

  it('B02-MODEL-009 protects required slots from invalid removal', () => {
    let page = starterComposerPage
    for (const nodeId of ['product-04', 'product-03', 'product-02']) {
      page = applyComposerOperation(
        page,
        starterComposerRegistry,
        operation({ type: 'remove', nodeId })
      )
    }

    expect(() =>
      applyComposerOperation(
        page,
        starterComposerRegistry,
        operation({ type: 'remove', nodeId: 'product-01' })
      )
    ).toThrowError(/requires at least 1/)
  })
})
