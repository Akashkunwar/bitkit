export async function filesFromPaste(event: ClipboardEvent): Promise<File[]> {
  const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith('image/'))
  if (files.length) return files

  if (navigator.clipboard && 'read' in navigator.clipboard) {
    try {
      const items = await navigator.clipboard.read()
      const out: File[] = []
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'))
        if (!type) continue
        const blob = await item.getType(type)
        out.push(new File([blob], `clipboard.${type.split('/')[1] || 'png'}`, { type }))
      }
      return out
    } catch {
      return []
    }
  }
  return []
}

export async function copyBlob(blob: Blob): Promise<void> {
  if (!navigator.clipboard?.write) {
    throw new Error('Clipboard write is not available.')
  }
  const type = blob.type || 'image/png'
  await navigator.clipboard.write([new ClipboardItem({ [type]: blob })])
}
