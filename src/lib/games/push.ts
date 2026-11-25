export const LEVELS = [
  ['#####', '#@$.#', '#####'],
  ['######', '#    #', '# $  #', '#  @ #', '# .  #', '######'],
  ['#######', '#  .  #', '# $$  #', '#  @  #', '#  .  #', '#######'],
]

export type Push = { rows: string[]; level: number; won: boolean }

export function freshPush(level = 0): Push {
  return { rows: LEVELS[level].slice(), level, won: false }
}

function find(rows: string[], mark: string) {
  for (let r = 0; r < rows.length; r += 1) {
    const c = rows[r].indexOf(mark)
    if (c >= 0) return { r, c }
  }
  return null
}

export function stepPush(state: Push, dr: number, dc: number): Push {
  if (state.won) return state
  const player = find(state.rows, '@') ?? find(state.rows, '+')
  if (!player) return state
  const r = player.r + dr
  const c = player.c + dc
  const here = state.rows[player.r][player.c]
  const next = state.rows[r]?.[c]
  if (!next || next === '#') return state
  const rows = state.rows.map((row) => row.split(''))
  const leave = here === '+' ? '.' : ' '
  if (next === '$' || next === '*') {
    const br = r + dr
    const bc = c + dc
    const beyond = rows[br]?.[bc]
    if (beyond !== ' ' && beyond !== '.') return state
    rows[br][bc] = beyond === '.' ? '*' : '$'
    rows[r][c] = next === '*' ? '+' : '@'
  } else {
    rows[r][c] = next === '.' ? '+' : '@'
  }
  rows[player.r][player.c] = leave
  const built = rows.map((row) => row.join(''))
  const won = !built.some((row) => row.includes('$') || row.includes('.'))
  const level = won && state.level < LEVELS.length - 1 ? state.level : state.level
  return { rows: built, level, won }
}

export function nextPush(state: Push): Push {
  if (!state.won || state.level >= LEVELS.length - 1) return state
  return freshPush(state.level + 1)
}
