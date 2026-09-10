import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { handoffGeneration, restoreHandoff, takeHandoff, type HandoffPayload } from './handoff'

export function useHandoff(onPayload: (payload: HandoffPayload) => void): void {
  const ref = useRef(onPayload)
  ref.current = onPayload
  const location = useLocation()

  useEffect(() => {
    const gen = handoffGeneration()
    const payload = takeHandoff()
    if (!payload) return undefined
    ref.current(payload)
    return () => restoreHandoff(payload, gen)
  }, [location.key, location.state])
}
