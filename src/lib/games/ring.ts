/** Timing bout. Dodge the strike, then punch the unguarded side. */

export type RingSide = 'high' | 'low'
export type RingInput = { dodge: RingSide | 'none'; punch: RingSide | 'none' }
export type RingPhase = 'tell' | 'strike' | 'recover'

export type Ring = {
  playerHp: number
  oppHp: number
  phase: RingPhase
  timer: number
  kind: RingSide
  guard: RingSide
  dodge: RingSide | 'none'
  dodgeFor: number
  punched: boolean
  score: number
  round: number
  pattern: number
  won: boolean
  dead: boolean
  tick: number
}

const NONE: RingInput = { dodge: 'none', punch: 'none' }

export function freshRing(): Ring {
  return {
    playerHp: 100,
    oppHp: 40,
    phase: 'tell',
    timer: 28,
    kind: 'high',
    guard: 'low',
    dodge: 'none',
    dodgeFor: 0,
    punched: false,
    score: 0,
    round: 1,
    pattern: 0,
    won: false,
    dead: false,
    tick: 0,
  }
}

function nextTell(state: Ring, pattern: number): Pick<Ring, 'kind' | 'guard' | 'timer' | 'phase' | 'punched'> {
  const kind: RingSide = pattern % 2 === 0 ? 'high' : 'low'
  const guard: RingSide = pattern % 3 === 0 ? 'low' : 'high'
  return { kind, guard, timer: Math.max(14, 28 - state.round * 3), phase: 'tell', punched: false }
}

export function stepRing(state: Ring, input: RingInput = NONE): Ring {
  if (state.dead || state.won) return state
  let { playerHp, oppHp, phase, timer, score, round, pattern, dodge, dodgeFor, punched } = state
  if (input.dodge !== 'none') {
    dodge = input.dodge
    dodgeFor = 12
  } else dodgeFor = Math.max(0, dodgeFor - 1)
  if (dodgeFor === 0) dodge = 'none'

  if (phase === 'tell') {
    timer -= 1
    if (timer <= 0) {
      phase = 'strike'
      timer = 10
    }
  } else if (phase === 'strike') {
    if (timer === 10) {
      if (dodge !== state.kind) {
        playerHp -= 12
        score = Math.max(0, score - 5)
      } else score += 25
    }
    timer -= 1
    if (timer <= 0) {
      phase = 'recover'
      timer = 26
      punched = false
    }
  } else {
    if (!punched && input.punch !== 'none') {
      punched = true
      if (input.punch !== state.guard) {
        oppHp -= 12
        score += 50
      } else score += 5
    }
    timer -= 1
    if (timer <= 0) {
      pattern += 1
      const tell = nextTell(state, pattern)
      phase = tell.phase
      timer = tell.timer
      punched = false
      return {
        ...state,
        ...tell,
        playerHp,
        oppHp,
        dodge,
        dodgeFor,
        score,
        round,
        pattern,
        tick: state.tick + 1,
      }
    }
  }

  let won = false
  if (oppHp <= 0) {
    round += 1
    if (round > 3) won = true
    else {
      oppHp = 30 + round * 12
      pattern += 1
      const tell = nextTell({ ...state, round }, pattern)
      return {
        ...state,
        ...tell,
        playerHp,
        oppHp,
        dodge,
        dodgeFor,
        score: score + 100,
        round,
        pattern,
        tick: state.tick + 1,
      }
    }
  }
  if (playerHp <= 0) {
    return {
      ...state,
      playerHp: 0,
      oppHp,
      phase,
      timer,
      dodge,
      dodgeFor,
      punched,
      score,
      round,
      pattern,
      dead: true,
      tick: state.tick + 1,
    }
  }
  return {
    ...state,
    playerHp,
    oppHp,
    phase,
    timer,
    dodge,
    dodgeFor,
    punched,
    score,
    round,
    won,
    tick: state.tick + 1,
  }
}

export const RING_IDLE: RingInput = NONE
