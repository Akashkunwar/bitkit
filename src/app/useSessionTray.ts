import { createContext, useContext } from 'react'

export type TrayItem = { id: string; file: File }

export type SessionTrayValue = {
  items: TrayItem[]
  note: string | null
  add: (files: File[]) => void
  remove: (id: string) => void
  clear: () => void
  send: (path: string) => void
}

export const SessionTrayContext = createContext<SessionTrayValue | null>(null)

export function useSessionTray(): SessionTrayValue {
  const value = useContext(SessionTrayContext)
  if (!value) throw new Error('Session tray is missing.')
  return value
}
