import { useCallback, useState } from 'react'

/**
 * Copies text and remembers, briefly, which thing was copied so a button can
 * say "Copied". Falls back to a hidden textarea where the async clipboard API
 * is missing or refused (insecure origin, denied permission, older WebViews).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    area.remove()
    return ok
  }
}

export function useCopied(ms = 1200) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = useCallback(
    async (text: string, key = 'ok') => {
      const ok = await copyText(text)
      if (!ok) return false
      setCopied(key)
      window.setTimeout(() => setCopied((cur) => (cur === key ? null : cur)), ms)
      return true
    },
    [ms],
  )

  return { copied, copy }
}
