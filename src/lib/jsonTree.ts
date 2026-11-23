export type TreeRow = { depth: number; label: string; leaf: boolean }

export function jsonTreeRows(value: unknown, key = 'root', depth = 0): TreeRow[] {
  if (value === null || typeof value !== 'object') {
    return [{ depth, label: `${key}: ${value === undefined ? 'undefined' : JSON.stringify(value)}`, leaf: true }]
  }
  if (Array.isArray(value)) {
    const rows: TreeRow[] = [{ depth, label: `${key} [${value.length}]`, leaf: false }]
    value.forEach((item, index) => rows.push(...jsonTreeRows(item, String(index), depth + 1)))
    return rows
  }
  const entries = Object.entries(value as Record<string, unknown>)
  const rows: TreeRow[] = [{ depth, label: `${key} {${entries.length}}`, leaf: false }]
  for (const [child, item] of entries) rows.push(...jsonTreeRows(item, child, depth + 1))
  return rows
}
