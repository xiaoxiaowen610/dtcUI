import { composerPageSchema, type ComposerPage } from '@forge-ui/contracts/composer'

const DATABASE_NAME = 'forgeui-v1'
const DATABASE_VERSION = 1
const STORE_NAME = 'composer-projects'
const LAST_PROJECT_KEY = 'last-project'

export interface ComposerSnapshot {
  version: 1
  savedAt: string
  page: ComposerPage
}

export interface ComposerPersistence {
  load: () => Promise<ComposerPage | undefined>
  save: (page: ComposerPage) => Promise<void>
  clear: () => Promise<void>
}

export function encodeComposerSnapshot(page: ComposerPage, savedAt = new Date().toISOString()) {
  return {
    version: 1 as const,
    savedAt,
    page: composerPageSchema.parse(page)
  }
}

export function decodeComposerSnapshot(value: unknown): ComposerSnapshot {
  if (!value || typeof value !== 'object') {
    throw new Error('Composer snapshot must be an object.')
  }

  const candidate = value as Record<string, unknown>
  if (candidate.version !== 1) {
    throw new Error(`Unsupported Composer snapshot version ${String(candidate.version)}.`)
  }
  if (typeof candidate.savedAt !== 'string' || candidate.savedAt.length === 0) {
    throw new Error('Composer snapshot savedAt is missing.')
  }

  return {
    version: 1,
    savedAt: candidate.savedAt,
    page: composerPageSchema.parse(candidate.page)
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true })
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('IndexedDB request failed.')),
      { once: true }
    )
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })
    transaction.addEventListener(
      'error',
      () => reject(transaction.error ?? new Error('IndexedDB transaction failed.')),
      { once: true }
    )
    transaction.addEventListener(
      'abort',
      () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.')),
      { once: true }
    )
  })
}

function openComposerDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.addEventListener(
      'upgradeneeded',
      () => {
        const database = request.result
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME)
        }
      },
      { once: true }
    )
    request.addEventListener('success', () => resolve(request.result), { once: true })
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('Unable to open ForgeUI IndexedDB.')),
      { once: true }
    )
  })
}

export function createBrowserComposerPersistence(): ComposerPersistence {
  return {
    async load() {
      if (!('indexedDB' in window)) return undefined
      const database = await openComposerDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readonly')
        const result = await requestResult(
          transaction.objectStore(STORE_NAME).get(LAST_PROJECT_KEY) as IDBRequest<unknown>
        )
        if (result === undefined) return undefined
        return decodeComposerSnapshot(result).page
      } finally {
        database.close()
      }
    },

    async save(page) {
      if (!('indexedDB' in window)) return
      const database = await openComposerDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        transaction.objectStore(STORE_NAME).put(encodeComposerSnapshot(page), LAST_PROJECT_KEY)
        await transactionDone(transaction)
      } finally {
        database.close()
      }
    },

    async clear() {
      if (!('indexedDB' in window)) return
      const database = await openComposerDatabase()
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        transaction.objectStore(STORE_NAME).delete(LAST_PROJECT_KEY)
        await transactionDone(transaction)
      } finally {
        database.close()
      }
    }
  }
}
