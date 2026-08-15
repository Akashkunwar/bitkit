import { createWorker } from 'tesseract.js'

let workerPromise: Promise<Awaited<ReturnType<typeof createWorker>>> | null = null

async function worker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7/tesseract-core.wasm.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    })
  }
  return workerPromise
}

export async function recognizeImage(file: Blob): Promise<{ text: string; confidence: number }> {
  const w = await worker()
  const result = await w.recognize(file)
  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence,
  }
}
