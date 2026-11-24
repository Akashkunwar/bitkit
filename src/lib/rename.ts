export function splitName(filename: string): { stem: string; ext: string } {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return { stem: base, ext: '' }
  return { stem: base.slice(0, dot), ext: base.slice(dot + 1) }
}

export function applyRename(filename: string, pattern: string, index: number, date = new Date()): string {
  const { stem, ext } = splitName(filename)
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  const n = index + 1
  return pattern
    .replaceAll('{name}', stem)
    .replaceAll('{ext}', ext)
    .replaceAll('{nn}', pad(n))
    .replaceAll('{n}', String(n))
    .replaceAll('{date}', stamp)
    .replaceAll('{time}', time)
}

export type RenamePlan = { from: string; to: string }

export function planRename(names: string[], pattern: string, date = new Date()): RenamePlan[] {
  if (!pattern.includes('{')) throw new Error('Use at least one token, such as {name} or {n}.')
  const planned = names.map((from, index) => ({ from, to: applyRename(from, pattern, index, date).trim() }))
  const seen = new Set<string>()
  for (const row of planned) {
    if (!row.to || row.to === '.' || row.to === '..' || /[/\\]/.test(row.to)) {
      throw new Error(`“${row.from}” would become “${row.to || 'an empty name'}”, which is not a file name.`)
    }
    const key = row.to.toLocaleLowerCase()
    if (seen.has(key)) throw new Error(`“${row.to}” would be used twice. Put {n} in the pattern.`)
    seen.add(key)
  }
  return planned
}

/** A planned name that would overwrite a file which is not itself being renamed. */
export function conflictsWithExisting(planned: RenamePlan[], existing: string[]): string | null {
  const leaving = new Set(planned.map((row) => row.from.toLocaleLowerCase()))
  const staying = new Set(existing.map((name) => name.toLocaleLowerCase()).filter((name) => !leaving.has(name)))
  for (const row of planned) {
    if (row.from.toLocaleLowerCase() === row.to.toLocaleLowerCase()) continue
    if (staying.has(row.to.toLocaleLowerCase())) return row.to
  }
  return null
}
