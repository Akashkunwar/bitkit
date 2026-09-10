import type { CompressOptions, CompressResult } from './compress'
import { compressImage } from './compress'

type Pending = {
  resolve: (value: CompressResult) => void
  reject: (reason: Error) => void
}

let worker: Worker | null = null
let supported: boolean | null = null
let seq = 1
const pending = new Map<number, Pending>()

function failAll(reason: Error): void {
  for (const waiter of pending.values()) waiter.reject(reason)
  pending.clear()
}

function getWorker(): Worker | null {
  if (supported === false) return null
  if (worker) return worker
  try {
    worker = new Worker(new URL('../../workers/imageWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as { id: number; ok: boolean; result?: CompressResult; error?: string }
      const waiter = pending.get(data.id)
      if (!waiter) return
      pending.delete(data.id)
      if (data.ok && data.result) waiter.resolve(data.result)
      else waiter.reject(new Error(data.error || 'Worker failed'))
    }
    worker.onerror = () => {
      supported = false
      worker = null
      failAll(new Error('Image worker crashed.'))
    }
    supported = true
    return worker
  } catch {
    supported = false
    return null
  }
}

export async function compressInWorker(file: Blob, options: CompressOptions): Promise<CompressResult> {
  const w = typeof Worker !== 'undefined' ? getWorker() : null
  if (!w) return compressImage(file, options)
  const id = seq++
  try {
    return await new Promise<CompressResult>((resolve, reject) => {
      pending.set(id, { resolve, reject })
      w.postMessage({ id, file, options })
    })
  } catch {
    return compressImage(file, options)
  }
}
