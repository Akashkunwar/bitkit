export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2_000)
}

export async function saveWithPicker(blob: Blob, filename: string): Promise<boolean> {
  const picker = window.showSaveFilePicker
  if (!picker) return false
  const handle = await picker({
    suggestedName: filename,
    types: [
      {
        description: 'File',
        accept: { [blob.type || 'application/octet-stream']: [`.${filename.split('.').pop()}`] },
      },
    ],
  })
  const writable = await handle.createWritable()
  await writable.write(blob)
  await writable.close()
  return true
}

/**
 * Saves via the OS "Save as…" dialog when the browser has it, falling back to a
 * plain anchor download. Returns false when the user dismisses the dialog so
 * callers can stay quiet instead of reporting a failure.
 */
export async function saveAs(blob: Blob, filename: string): Promise<boolean> {
  try {
    if (await saveWithPicker(blob, filename)) return true
  } catch (err) {
    // AbortError is the user closing the dialog, not a failure worth surfacing.
    if (err instanceof DOMException && err.name === 'AbortError') return false
    // Anything else (permission, cross-origin isolation) falls back below.
  }
  triggerDownload(blob, filename)
  return true
}

export async function writeToDirectory(
  dir: FileSystemDirectoryHandle,
  blob: Blob,
  filename: string,
): Promise<void> {
  const file = await dir.getFileHandle(filename, { create: true })
  const writable = await file.createWritable()
  await writable.write(blob)
  await writable.close()
}
