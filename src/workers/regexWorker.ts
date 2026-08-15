/// <reference lib="webworker" />
import { runRegex } from '../lib/regex'

type Request = { id: number; pattern: string; flags: string; text: string; replace: string }

self.onmessage = (event: MessageEvent<Request>) => {
  const { id, pattern, flags, text, replace } = event.data
  try {
    self.postMessage({ id, ok: true, result: runRegex(pattern, flags, text, replace) })
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : 'Regex failed.' })
  }
}
