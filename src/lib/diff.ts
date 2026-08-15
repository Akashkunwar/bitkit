export type DiffOp = { type: 'equal' | 'add' | 'del'; text: string }

const MAX_CELLS = 4_000_000

export function splitLines(input: string): string[] {
  if (!input) return []
  return input.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n')
}

export function diffLines(a: string, b: string): DiffOp[] {
  const left = splitLines(a)
  const right = splitLines(b)
  if (left.length * right.length > MAX_CELLS) return greedyDiff(left, right)
  return lcsDiff(left, right)
}

function lcsDiff(a: string[], b: string[]): DiffOp[] {
  const n = a.length
  const m = b.length
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const ops: DiffOp[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'equal', text: a[i] })
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', text: a[i] })
      i += 1
    } else {
      ops.push({ type: 'add', text: b[j] })
      j += 1
    }
  }
  while (i < n) {
    ops.push({ type: 'del', text: a[i] })
    i += 1
  }
  while (j < m) {
    ops.push({ type: 'add', text: b[j] })
    j += 1
  }
  return ops
}

function greedyDiff(a: string[], b: string[]): DiffOp[] {
  const ops: DiffOp[] = []
  const bIndex = new Map<string, number[]>()
  b.forEach((line, j) => {
    const list = bIndex.get(line)
    if (list) list.push(j)
    else bIndex.set(line, [j])
  })
  let j = 0
  for (const line of a) {
    const hits = bIndex.get(line) ?? []
    const next = hits.find((idx) => idx >= j)
    if (next == null) {
      ops.push({ type: 'del', text: line })
      continue
    }
    while (j < next) {
      ops.push({ type: 'add', text: b[j] })
      j += 1
    }
    ops.push({ type: 'equal', text: line })
    j += 1
  }
  while (j < b.length) {
    ops.push({ type: 'add', text: b[j] })
    j += 1
  }
  return ops
}

export function unifiedPatch(a: string, b: string, aname = 'a', bname = 'b'): string {
  const ops = diffLines(a, b)
  const lines = [`--- ${aname}`, `+++ ${bname}`]
  for (const op of ops) {
    if (op.type === 'equal') lines.push(` ${op.text}`)
    else if (op.type === 'add') lines.push(`+${op.text}`)
    else lines.push(`-${op.text}`)
  }
  return `${lines.join('\n')}\n`
}

export function diffStats(ops: DiffOp[]): { added: number; removed: number; unchanged: number } {
  return ops.reduce(
    (acc, op) => {
      if (op.type === 'add') acc.added += 1
      else if (op.type === 'del') acc.removed += 1
      else acc.unchanged += 1
      return acc
    },
    { added: 0, removed: 0, unchanged: 0 },
  )
}
