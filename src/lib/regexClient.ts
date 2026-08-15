import { runRegex, type RegexResult } from './regex'

/**
 * A pattern like /(a+)+$/ against a long non-matching string backtracks for
 * effectively forever. On the main thread that is an unrecoverable tab freeze,
 * so evaluation runs in a worker we can terminate.
 */
export const REGEX_TIMEOUT_MS = 2000

let worker: Worker | null = null
let seq = 0

function spawn(): Worker | null {
  try {
    return new Worker(new URL('../workers/regexWorker.ts', import.meta.url), { type: 'module' })
  } catch {
    return null
  }
}

export function disposeRegexWorker(): void {
  worker?.terminate()
  worker = null
}

export async function runRegexSafely(
  pattern: string,
  flags: string,
  text: string,
  replace = '',
): Promise<RegexResult> {
  if (!pattern) return runRegex(pattern, flags, text, replace)
  worker ??= spawn()
  const active = worker
  if (!active) return runRegex(pattern, flags, text, replace)

  const id = (seq += 1)
  return new Promise<RegexResult>((resolve) => {
    const done = (result: RegexResult) => {
      active.removeEventListener('message', onMessage)
      window.clearTimeout(timer)
      resolve(result)
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { id: number; ok: boolean; result?: RegexResult; error?: string }
      if (data.id !== id) return
      if (data.ok && data.result) done(data.result)
      else done({ flags, hits: [], replaced: text, error: data.error ?? 'Regex failed.' })
    }
    const timer = window.setTimeout(() => {
      // The worker is wedged mid-backtrack; only termination frees it.
      disposeRegexWorker()
      worker = null
      done({
        flags,
        hits: [],
        replaced: text,
        error: `This pattern took longer than ${REGEX_TIMEOUT_MS / 1000}s and was stopped. It likely backtracks catastrophically on this input.`,
      })
    }, REGEX_TIMEOUT_MS)
    active.addEventListener('message', onMessage)
    active.postMessage({ id, pattern, flags, text, replace })
  })
}
