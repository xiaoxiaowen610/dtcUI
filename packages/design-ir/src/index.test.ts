import { describe, expect, it } from 'vitest'
import { INPUT_LIMITS } from '@forge-ui/contracts'
import { createDesignDocument, DesignIrError, findNodeBySemantic, walkDesignNodes } from './index'

const minimalInput = {
  schemaVersion: '1.0',
  documentId: 'stable-document',
  source: { type: 'preset', name: 'test' },
  root: {
    name: 'Page',
    type: 'page',
    children: [{ name: 'Hero title', type: 'text', content: { kind: 'text', value: 'Hello' } }]
  }
} as const

describe('createDesignDocument', () => {
  it('BL-IR-001 creates stable generated IDs for the same source path', () => {
    const first = createDesignDocument(minimalInput)
    const second = createDesignDocument(minimalInput)

    expect(first.root.id).toBe(second.root.id)
    expect(first.root.children[0]?.id).toBe(second.root.children[0]?.id)
  })

  it('BL-IR-002 rejects duplicate explicit IDs with a typed code', () => {
    expect.assertions(2)
    try {
      createDesignDocument({
        ...minimalInput,
        root: {
          ...minimalInput.root,
          children: [
            { id: 'duplicate', name: 'One', type: 'text' },
            { id: 'duplicate', name: 'Two', type: 'text' }
          ]
        }
      })
    } catch (error) {
      expect(error).toBeInstanceOf(DesignIrError)
      expect((error as DesignIrError).code).toBe('DESIGN_DUPLICATE_ID')
    }
  })

  it('BL-IR-003 maps schema failures to DESIGN_SCHEMA_INVALID', () => {
    expect(() => createDesignDocument({ schemaVersion: '1.0' })).toThrowError(
      expect.objectContaining({ code: 'DESIGN_SCHEMA_INVALID' })
    )
  })

  it('BL-IR-004 rejects text beyond the documented maximum', () => {
    expect(() =>
      createDesignDocument({
        ...minimalInput,
        root: {
          ...minimalInput.root,
          content: { kind: 'text', value: 'x'.repeat(INPUT_LIMITS.maxTextLength + 1) }
        }
      })
    ).toThrowError(expect.objectContaining({ code: 'DESIGN_LIMIT_EXCEEDED' }))
  })

  it('BL-IR-005 rejects trees deeper than the documented maximum', () => {
    const root: Record<string, unknown> = { name: 'root', type: 'page' }
    let cursor = root
    for (let depth = 0; depth <= INPUT_LIMITS.maxDepth; depth += 1) {
      const child: Record<string, unknown> = { name: `level-${depth}`, type: 'layout' }
      cursor.children = [child]
      cursor = child
    }

    expect(() => createDesignDocument({ ...minimalInput, root })).toThrowError(
      expect.objectContaining({ code: 'DESIGN_LIMIT_EXCEEDED' })
    )
  })

  it('BL-IR-006 rejects serialized input beyond 5 MB', () => {
    expect(() =>
      createDesignDocument({
        ...minimalInput,
        metadata: { padding: 'x'.repeat(INPUT_LIMITS.maxBytes) }
      })
    ).toThrowError(expect.objectContaining({ code: 'DESIGN_LIMIT_EXCEEDED' }))
  })

  it('BL-IR-007 sorts tokens and assets and derives asset status', () => {
    const result = createDesignDocument({
      ...minimalInput,
      tokens: [
        { path: 'z.token', type: 'color', value: '#fff', level: 'semantic' },
        { path: 'a.token', type: 'color', value: '#000', level: 'primitive' }
      ],
      assets: [
        { id: 'z', type: 'image' },
        { id: 'a', type: 'image', localPath: 'assets/a.png' }
      ]
    })

    expect(result.tokens.map((token) => token.path)).toEqual(['a.token', 'z.token'])
    expect(result.assets.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 'a', status: 'resolved' },
      { id: 'z', status: 'missing' }
    ])
  })

  it('BL-IR-008 walks preorder and finds the first semantic node', () => {
    const result = createDesignDocument({
      ...minimalInput,
      root: {
        id: 'root',
        name: 'Page',
        type: 'page',
        children: [
          { id: 'one', name: 'One', type: 'section', semantic: 'target' },
          { id: 'two', name: 'Two', type: 'section', semantic: 'target' }
        ]
      }
    })

    expect(walkDesignNodes(result.root).map((node) => node.id)).toEqual(['root', 'one', 'two'])
    expect(findNodeBySemantic(result.root, 'target')?.id).toBe('one')
  })

  it('BL-IR-009 trims names and preserves explicit source IDs', () => {
    const result = createDesignDocument({
      ...minimalInput,
      root: { id: ' explicit ', name: '  Page  ', type: 'page' }
    })

    expect(result.root).toMatchObject({ id: 'explicit', name: 'Page' })
    expect(result.root.source.sourceId).toBe('explicit')
  })

  it('BL-IR-010 rejects node counts beyond the documented maximum', () => {
    expect(() =>
      createDesignDocument({
        ...minimalInput,
        root: {
          name: 'Page',
          type: 'page',
          children: Array.from({ length: INPUT_LIMITS.maxNodes }, (_, index) => ({
            name: `Node ${index}`,
            type: 'text'
          }))
        }
      })
    ).toThrowError(expect.objectContaining({ code: 'DESIGN_LIMIT_EXCEEDED' }))
  })
})
