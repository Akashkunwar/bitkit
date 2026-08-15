import { indexedDB, IDBKeyRange } from 'fake-indexeddb'

if (!globalThis.indexedDB) {
  Object.defineProperty(globalThis, 'indexedDB', { value: indexedDB })
  Object.defineProperty(globalThis, 'IDBKeyRange', { value: IDBKeyRange })
}

if (!globalThis.crypto?.randomUUID) {
  let n = 0
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: () => {
      n += 1
      return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
    },
  })
}
