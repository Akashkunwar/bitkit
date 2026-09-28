import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CHORD_TIMEOUT_MS, LEADER, matchChord } from '../lib/chords'

type Handlers = {
  openPalette: () => void
  openCheatsheet: () => void
  toggleSidebar: () => void
  closeOverlays: () => void
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  const tag = el?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!el?.isContentEditable
}

/**
 * Global keyboard handling for the shell: ⌘K and / open the palette, ? opens
 * the cheatsheet, [ toggles the sidebar, and G-chords navigate. Returns the
 * partial chord for the on-screen hint.
 */
export function useShellKeys(handlers: Handlers): string | null {
  const navigate = useNavigate()
  const [hint, setHint] = useState<string | null>(null)
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    let pending = false
    let keys: string[] = []
    let lapse: number | undefined

    const clear = () => {
      pending = false
      keys = []
      setHint(null)
      window.clearTimeout(lapse)
    }
    // A partial chord lapses rather than waiting forever for its next key.
    const arm = () => {
      window.clearTimeout(lapse)
      lapse = window.setTimeout(clear, CHORD_TIMEOUT_MS)
    }

    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey
      if (meta && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        clear()
        ref.current.openPalette()
        return
      }
      if (event.key === 'Escape') {
        ref.current.closeOverlays()
        clear()
        return
      }
      if (isTyping(event.target) || meta || event.altKey) return

      if (event.key === '/') {
        event.preventDefault()
        clear()
        ref.current.openPalette()
        return
      }
      if (event.key === '?') {
        event.preventDefault()
        clear()
        ref.current.openCheatsheet()
        return
      }
      if (event.key === '[' && !pending) {
        event.preventDefault()
        ref.current.toggleSidebar()
        return
      }

      if (!pending) {
        if (event.key.toLowerCase() !== LEADER) return
        pending = true
        keys = []
        setHint(LEADER.toUpperCase())
        arm()
        return
      }

      const next = [...keys, event.key.toLowerCase()]
      const result = matchChord(next)
      if (result.kind === 'match') {
        event.preventDefault()
        clear()
        if (result.chord.path === '#shortcuts') ref.current.openCheatsheet()
        else navigate(result.chord.path)
        return
      }
      if (result.kind === 'pending') {
        event.preventDefault()
        keys = next
        setHint([LEADER, ...next].map((k) => k.toUpperCase()).join(' '))
        arm()
        return
      }
      clear()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(lapse)
    }
  }, [navigate])

  return hint
}
