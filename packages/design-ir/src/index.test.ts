import { describe, expect, it } from 'vitest'
import { createDesignDocument, DesignIrError } from './index'

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
  it('creates stable generated IDs for the same source path', () => {
    const first = createDesignDocument(minimalInput)
    const second = createDesignDocument(minimalInput)

    expect(first.root.id).toBe(second.root.id)
    expect(first.root.children[0]?.id).toBe(second.root.children[0]?.id)
  })

  it('rejects duplicate explicit IDs', () => {
    expect(() =>
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
    ).toThrowError(DesignIrError)
  })
})
