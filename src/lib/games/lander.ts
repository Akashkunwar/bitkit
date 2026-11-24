export const LAND_W = 480
export const LAND_H = 360
export const GROUND = 320

export type Lander = {
  x: number
  y: number
  vx: number
  vy: number
  fuel: number
  pad: number
  landed: boolean
  crashed: boolean
}

export function freshLander(pad = 200): Lander {
  return { x: 80, y: 40, vx: 0.4, vy: 0, fuel: 180, pad, landed: false, crashed: false }
}

export function stepLander(state: Lander, input: { left: boolean; right: boolean; thrust: boolean }): Lander {
  if (state.landed || state.crashed) return state
  let { x, y, vx, vy, fuel } = state
  if (input.left) vx -= 0.05
  if (input.right) vx += 0.05
  if (input.thrust && fuel > 0) {
    vy -= 0.12
    fuel -= 1
  }
  vy += 0.045
  vx *= 0.995
  x += vx
  y += vy
  x = Math.max(12, Math.min(LAND_W - 12, x))
  if (y < GROUND) return { ...state, x, y, vx, vy, fuel }
  const onPad = x > state.pad && x < state.pad + 72
  const soft = Math.abs(vx) < 0.7 && Math.abs(vy) < 1.15
  return { ...state, x, y: GROUND, vx, vy, fuel, landed: onPad && soft, crashed: !(onPad && soft) }
}
