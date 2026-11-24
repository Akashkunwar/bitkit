import { useEffect } from 'react'
import { isTypingTarget } from './loop'

const HELD = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '])

export function useArrows(onKey: (key: string) => void) {
  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (!HELD.has(event.key) || isTypingTarget(event.target)) return
      event.preventDefault()
      onKey(event.key)
    }
    window.addEventListener('keydown', onDown, true)
    return () => window.removeEventListener('keydown', onDown, true)
  }, [onKey])
}
