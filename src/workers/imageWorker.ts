import { compressImage, type CompressOptions, type CompressResult } from '../lib/image/compress'

export type WorkerRequest = {
  id: number
  file: Blob
  options: CompressOptions
}

export type WorkerResponse = {
  id: number
  ok: boolean
  result?: CompressResult
  error?: string
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, file, options } = event.data
  try {
    const result = await compressImage(file, options)
    const response: WorkerResponse = { id, ok: true, result }
    ;(self as unknown as Worker).postMessage(response)
  } catch (err) {
    const response: WorkerResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : 'Image worker failed.',
    }
    ;(self as unknown as Worker).postMessage(response)
  }
}
