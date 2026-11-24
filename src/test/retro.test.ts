import { describe, expect, it } from 'vitest'
import { freshLedge, LEDGE_LEVELS, makeLedge, stepLedge, TILE } from '../lib/games/ledge'
import { freshRaid, stepRaid } from '../lib/games/raid'
import { freshRally, stepRally } from '../lib/games/rally'
import { freshTanks, stepTanks, TANK_MAPS, TANK_CELL } from '../lib/games/tanks'
import { freshBlast, stepBlast } from '../lib/games/blast'
import { freshBrawl, stepBrawl } from '../lib/games/brawl'
import { freshSquadron, stepSquadron } from '../lib/games/squadron'
import { freshClimb, stepClimb } from '../lib/games/climb'
import { flipperSegment, freshPins, stepPins } from '../lib/games/pins'
import { freshRing, stepRing, type RingSide } from '../lib/games/ring'
import { searchTools } from '../registry'

const still = { left: false, right: false, jump: false }
const raidStill = { left: false, right: false, jump: false, fire: false, aimUp: false }
const rallyStill = { left: false, right: false, accel: false, brake: false, shove: false }
const tankStill = { dir: null, fire: false } as const
const blastStill = { dc: 0, dr: 0, bomb: false }
const brawlStill = { left: false, right: false, punch: false, kick: false }
const squadStill = { left: false, right: false, up: false, down: false, fire: false }
const climbStill = { left: false, right: false, up: false, down: false }
const pinsStill = { left: false, right: false }
const ringStill = { dodge: 'none' as const, punch: 'none' as const }

