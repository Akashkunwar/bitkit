import { describe, expect, it } from 'vitest'
import { searchTools } from '../registry'
import { freshHaul, haulSlope, stepHaul } from '../lib/games/haul'
import { freshBound, stepBound, type Bound } from '../lib/games/bound'
import { freshFuse, FUSE_WORDS, submitFuse, stepFuse } from '../lib/games/fuse'
import { freshBlob, stepBlob, type BlobGame } from '../lib/games/blob'
import { freshWyrm, stepWyrm, type Wyrm } from '../lib/games/wyrm'
import { freshPit, stepPit, type Pit } from '../lib/games/pit'
import { claimTurf, freshTurf, stepTurf, TURF_N } from '../lib/games/turf'

describe('haul', () => {
  it('gains speed on the gas and slows when braking', () => {
    let gas = freshHaul()
    let brake = freshHaul()
    for (let i = 0; i < 40; i += 1) {
      gas = stepHaul(gas, true, false)
      brake = stepHaul(brake, false, true)
    }
    expect(gas.x).toBeGreaterThan(brake.x)
    expect(gas.vx).toBeGreaterThan(0)
  })

  it('crosses the hills when the rider eases off the steep faces', () => {
    let state = freshHaul()
    for (let i = 0; i < 2500 && !state.dead; i += 1) {
      const uphill = Math.sin(haulSlope(state.x)) < -0.2
      const brake = uphill && state.vx > 3.4
      state = stepHaul(state, state.vx < 3.1 && !brake, brake)
    }
    expect(state.dead).toBe(false)
    expect(state.x).toBeGreaterThan(1500)
    expect(state.coins).toBeGreaterThan(0)
    expect(state.fuel).toBeGreaterThan(10)
  })
})

describe('bound', () => {
  it('bounces off a pad and dies on a spike or a fall', () => {
    const pad: Bound = {
      x: 40,
      y: 88,
      vx: 0,
      vy: 2,
      pads: [{ x: 20, y: 90, w: 80, spike: false }],
      score: 0,
      dead: false,
      seed: 1,
    }
    const bounced = stepBound(pad, false, false)
    expect(bounced.vy).toBeLessThan(0)
    expect(bounced.score).toBe(1)

    const spike = stepBound({ ...pad, pads: [{ x: 20, y: 90, w: 80, spike: true }] }, false, false)
    expect(spike.dead).toBe(true)

    const fell = stepBound({ ...pad, y: 454, vy: 4, pads: [] }, false, false)
    expect(fell.dead).toBe(true)
  })

  it('steers sideways', () => {
    const start = freshBound(1)
    const left = stepBound(start, true, false)
    const right = stepBound(start, false, true)
    expect(left.x).toBeLessThan(start.x)
    expect(right.x).toBeGreaterThan(start.x)
  })
})

describe('fuse', () => {
  it('accepts a listed word that contains the prompt and rejects the rest', () => {
    const state = freshFuse(4)
    const word = FUSE_WORDS.find((entry) => entry.includes(state.prompt))
    expect(word).toBeTruthy()
    const hit = submitFuse(state, word ?? '')
    expect(hit.score).toBe(1)
    expect(hit.time).toBeGreaterThan(state.time)
    expect(hit.used).toEqual([word])
    expect(submitFuse(hit, word ?? '').note).toMatch(/Already/)
    expect(submitFuse(state, 'zzzz').note).toMatch(/list/)
    expect(submitFuse(state, 'people').score).toBe(state.prompt && 'people'.includes(state.prompt) ? 1 : 0)
    let dying = { ...state, time: 1 }
    dying = stepFuse(dying)
    expect(dying.dead).toBe(true)
  })
})

describe('blob', () => {
  it('moves, eats a dot, and loses to a larger cell', () => {
    const start = freshBlob(2)
    const moved = stepBlob(start, 1, 0)
    expect(moved.cells[0].x).toBeGreaterThan(start.cells[0].x)

    const eating: BlobGame = {
      ...start,
      dots: [{ x: start.cells[0].x, y: start.cells[0].y }],
      cells: [start.cells[0]],
    }
    const ate = stepBlob(eating, 0, 0)
    expect(ate.cells[0].r).toBeGreaterThan(start.cells[0].r)

    const eaten = stepBlob(
      {
        ...start,
        dots: [],
        cells: [
          { id: 0, x: 100, y: 100, r: 16, bot: false },
          { id: 1, x: 100, y: 100, r: 40, bot: true },
        ],
      },
      0,
      0,
    )
    expect(eaten.dead).toBe(true)
  })
})

