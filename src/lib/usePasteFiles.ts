import { useEffect, useRef } from 'react'
import { filesFromPaste } from './clipboard'

/**
 * Calls `onFiles` with the images in any paste made while the tool is open.
 *
 * The handler is read through a ref so callers can pass an inline function
 * without re-binding the window listener on every render — which is what the
 * hand-rolled versions of this effect in each tool used to get wrong.
 */
export function usePasteFiles(onFiles: (files: File[]) => void, enabled = true): void {
  const ref = useRef(onFiles)
  ref.current = onFiles

  useEffect(() => {
    if (!enabled) return undefined
    const onPaste = (event: ClipboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      // Pasting text into a field is not a request to load an image.
      if ((tag === 'INPUT' || tag === 'TEXTAREA') && !event.clipboardData?.files.length) return
      void filesFromPaste(event).then((files) => {
        if (files.length) ref.current(files)
      })
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [enabled])
}