describe('retro games', () => {
  it('jumps, stomps, banks a coin, and clears the last stage', () => {
    const jumped = stepLedge(freshLedge(), { ...still, jump: true })
    expect(jumped.vy).toBeLessThan(0)

    const start = freshLedge()
    const enemy = start.enemies.find((walker) => walker.alive)
    expect(enemy).toBeTruthy()
    const stomped = stepLedge({ ...start, x: enemy!.x, y: enemy!.y - 10, vy: 3 }, still)
    expect(stomped.score).toBeGreaterThanOrEqual(100)

    const home = freshLedge()
    let cx = 0
    let cy = 0
    home.rows.forEach((row, y) => {
      ;[...row].forEach((ch, x) => {
        if (ch === 'o' && cx === 0) {
          cx = x
          cy = y
        }
      })
    })
    const coined = stepLedge({ ...home, x: cx * TILE, y: cy * TILE, vy: 0 }, still)
    expect(coined.score).toBe(10)

    const rows = LEDGE_LEVELS[2]
    let fx = 0
    let fy = 0
    rows.forEach((row, y) => {
      ;[...row].forEach((ch, x) => {
        if (ch === 'F') {
          fx = x
          fy = y
        }
      })
    })
    const cleared = stepLedge({ ...makeLedge(rows, 2, 40, 3), x: fx * TILE, y: fy * TILE }, still)
    expect(cleared.won).toBe(true)
    expect(cleared.score).toBeGreaterThanOrEqual(40)
  })

  it('finishes each stage by running and jumping the gaps', () => {
    const finish = (level: number) => {
      let state = makeLedge(LEDGE_LEVELS[level], level, 0, 3)
      let hold = 0
      for (let i = 0; i < 4000 && state.level === level && !state.won && !state.dead; i += 1) {
        const tx = Math.floor((state.x + 12) / TILE)
        const body = Math.floor((state.y + 6) / TILE)
        const pit = state.rows[state.rows.length - 1][tx + 1] === ' '
        const spike = state.rows[body]?.[tx + 1] === '^'
        if ((pit || spike) && state.coyote > 0 && hold === 0) hold = 18
        const jump = hold > 0
        if (hold > 0) hold -= 1
        state = stepLedge(state, { left: false, right: true, jump })
      }
      return state.won || state.level !== level
    }
    expect(finish(0)).toBe(true)
    expect(finish(1)).toBe(true)
    expect(finish(2)).toBe(true)
  })

  it('fires ahead and upward, and a shot drops a soldier', () => {
    const ahead = stepRaid(freshRaid(), { ...raidStill, fire: true })
    expect(ahead.bullets.some((bullet) => !bullet.foe && bullet.vx > 0)).toBe(true)
    const upward = stepRaid(freshRaid(), { ...raidStill, fire: true, aimUp: true })
    expect(upward.bullets.some((bullet) => !bullet.foe && bullet.vy < 0)).toBe(true)
    const jumped = stepRaid(freshRaid(), { ...raidStill, jump: true })
    expect(jumped.vy).toBeLessThan(0)
    const start = freshRaid()
    const foe = start.foes[0]
    const hit = stepRaid({ ...start, bullets: [{ x: foe.x + 2, y: foe.y + 2, vx: 0, vy: 0, foe: false }] }, raidStill)
    expect(hit.score).toBe(100)
  })

  it('accelerates, gets pulled through a bend, and scores a pass and a shove', () => {
    const faster = stepRally(freshRally(), { ...rallyStill, accel: true })
    expect(faster.speed).toBeGreaterThan(freshRally().speed)
    const bent = stepRally({ ...freshRally(), z: 520, speed: 0.8 }, { ...rallyStill, accel: true })
    expect(bent.x).not.toBe(0)
    const start = freshRally()
    const passed = stepRally({ ...start, z: start.rivals[0].z, speed: 1 }, { ...rallyStill, accel: true })
    expect(passed.score).toBeGreaterThanOrEqual(100)
    const shoved = stepRally(
      { ...start, rivals: [{ ...start.rivals[0], z: start.z + 10, x: 0.3 }, ...start.rivals.slice(1)] },
      { ...rallyStill, shove: true },
    )
    expect(shoved.rivals[0].x).toBeGreaterThan(0.3)
    expect(shoved.score).toBeGreaterThan(0)
  })

  it('breaks a brick, stops on the rim, and loses the base', () => {
    TANK_MAPS.forEach((rows) => {
      expect(rows).toHaveLength(13)
      rows.forEach((row) => expect(row).toHaveLength(13))
    })
    const start = freshTanks()
    const broken = stepTanks(
      { ...start, shells: [{ x: 2 * TANK_CELL + 4, y: 2 * TANK_CELL + 12, dir: 'right', foe: false, owner: 99 }] },
      tankStill,
    )
    expect(broken.rows[2][2]).toBe('.')
    const rim = stepTanks({ ...start, shells: [{ x: 20, y: 36, dir: 'left', foe: false, owner: 99 }] }, tankStill)
    expect(rim.rows[1][0]).toBe('#')
    const foe = start.tanks.find((tank) => tank.foe)
    expect(foe).toBeTruthy()
    const shot = stepTanks(
      { ...start, shells: [{ x: foe!.x + 9, y: foe!.y + 9, dir: 'up', foe: false, owner: 0 }] },
      tankStill,
    )
    expect(shot.tanks.find((tank) => tank.id === foe!.id)?.alive).toBe(false)
    let bc = 0
    let br = 0
    start.rows.forEach((row, r) => {
      ;[...row].forEach((ch, c) => {
        if (ch === 'B') {
          bc = c
          br = r
        }
      })
    })
    const lost = stepTanks(
      { ...start, shells: [{ x: bc * TANK_CELL + 12, y: br * TANK_CELL + 12, dir: 'up', foe: true, owner: 4 }] },
      tankStill,
    )
    expect(lost.dead).toBe(true)
  })

  it('blows a soft block and a crawler', () => {
    const boom = stepBlast({ ...freshBlast(), bombs: [{ c: 3, r: 1, fuse: 1, range: 2, armed: true }] }, blastStill)
    expect(boom.rows[1][3]).toBe(' ')
    expect(boom.flames.length).toBeGreaterThan(0)
    const cleared = stepBlast(
      { ...freshBlast(), enemies: [{ c: 4, r: 1, alive: true }], flames: [{ c: 4, r: 1, life: 8 }] },
      blastStill,
    )
    expect(cleared.enemies).toHaveLength(0)
    expect(cleared.won).toBe(true)
  })

  it('punches in front, misses behind, and takes a hit up close', () => {
    const start = freshBrawl()
    const front = stepBrawl({ ...start, foes: [{ ...start.foes[0], x: start.x + 24 }] }, { ...brawlStill, punch: true })
    expect(front.foes[0].hp).toBeLessThan(start.foes[0].hp)
    const behind = stepBrawl(
      { ...start, foes: [{ ...start.foes[0], x: start.x - 40 }] },
      { ...brawlStill, punch: true },
    )
    expect(behind.foes[0].hp).toBe(start.foes[0].hp)
    const crowded = stepBrawl({ ...start, foes: [{ ...start.foes[0], x: start.x }] }, brawlStill)
    expect(crowded.hp).toBeLessThan(start.hp)
  })

  it('scores a hit on a bandit and loses a life for a ram', () => {
    const start = freshSquadron()
    const hit = stepSquadron(
      {
        ...start,
        foes: [{ x: 100, y: 80, vx: 0, hp: 1, kind: 0 }],
        shots: [{ x: 108, y: 84, vx: 0, vy: 0, foe: false }],
        spawned: 1,
      },
      squadStill,
    )
    expect(hit.score).toBe(20)
    const ram = stepSquadron({ ...start, foes: [{ x: start.x, y: start.y, vx: 0, hp: 2, kind: 1 }] }, squadStill)
    expect(ram.lives).toBe(2)
  })

  it('jumps, climbs, dodges a barrel by losing a life, and wins at the top', () => {
    const jumped = stepClimb(freshClimb(), { ...climbStill, up: true })
    expect(jumped.vy).toBeLessThan(0)
    const climbed = stepClimb({ ...freshClimb(), x: 324, y: 250 }, { ...climbStill, up: true })
    expect(climbed.y).toBeLessThan(250)
    const crushed = stepClimb({ ...freshClimb(), barrels: [{ x: 28, y: freshClimb().y, vx: 0, vy: 0 }] }, climbStill)
    expect(crushed.lives).toBe(2)
    const topped = stepClimb({ ...freshClimb(), x: 40, y: 58 }, climbStill)
    expect(topped.won).toBe(true)
  })

  it('drops the ball, kicks it off a flipper, and drains a ball', () => {
    const falling = stepPins({ ...freshPins(), locked: false, x: 160, y: 70, vx: 0, vy: 0 }, pinsStill)
    expect(falling.vy).toBeGreaterThan(0)
    const bumped = stepPins({ ...freshPins(), locked: false, x: 160, y: 128, vx: 0, vy: 2 }, pinsStill)
    expect(bumped.score).toBeGreaterThanOrEqual(50)
    expect(bumped.vy).toBeLessThan(0)
    const [ax, ay, bx, by] = flipperSegment('left', 0)
    const kicked = stepPins(
      { ...freshPins(), locked: false, x: (ax + bx) / 2, y: (ay + by) / 2 - 4, vx: 0, vy: 1, left: 0 },
      { left: true, right: false },
    )
    expect(kicked.vy).toBeLessThan(0)
    const drained = stepPins({ ...freshPins(), locked: false, x: 160, y: 440, vx: 0, vy: 1, balls: 2 }, pinsStill)
    expect(drained.balls).toBe(1)
    expect(drained.locked).toBe(true)
  })

  it('dodges a matching strike and lands the open punch', () => {
    let bout = freshRing()
    while (bout.phase !== 'strike') bout = stepRing(bout, ringStill)
    const safe = stepRing(bout, { dodge: bout.kind, punch: 'none' })
    expect(safe.playerHp).toBe(100)
    let again = freshRing()
    while (again.phase !== 'strike') again = stepRing(again, ringStill)
    const tagged = stepRing(again, ringStill)
    expect(tagged.playerHp).toBeLessThan(100)

    let open = freshRing()
    while (open.phase !== 'recover') open = stepRing(open, { dodge: open.kind, punch: 'none' })
    const punch: RingSide = open.guard === 'high' ? 'low' : 'high'
    const landed = stepRing(open, { dodge: 'none', punch })
    expect(landed.oppHp).toBe(open.oppHp - 12)
    const blocked = stepRing(open, { dodge: 'none', punch: open.guard })
    expect(blocked.oppHp).toBe(open.oppHp)
  })

  it('is findable by the names people remember', () => {
    expect(searchTools('mario').some((tool) => tool.id === 'ledge')).toBe(true)
    expect(searchTools('contra').some((tool) => tool.id === 'raid')).toBe(true)
    expect(searchTools('road rash').some((tool) => tool.id === 'rally')).toBe(true)
    expect(searchTools('battle city').some((tool) => tool.id === 'tanks')).toBe(true)
    expect(searchTools('bomberman').some((tool) => tool.id === 'blast')).toBe(true)
    expect(searchTools('pinball').some((tool) => tool.id === 'pins')).toBe(true)
  })
})
