import { useCallback, useEffect, useRef, useState } from 'react'
import { decodeImage } from './compress'
import { moveItem, type Rotation } from '../pageLayout'

export type ImageItem = {
  id: string
  file: File
  name: string
  size: number
  lastModified: number
  /** Natural size after EXIF orientation, before any rotation applied here. */
  width: number
  height: number
  rotation: Rotation
  flipX: boolean
  flipY: boolean
  /** Object URL of a small preview with rotation and flips applied. */
  thumbUrl: string | null
  error?: string
}

export type SortMode = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'size-desc'

const THUMB_MAX = 360

export function turn(rotation: Rotation, delta: number): Rotation {
  return ((((rotation + delta) % 360) + 360) % 360) as Rotation
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Pure ordering, exported for tests. Names sort naturally: img2 before img10. */
export function sortImages<T extends { name: string; lastModified: number; size: number }>(
  list: readonly T[],
  mode: SortMode,
): T[] {
  const next = [...list]
  switch (mode) {
    case 'name-asc':
      return next.sort((a, b) => collator.compare(a.name, b.name))
    case 'name-desc':
      return next.sort((a, b) => collator.compare(b.name, a.name))
    case 'date-asc':
      return next.sort((a, b) => a.lastModified - b.lastModified)
    case 'date-desc':
      return next.sort((a, b) => b.lastModified - a.lastModified)
    case 'size-desc':
      return next.sort((a, b) => b.size - a.size)
  }
}

async function makeBase(file: File): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const source = await decodeImage(file)
  try {
    const width = 'naturalWidth' in source && source.naturalWidth ? source.naturalWidth : source.width
    const height = 'naturalHeight' in source && source.naturalHeight ? source.naturalHeight : source.height
    const scale = Math.min(1, THUMB_MAX / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable.')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height)
    return { canvas, width, height }
  } finally {
    if ('close' in source) source.close()
  }
}

/** Draws a base thumbnail with rotation and flips, as an object URL. */
export async function orientedThumb(
  base: HTMLCanvasElement,
  rotation: Rotation,
  flipX: boolean,
  flipY: boolean,
): Promise<string> {
  const swap = rotation === 90 || rotation === 270
  const canvas = document.createElement('canvas')
  canvas.width = swap ? base.height : base.width
  canvas.height = swap ? base.width : base.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1)
  ctx.drawImage(base, -base.width / 2, -base.height / 2)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Preview encode failed.')
  return URL.createObjectURL(blob)
}

/**
 * A list of images with previews that track rotation and flips.
 *
 * Decoding happens once per file into a small base canvas; turning an image
 * only re-draws that thumbnail. Object URLs are revoked as they are replaced
 * and when the component unmounts.
 */
export function useImageList() {
  const [items, setItems] = useState<ImageItem[]>([])
  const itemsRef = useRef(items)
  itemsRef.current = items
  const bases = useRef(new Map<string, HTMLCanvasElement>())
  const urls = useRef(new Map<string, string>())
  // Latest thumbnail request per item, so a slow render never overwrites a newer one.
  const versions = useRef(new Map<string, number>())

  useEffect(() => {
    const owned = urls.current
    const cached = bases.current
    return () => {
      for (const url of owned.values()) URL.revokeObjectURL(url)
      owned.clear()
      cached.clear()
    }
  }, [])

  const refreshThumb = useCallback(async (item: Pick<ImageItem, 'id' | 'rotation' | 'flipX' | 'flipY'>) => {
    const base = bases.current.get(item.id)
    if (!base) return
    const version = (versions.current.get(item.id) ?? 0) + 1
    versions.current.set(item.id, version)
    const url = await orientedThumb(base, item.rotation, item.flipX, item.flipY)
    if (versions.current.get(item.id) !== version || !bases.current.has(item.id)) {
      URL.revokeObjectURL(url)
      return
    }
    const previous = urls.current.get(item.id)
    if (previous) URL.revokeObjectURL(previous)
    urls.current.set(item.id, url)
    setItems((list) => list.map((entry) => (entry.id === item.id ? { ...entry, thumbUrl: url } : entry)))
  }, [])

  const add = useCallback(
    (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith('image/') || /\.(heic|heif|avif)$/i.test(file.name))
      const fresh: ImageItem[] = images.map((file) => ({
        id: crypto.randomUUID(),
        file,
        name: file.name || 'image',
        size: file.size,
        lastModified: file.lastModified,
        width: 0,
        height: 0,
        rotation: 0,
        flipX: false,
        flipY: false,
        thumbUrl: null,
      }))
      setItems((list) => [...list, ...fresh])
      for (const item of fresh) {
        void makeBase(item.file)
          .then(({ canvas, width, height }) => {
            bases.current.set(item.id, canvas)
            setItems((list) => list.map((entry) => (entry.id === item.id ? { ...entry, width, height } : entry)))
            return refreshThumb(item)
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : 'Could not read this image.'
            setItems((list) => list.map((entry) => (entry.id === item.id ? { ...entry, error: message } : entry)))
          })
      }
      return fresh.length
    },
    [refreshThumb],
  )

  const update = useCallback(
    (id: string, patch: Partial<Pick<ImageItem, 'rotation' | 'flipX' | 'flipY'>>) => {
      const current = itemsRef.current.find((entry) => entry.id === id)
      if (!current) return
      const changed = { ...current, ...patch }
      itemsRef.current = itemsRef.current.map((entry) => (entry.id === id ? changed : entry))
      setItems((list) => list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
      void refreshThumb(changed)
    },
    [refreshThumb],
  )

  const rotate = useCallback(
    (id: string, delta: 90 | -90 | 180) => {
      const item = itemsRef.current.find((entry) => entry.id === id)
      if (item) update(id, { rotation: turn(item.rotation, delta) })
    },
    [update],
  )

  const rotateAll = useCallback(
    (delta: 90 | -90 | 180) => {
      for (const item of itemsRef.current) update(item.id, { rotation: turn(item.rotation, delta) })
    },
    [update],
  )

  const flipAll = useCallback(
    (axis: 'x' | 'y') => {
      for (const item of itemsRef.current)
        update(item.id, axis === 'x' ? { flipX: !item.flipX } : { flipY: !item.flipY })
    },
    [update],
  )

  const remove = useCallback((id: string) => {
    const url = urls.current.get(id)
    if (url) URL.revokeObjectURL(url)
    urls.current.delete(id)
    bases.current.delete(id)
    versions.current.delete(id)
    setItems((list) => list.filter((entry) => entry.id !== id))
  }, [])

  const clear = useCallback(() => {
    for (const url of urls.current.values()) URL.revokeObjectURL(url)
    urls.current.clear()
    bases.current.clear()
    setItems([])
  }, [])

  const move = useCallback((from: number, to: number) => setItems((list) => moveItem(list, from, to)), [])
  const sort = useCallback((mode: SortMode) => setItems((list) => sortImages(list, mode)), [])
  const reverse = useCallback(() => setItems((list) => [...list].reverse()), [])

  return { items, add, remove, clear, move, sort, reverse, rotate, rotateAll, flipAll, update }
}
