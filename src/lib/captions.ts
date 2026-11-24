import { parseSrt, type Cue } from './media'

export type { Cue }

export function shiftCues(cues: Cue[], deltaSeconds: number): Cue[] {
  if (!Number.isFinite(deltaSeconds)) throw new Error('Enter a shift in seconds.')
  return cues.map((cue) => {
    const start = Math.max(0, cue.start + deltaSeconds)
    const end = Math.max(start, cue.end + deltaSeconds)
    return { ...cue, start, end }
  })
}

export function mergeCues(first: Cue[], second: Cue[]): Cue[] {
  return [...first, ...second].sort((a, b) => a.start - b.start || a.end - b.end)
}

function stamp(seconds: number, decimal: ',' | '.'): string {
  const ms = Math.round(Math.max(0, seconds) * 1000)
  const pad = (value: number, width = 2) => String(value).padStart(width, '0')
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  const secs = Math.floor((ms % 60_000) / 1000)
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}${decimal}${pad(ms % 1000, 3)}`
}

export function formatSrt(cues: Cue[]): string {
  return (
    cues
      .map((cue, index) => `${index + 1}\n${stamp(cue.start, ',')} --> ${stamp(cue.end, ',')}\n${cue.text}`)
      .join('\n\n') + '\n'
  )
}

export function formatVtt(cues: Cue[]): string {
  const body = cues.map((cue) => `${stamp(cue.start, '.')} --> ${stamp(cue.end, '.')}\n${cue.text}`).join('\n\n')
  return `WEBVTT\n\n${body}\n`
}

/** WebVTT cues. NOTE blocks and the header are skipped. */
export function parseVtt(input: string): Cue[] {
  const body = input.replace(/^\uFEFF/, '').replace(/^WEBVTT[^\n]*\n+/, '')
  return parseSrt(body)
}

export function parseCaptions(input: string, name = ''): Cue[] {
  const vtt = name.toLowerCase().endsWith('.vtt') || input.trimStart().startsWith('WEBVTT')
  return vtt ? parseVtt(input) : parseSrt(input)
}
