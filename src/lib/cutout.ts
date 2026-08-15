import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import { decodeImage } from './image/compress'

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite'

let segmenterPromise: Promise<ImageSegmenter> | null = null

async function createSegmenter(delegate: 'GPU' | 'CPU'): Promise<ImageSegmenter> {
  const fileset = await FilesetResolver.forVisionTasks(WASM)
  return ImageSegmenter.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: MODEL,
      delegate,
    },
    runningMode: 'IMAGE',
    outputConfidenceMasks: true,
  })
}

async function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = createSegmenter('GPU').catch(() => createSegmenter('CPU'))
  }
  return segmenterPromise
}

function sampleMask(conf: Float32Array, mw: number, mh: number, x: number, y: number, width: number, height: number): number {
  const mx = Math.min(mw - 1, Math.max(0, Math.floor((x / width) * mw)))
  const my = Math.min(mh - 1, Math.max(0, Math.floor((y / height) * mh)))
  return conf[my * mw + mx] ?? 0
}

export async function removeBackground(file: Blob, threshold = 0.5, invert = false): Promise<Blob> {
  const source = await decodeImage(file)
  const width = 'naturalWidth' in source && source.naturalWidth ? source.naturalWidth : source.width
  const height = 'naturalHeight' in source && source.naturalHeight ? source.naturalHeight : source.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height)
  if ('close' in source) source.close()

  const segmenter = await getSegmenter()
  const result = segmenter.segment(canvas)
  const mask = result.confidenceMasks?.[0]
  if (!mask) throw new Error('The segmenter did not return a mask.')
  const conf = mask.getAsFloat32Array()
  const image = ctx.getImageData(0, 0, width, height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let score = sampleMask(conf, mask.width, mask.height, x, y, width, height)
      if (invert) score = 1 - score
      image.data[(y * width + x) * 4 + 3] = score >= threshold ? 255 : Math.round(score * 255)
    }
  }
  ctx.putImageData(image, 0, 0)
  mask.close()
  result.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed.'))), 'image/png')
  })
}
