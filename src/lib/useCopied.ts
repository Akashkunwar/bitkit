import { useState } from 'react'

export function useCopied(ms = 1200) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (text: string, key = 'ok') => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    window.setTimeout(() => setCopied((cur) => (cur === key ? null : cur)), ms)
  }

  return { copied, copy }
}