describe('wyrm', () => {
  it('turns, grows on an orb, and dies on a body', () => {
    const start = freshWyrm(1)
    const turned = stepWyrm(start, false, true)
    expect(turned.bodies[0].angle).toBeGreaterThan(start.bodies[0].angle)

    const head = start.bodies[0].pts[0]
    const hungry: Wyrm = { ...start, orbs: [{ x: head.x + 2, y: head.y }] }
    const grew = stepWyrm(hungry, false, false)
    expect(grew.score).toBe(1)
    expect(grew.bodies[0].pts.length).toBeGreaterThan(start.bodies[0].pts.length - 1)

    const loop = start.bodies[0].pts.map((point) => ({ ...point }))
    loop[12] = { ...loop[0] }
    const crashed = stepWyrm(
      { ...start, bodies: [{ ...start.bodies[0], pts: loop }, ...start.bodies.slice(1)] },
      false,
      false,
    )
    expect(crashed.dead).toBe(true)
  })
})

describe('pit', () => {
  it('eats a smaller block, ignores a larger one, and ends when time runs out', () => {
    const start = freshPit(1)
    const moved = stepPit(start, 1, 0)
    expect(moved.x).toBeGreaterThan(start.x)

    const meal: Pit = { ...start, things: [{ x: start.x, y: start.y, r: 8 }] }
    const ate = stepPit(meal, 0, 0)
    expect(ate.r).toBeGreaterThan(start.r)
    expect(ate.score).toBeGreaterThan(0)

    const blocked = stepPit({ ...start, things: [{ x: start.x, y: start.y, r: 40 }] }, 0, 0)
    expect(blocked.r).toBe(start.r)

    const done = stepPit({ ...start, time: 1 }, 0, 0)
    expect(done.over).toBe(true)
  })
})

describe('turf', () => {
  it('captures the cells a closed trail seals off', () => {
    const grid = Array.from({ length: TURF_N * TURF_N }, () => 0)
    grid[1 * TURF_N + 1] = 1
    const trail = [
      1 * TURF_N + 2,
      1 * TURF_N + 3,
      2 * TURF_N + 3,
      3 * TURF_N + 3,
      3 * TURF_N + 2,
      3 * TURF_N + 1,
      2 * TURF_N + 1,
    ]
    const next = claimTurf(grid, trail, 1)
    expect(next[2 * TURF_N + 2]).toBe(1)
    expect(next[1 * TURF_N + 2]).toBe(1)
    expect(next[10 * TURF_N + 10]).toBe(0)
  })

  it('waits in its patch until you move', () => {
    let state = freshTurf(1)
    for (let i = 0; i < 40; i += 1) state = stepTurf(state, 0, 0)
    expect(state.dead).toBe(false)
    expect(state.x).toBe(3)
  })

  it('dies on its own trail and by leaving the board', () => {
    const state = freshTurf(1)
    const leaving = {
      ...state,
      x: 6,
      y: 17,
      trail: [17 * TURF_N + 7],
      dirX: 1,
      dirY: 0,
    }
    expect(stepTurf(leaving, 1, 0).dead).toBe(true)
    expect(stepTurf({ ...state, x: 0, y: 0, dirX: -1, dirY: 0, trail: [] }, -1, 0).dead).toBe(true)
  })
})

describe('search', () => {
  it('finds the new games by the names people remember', () => {
    expect(searchTools('hill climb').some((tool) => tool.id === 'haul')).toBe(true)
    expect(searchTools('bounce').some((tool) => tool.id === 'bound')).toBe(true)
    expect(searchTools('bomb party').some((tool) => tool.id === 'fuse')).toBe(true)
    expect(searchTools('jklm').some((tool) => tool.id === 'fuse')).toBe(true)
    expect(searchTools('agar').some((tool) => tool.id === 'blob')).toBe(true)
    expect(searchTools('slither').some((tool) => tool.id === 'wyrm')).toBe(true)
    expect(searchTools('hole.io').some((tool) => tool.id === 'pit')).toBe(true)
    expect(searchTools('paper.io').some((tool) => tool.id === 'turf')).toBe(true)
    expect(searchTools('sudoku')[0]?.id).toBe('sudoku')
    expect(searchTools('wordle').some((tool) => tool.id === 'guess')).toBe(true)
  })
})
