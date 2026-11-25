import { useEffect, useRef } from 'react'

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  const tag = el?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!el?.isContentEditable
}

export function useHeld(keys: readonly string[]) {
  const held = useRef(new Set<string>())
  const allow = keys.join('\n')
  useEffect(() => {
    const list = allow.split('\n')
    const down = (event: KeyboardEvent) => {
      if (!list.includes(event.key) || isTypingTarget(event.target)) return
      event.preventDefault()
      if (event.repeat && held.current.has(event.key)) return
      held.current.delete(event.key)
      held.current.add(event.key)
    }
    const up = (event: KeyboardEvent) => {
      held.current.delete(event.key)
    }
    const clear = () => held.current.clear()
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [allow])
  return held
}

/** Last matching key in insertion order. A newer press wins over one still held. */
export function lastHeld(held: Set<string>, keys: readonly string[]): string | null {
  let found: string | null = null
  for (const key of held) if (keys.includes(key)) found = key
  return found
}

export function useTick(run: () => void, ms: number) {
  const saved = useRef(run)
  saved.current = run
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return
      saved.current()
    }, ms)
    return () => window.clearInterval(id)
  }, [ms])
}

export function useTap() {
  const pending = useRef(false)
  const api = useRef({
    tap: () => {
      pending.current = true
    },
    take: () => {
      const value = pending.current
      pending.current = false
      return value
    },
  })
  return api.current
}

export const INK = '#f4f1e4'
export const LIME = '#c9f150'
export const RED = '#e85d4c'
export const BG = '#14160f'
