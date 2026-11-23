import { describe, expect, it } from 'vitest'
import {
  addScore,
  assignRoles,
  canSteal,
  countdownLabel,
  meditationPhases,
  nextPlayer,
  nextPrompt,
  pickName,
  raceStep,
  rollNotation,
  simulateHunger,
  singleElim,
  targetPosition,
} from '../lib/playroom'

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('playroom', () => {
  it('labels a countdown as mm:ss', () => {
    expect(countdownLabel(65)).toBe('1:05')
    expect(countdownLabel(5)).toBe('0:05')
    expect(countdownLabel(60)).toBe('1:00')
  })

  it('keeps the highest 3 dice of 4d6 and totals their sum', () => {
    const rand = mulberry32(42)
    const rolled = [0, 1, 2, 3].map(() => 1 + Math.floor(rand() * 6))
    const kept = [...rolled].sort((a, b) => a - b).slice(-3)
    const result = rollNotation('4d6kh3', 42)
    expect(result.rolls).toHaveLength(3)
    expect([...result.rolls].sort((a, b) => a - b)).toEqual(kept)
    expect(result.total).toBe(result.rolls.reduce((sum, roll) => sum + roll, 0))
    expect(rollNotation('4d6kh3', 42)).toEqual(result)
    expect(rollNotation('4d6kh3', 1)).not.toEqual(rollNotation('4d6kh3', 2))
  })

  it('adds a modifier without changing the dice', () => {
    const plain = rollNotation('2d20', 5)
    const modified = rollNotation('2d20+3', 5)
    expect(modified.rolls).toEqual(plain.rolls)
    expect(modified.total).toBe(plain.total + 3)
  })

  it('assigns exactly one imposter', () => {
    const names = ['Asha', 'Dev', 'Mina', 'Rohit']
    for (let seed = 0; seed < 20; seed += 1) {
      const roles = assignRoles(names, seed)
      expect(roles.map((entry) => entry.name)).toEqual(names)
      expect(roles.filter((entry) => entry.role === 'imposter')).toHaveLength(1)
      expect(roles.filter((entry) => entry.role === 'crew')).toHaveLength(3)
    }
    expect(assignRoles([], 1)).toEqual([])
    expect(assignRoles(['Solo'], 4)).toEqual([{ name: 'Solo', role: 'imposter' }])
  })

  it('pairs four names into two matches', () => {
    const matches = singleElim(['Ann', 'Bo', 'Cy', 'Di'])
    expect(matches).toHaveLength(2)
    expect(matches).toEqual([
      ['Ann', 'Bo'],
      ['Cy', 'Di'],
    ])
  })

  it('steps a race into a permutation', () => {
    const names = ['Chestnut', 'Bay', 'Grey', 'Pinto']
    const stepped = raceStep(names, 4)
    expect(stepped).toHaveLength(names.length)
    expect([...stepped].sort()).toEqual([...names].sort())
    expect(stepped).not.toBe(names)
    expect(names).toEqual(['Chestnut', 'Bay', 'Grey', 'Pinto'])
    expect(raceStep(names, 4)).toEqual(stepped)
  })

  it('eliminates until one winner remains', () => {
    const names = ['Katniss', 'Peeta', 'Rue', 'Thresh']
    const order = simulateHunger(names, 9)
    expect(order).toHaveLength(names.length)
    expect([...order].sort()).toEqual([...names].sort())
    expect(names).toContain(order[order.length - 1])
    expect(names).toEqual(['Katniss', 'Peeta', 'Rue', 'Thresh'])
  })

  it('allows a steal only after a gift is opened, and only once', () => {
    expect(canSteal(false, false)).toBe(false)
    expect(canSteal(false, true)).toBe(false)
    expect(canSteal(true, true)).toBe(false)
    expect(canSteal(true, false)).toBe(true)
  })

  it('adds points on a new object', () => {
    const scores = { Asha: 2 }
    const next = addScore(scores, 'Asha', 3)
    expect(next).toEqual({ Asha: 5 })
    expect(next).not.toBe(scores)
    expect(scores).toEqual({ Asha: 2 })
    const added = addScore(scores, 'Dev', 1)
    expect(added).toEqual({ Asha: 2, Dev: 1 })
    expect(scores).toEqual({ Asha: 2 })
  })

  it('picks, advances, breathes, and places a target', () => {
    expect(pickName([], 1)).toBe('')
    const names = ['Ada', 'Bea', 'Cid']
    expect(names).toContain(pickName(names, 12))
    expect(pickName(names, 12)).toBe(pickName(names, 12))
    expect(nextPlayer(names, 0)).toBe(1)
    expect(nextPlayer(names, 2)).toBe(0)
    expect(nextPlayer([], 4)).toBe(0)
    expect(nextPrompt(['red', 'blue'], 0)).toBe('red')
    expect(nextPrompt(['red', 'blue'], 2)).toBe('red')
    expect(nextPrompt(['red', 'blue'], 3)).toBe('blue')
    expect(nextPrompt([], 1)).toBe('')
    const phases = meditationPhases()
    const joined = phases.map((phase) => phase.name.toLowerCase()).join(' ')
    expect(joined).toMatch(/inhale/)
    expect(joined).toMatch(/hold/)
    expect(joined).toMatch(/exhale/)
    expect(phases.every((phase) => phase.seconds > 0)).toBe(true)
    const spot = targetPosition(6, 100)
    expect(spot.x).toBeGreaterThanOrEqual(0)
    expect(spot.x).toBeLessThan(100)
    expect(spot.y).toBeGreaterThanOrEqual(0)
    expect(spot.y).toBeLessThan(100)
    expect(targetPosition(6, 100)).toEqual(spot)
  })
})
