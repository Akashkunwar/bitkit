import { useEffect, useRef } from 'react'
import { takeHandoff, type HandoffPayload } from './handoff'

export function useHandoff(onPayload: (payload: HandoffPayload) => void): void {
  const ref = useRef(onPayload)
  ref.current = onPayload
  useEffect(() => {
    const payload = takeHandoff()
    if (payload) ref.current(payload)
  }, [])
}
