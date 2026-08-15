/**
 * Reading and writing a real directory via File System Access.
 *
 * Chromium-family browsers support this; Safari and Firefox do not. Rather
 * than hiding the feature there, every entry point reports support so the UI
 * can offer the multi-file fallback instead of failing silently.
 */

export const FOLDER_SUPPORTED =
  typeof window !== 'undefined' && 'showDirectoryPicker' in window

export type PickedFile = { file: File; relativePath: string }

export type PickOptions = {
  /** Lower-case extensions without the dot, e.g. ['jpg', 'png']. */
  extensions?: string[]
  recursive?: boolean
  limit?: number
}

function matches(name: string, extensions?: string[]): boolean {
  if (!extensions?.length) return true
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return extensions.includes(ext)
}

export async function pickDirectory(mode: 'read' | 'readwrite' = 'read'): Promise<FileSystemDirectoryHandle | null> {
  const picker = window.showDirectoryPicker
  if (!picker) return null
  try {
    return await picker({ mode })
  } catch (err) {
    // Dismissing the picker is a normal outcome, not an error to report.
    if (err instanceof DOMException && err.name === 'AbortError') return null
    throw err
  }
}

export async function readDirectory(
  dir: FileSystemDirectoryHandle,
  options: PickOptions = {},
): Promise<PickedFile[]> {
  const { recursive = false, limit = 500 } = options
  const out: PickedFile[] = []

  const walk = async (handle: FileSystemDirectoryHandle, prefix: string): Promise<void> => {
    for await (const [name, entry] of handle.entries()) {
      if (out.length >= limit) return
      if (entry.kind === 'file') {
        if (!matches(name, options.extensions)) continue
        const file = await entry.getFile()
        out.push({ file, relativePath: prefix ? `${prefix}/${name}` : name })
      } else if (recursive && entry.kind === 'directory') {
        await walk(entry, prefix ? `${prefix}/${name}` : name)
      }
    }
  }

  await walk(dir, '')
  return out
}

export async function writeFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: Blob,
): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  await writable.write(data)
  await writable.close()
}

/** Creates (or opens) a subfolder, which is where batch output should land. */
export async function ensureSubfolder(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return dir.getDirectoryHandle(name, { create: true })
}

/** Verifies the permission is still granted; handles go stale between visits. */
export async function ensurePermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  const withPerms = handle as FileSystemDirectoryHandle & {
    queryPermission?: (d: { mode: string }) => Promise<PermissionState>
    requestPermission?: (d: { mode: string }) => Promise<PermissionState>
  }
  if (!withPerms.queryPermission) return true
  if ((await withPerms.queryPermission({ mode })) === 'granted') return true
  return (await withPerms.requestPermission?.({ mode })) === 'granted'
}

// --- batch running ---

export type BatchProgress = {
  done: number
  total: number
  current: string
  failed: { name: string; reason: string }[]
}

export type BatchResult = {
  outputs: { name: string; blob: Blob }[]
  failed: { name: string; reason: string }[]
}

/**
 * Applies `process` to each file in turn, collecting failures instead of
 * aborting: one corrupt image in a folder of two hundred should not throw
 * away the other 199 results.
 */
export async function runBatch(
  files: PickedFile[],
  process: (file: File) => Promise<{ name: string; blob: Blob }>,
  onProgress?: (progress: BatchProgress) => void,
  signal?: AbortSignal,
): Promise<BatchResult> {
  const outputs: { name: string; blob: Blob }[] = []
  const failed: { name: string; reason: string }[] = []

  for (const [index, entry] of files.entries()) {
    if (signal?.aborted) break
    onProgress?.({ done: index, total: files.length, current: entry.relativePath, failed })
    try {
      outputs.push(await process(entry.file))
    } catch (err) {
      failed.push({
        name: entry.relativePath,
        reason: err instanceof Error ? err.message : 'Could not process this file.',
      })
    }
  }

  onProgress?.({ done: files.length, total: files.length, current: '', failed })
  return { outputs, failed }
}
