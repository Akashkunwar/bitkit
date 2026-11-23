import { describe, expect, it } from 'vitest'
import {
  brickCount,
  circlePoints,
  domeLayers,
  downscale,
  paintIds,
  perlerCounts,
  sphereLayers,
  stitchSymbols,
  stringArtSteps,
} from '../lib/craft'
import {
  COUNTRIES,
  cradleFrame,
  dropBall,
  harmonographPoints,
  mandelbrotEscape,
  parseTimeline,
  period,
  planetAngle,
  primesUpTo,
  spirographPoints,
  stepBodies,
  stepLife,
  stepParticles,
  stepPendulum,
  stepSand,
  sunSign,
  toggleCountry,
  trajectory,
} from '../lib/sims'

describe('simulations', () => {
  it('turns a vertical blinker into a horizontal blinker', () => {
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ]
    const next = stepLife(grid)
    expect(next).toEqual([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ])
    expect(grid[1][2]).toBe(1)
    expect(next).not.toBe(grid)
    expect(next[2]).not.toBe(grid[2])
  })

  it('conserves particles', () => {
    expect(stepParticles(12)).toBe(12)
    expect(stepParticles(0)).toBe(0)
  })

  it('drops a grain at the top by one cell without mutating the column', () => {
    const column = [1, 0, 0]
    expect(stepSand(column, true)).toEqual([0, 1, 0])
    expect(column).toEqual([1, 0, 0])
    expect(stepSand([1, 0, 0], false)).toEqual([1, 0, 0])
  })

  it('keeps the origin inside the Mandelbrot set and lets (2, 2) escape', () => {
    expect(mandelbrotEscape(0, 0)).toBe(20)
    expect(mandelbrotEscape(2, 2)).toBeLessThan(20)
  })

  it('lists primes up to 10', () => {
    expect(primesUpTo(10)).toEqual([2, 3, 5, 7])
  })

  it('steps a pendulum with finite angle and speed', () => {
    const next = stepPendulum(0.4, 0.1, 0.016)
    expect(Number.isFinite(next.theta)).toBe(true)
    expect(Number.isFinite(next.omega)).toBe(true)
  })

  it('increments one Galton bin on a new array', () => {
    const bins = [0, 0, 0]
    expect(dropBall(bins, 1)).toEqual([0, 1, 0])
    expect(bins).toEqual([0, 0, 0])
  })

  it('lifts one end ball of a cradle', () => {
    expect(cradleFrame(5, 0)).toEqual([1, 0, 0, 0, 0])
    expect(cradleFrame(5, 1)).toEqual([0, 0, 0, 0, 1])
    expect(cradleFrame(5, 2)[0]).toBe(1)
  })

  it('returns one harmonograph and spirograph point per step', () => {
    expect(harmonographPoints(30)).toHaveLength(30)
    expect(spirographPoints(40)).toHaveLength(40)
    expect(harmonographPoints(4).every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true)
  })

  it('keeps every body when gravity steps', () => {
    const bodies = [
      { x: 0, y: 0, vx: 0, vy: 0 },
      { x: 2, y: 0, vx: 0, vy: 0.1 },
    ]
    const next = stepBodies(bodies)
    expect(next).toHaveLength(bodies.length)
    expect(bodies[0]).toEqual({ x: 0, y: 0, vx: 0, vy: 0 })
    expect(next[0]).not.toBe(bodies[0])
  })

  it('returns a finite planet angle', () => {
    expect(Number.isFinite(planetAngle(0, 10))).toBe(true)
    expect(Number.isFinite(planetAngle(3, 80))).toBe(true)
    expect(planetAngle(0, 10)).not.toBe(planetAngle(2, 10))
  })

  it('gives a positive finite range for a 45 degree throw', () => {
    const { range } = trajectory(10, Math.PI / 4)
    expect(Number.isFinite(range)).toBe(true)
    expect(range).toBeGreaterThan(0)
  })

  it('matches the pendulum period formula', () => {
    expect(period(2, 9.81)).toBe(2 * Math.PI * Math.sqrt(2 / 9.81))
    expect(period(1)).toBe(2 * Math.PI * Math.sqrt(1 / 9.81))
  })

  it('reads 21 March as Aries', () => {
    expect(sunSign(3, 21)).toBe('Aries')
  })

  it('toggles countries on a list of at least 20 names', () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(20)
    const selected = ['Japan']
    expect(toggleCountry(selected, 'India')).toEqual(['Japan', 'India'])
    expect(selected).toEqual(['Japan'])
    expect(toggleCountry(['Japan', 'India'], 'Japan')).toEqual(['India'])
  })

  it('parses a timeline point and rejects invalid JSON', () => {
    expect(parseTimeline('[{"lat":1,"lng":2,"time":"t"}]')).toEqual([{ lat: 1, lng: 2, time: 't' }])
    expect(() => parseTimeline('not json')).toThrow(Error)
    expect(() => parseTimeline('{')).toThrow(/JSON/)
  })
})

describe('craft patterns', () => {
  it('counts perler colors', () => {
    expect(perlerCounts(['red', 'red', 'blue'])).toEqual({ red: 2, blue: 1 })
  })

  it('assigns a fixed alphabet symbol to each stitch color', () => {
    const symbols = stitchSymbols(['red', 'blue', 'red', 'green'])
    expect(symbols).toHaveLength(4)
    expect(symbols[0]).toBe(symbols[2])
    expect(new Set(symbols).size).toBe(3)
    expect(symbols).toEqual(stitchSymbols(['red', 'blue', 'red', 'green']))
    expect(symbols.every((symbol) => symbol.length === 1 && /[A-Z0-9]/.test(symbol))).toBe(true)
  })

  it('counts one brick per cell', () => {
    expect(brickCount(4, 5)).toBe(20)
  })

  it('downscales a 4x4 field of ones by 2', () => {
    const grid = [
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ]
    expect(downscale(grid, 2)).toEqual([
      [1, 1],
      [1, 1],
    ])
  })

  it('gives two colors two paint ids', () => {
    expect(paintIds(['crimson', 'navy'])).toEqual([1, 2])
    expect(new Set(paintIds(['red', 'blue', 'red'])).size).toBe(2)
  })

  it('joins distinct nails', () => {
    const steps = stringArtSteps(4)
    expect(steps.length).toBeGreaterThan(0)
    for (const [from, to] of steps) {
      expect(from).not.toBe(to)
      expect(from).toBeGreaterThanOrEqual(0)
      expect(from).toBeLessThan(4)
      expect(to).toBeGreaterThanOrEqual(0)
      expect(to).toBeLessThan(4)
    }
  })

  it('includes the four axis points of a radius-2 circle as integers', () => {
    const points = circlePoints(2)
    const has = (x: number, y: number) => points.some((point) => point.x === x && point.y === y)
    expect(has(2, 0)).toBe(true)
    expect(has(-2, 0)).toBe(true)
    expect(has(0, 2)).toBe(true)
    expect(has(0, -2)).toBe(true)
    expect(points.every((point) => Number.isInteger(point.x) && Number.isInteger(point.y))).toBe(true)
  })

  it('gives a radius-2 sphere a middle layer and a dome of the upper half', () => {
    const sphere = sphereLayers(2)
    const middle = sphere[Math.floor(sphere.length / 2)]
    expect(middle).toBeDefined()
    expect(middle.length).toBeGreaterThan(sphere[0].length)
    const dome = domeLayers(2)
    expect(dome).toEqual(sphere.slice(Math.floor(sphere.length / 2)))
    expect(dome[0]).toEqual(middle)
  })
})
