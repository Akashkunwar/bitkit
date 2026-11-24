export const readoutStyle = {
  fontSize: '3rem',
  lineHeight: 1.1,
  fontVariantNumeric: 'tabular-nums' as const,
  margin: 0,
}
export const stageStyle = { width: '100%', maxWidth: 420, height: 'auto', borderRadius: 12, background: '#111827' }

export function splitList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function clampCount(raw: string, max: number): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(max, Math.floor(value)))
}
