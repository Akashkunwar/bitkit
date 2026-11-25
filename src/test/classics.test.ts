import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../lib/games/random'
import { stepAsteroids } from '../lib/games/asteroids'
import { freshInvaders, stepInvaders } from '../lib/games/invaders'
import { freshLander, stepLander } from '../lib/games/lander'
import { freshFlap, stepFlap } from '../lib/games/flap'
import { freshRunner, stepRunner } from '../lib/games/runner'
import { freshHopper, stepHopper } from '../lib/games/hopper'
import { freshCycles, stepCycles } from '../lib/games/cycles'
import { dropStack, freshStack } from '../lib/games/stack'
import { freshCatch, stepCatch } from '../lib/games/catch'
import { freshMole, whack } from '../lib/games/mole'
import { freshMissile, launchMissile, stepMissile } from '../lib/games/missile'
import { freshMuncher, stepMuncher } from '../lib/games/muncher'
import { dropConnect, freshConnect, lineWinner } from '../lib/games/connect4'
import { flips, freshReversi, playReversi } from '../lib/games/reversi'
import { draughtMoves, freshDraughts, playDraughts } from '../lib/games/draughts'
import { freshFive, playFive } from '../lib/games/five'
import { freshLights, lightsOut, toggleLight } from '../lib/games/lights'
import { fifteenSolved, freshFifteen, slideFifteen } from '../lib/games/fifteen'
import { freshRepeat, pressRepeat } from '../lib/games/repeat'
import { feedback, freshMaster, guessMaster } from '../lib/games/master'
import { freshHangman, guessLetter, wonHangman } from '../lib/games/hangman'
import { freshShips, shootThem } from '../lib/games/ships'
import { freshBlackjack, handValue, standBlackjack } from '../lib/games/blackjack'
import { freshKlondike, klondikeWon, toFoundation, toTableau } from '../lib/games/klondike'
import { freshPush, stepPush } from '../lib/games/push'
import { freshSudoku, sudokuSolved } from '../lib/games/sudoku'
import { GUESS_WORDS, markGuess, submitGuess, freshGuess } from '../lib/games/guess'
import { freshBoxes, playBoxes } from '../lib/games/boxes'
import { freshTowers, moveTower, towersWon } from '../lib/games/towers'
import { takeYacht, yachtScore, yachtTotal } from '../lib/games/yacht'
import { callHigher, cardLabel, freshHigher } from '../lib/games/higher'
import { freshPegs, playPeg } from '../lib/games/pegs'
import { freshMaze, MAZE_E, MAZE_N, MAZE_S, MAZE_W, moveMaze } from '../lib/games/maze'

describe('more classic games', () => {
  it('splits an asteroid that a shot hits', () => {
    const state = {
      ship: { x: 240, y: 180, a: 0, vx: 0, vy: 0, inv: 30 },
      rocks: [{ x: 100, y: 100, vx: 0, vy: 0, r: 30 }],
      bolts: [{ x: 100, y: 100, vx: 0, vy: 0, life: 4 }],
      score: 0,
      lives: 3,
      dead: false,
      cool: 0,
      wave: 0,
    }
    const next = stepAsteroids(state, { left: false, right: false, thrust: false, fire: false }, () => 0.25)
    expect(next.score).toBeGreaterThan(0)
    expect(next.rocks).toHaveLength(2)
  })

  it('removes an invader under a shot', () => {
    const state = freshInvaders()
    state.aliens[0].alive = true
    state.shots = [{ x: state.aliens[0].x + 12, y: state.aliens[0].y + 8, vy: -7 }]
    const next = stepInvaders(state, 0, false)
    expect(next.aliens[0].alive).toBe(false)
    expect(next.score).toBe(10)
  })

  it('lands softly on the pad and crashes a hard fall', () => {
    const landed = stepLander(
      { ...freshLander(80), x: 100, y: 319.7, vx: 0.1, vy: 0.4, fuel: 10 },
      { left: false, right: false, thrust: false },
    )
    expect(landed.landed).toBe(true)
    const crashed = stepLander(
      { ...freshLander(200), x: 40, y: 319.7, vx: 2, vy: 3, fuel: 10 },
      { left: false, right: false, thrust: false },
    )
    expect(crashed.crashed).toBe(true)
  })

  it('flaps upward and a runner jumps off the ground', () => {
    const flap = stepFlap(freshFlap(), true)
    expect(flap.vy).toBeLessThan(0)
    const runner = stepRunner(freshRunner(), true)
    expect(runner.y).toBeLessThan(190)
  })

  it('hops along the safe row', () => {
    const next = stepHopper(freshHopper(), { dc: -1, dr: 0 })
    expect(next.c).toBe(4)
    expect(next.r).toBe(7)
    expect(next.cars[0].x).not.toBe(0)
  })

  it('moves both light cycles forward', () => {
    const next = stepCycles(freshCycles(), 0)
    expect(next.a.x).toBe(5)
    expect(next.b.x).toBe(34)
    expect(next.over).toBe(0)
  })

  it('keeps only the overlapping part of a dropped block', () => {
    const dropped = dropStack({ ...freshStack(), x: 100, w: 140 })
    expect(dropped.blocks[1].w).toBe(120)
    expect(dropped.score).toBe(1)
  })

  it('scores a catch and a whack', () => {
    const caught = stepCatch({ ...freshCatch(), x: 40, items: [{ x: 50, y: 300, good: true }], tick: 1 }, 0)
    expect(caught.score).toBe(1)
    expect(whack({ ...freshMole(), up: 2 }, 2).score).toBe(1)
  })

  it('blasts a missile that sits inside the burst', () => {
    const armed = launchMissile(freshMissile(), 40, 20)
    const next = stepMissile(armed)
    expect(next.score).toBe(1)
    expect(next.incoming.every((shot) => shot.y > 20 || shot.x > 80)).toBe(true)
  })

  it('eats a dot and steps the ghost closer', () => {
    const next = stepMuncher(freshMuncher(), { x: 1, y: 0 }, true)
    expect(next.score).toBe(1)
    expect(next.gx).toBeLessThan(13)
  })

  it('drops a connect-four winner and blocks nothing on an empty board', () => {
    let state = freshConnect()
    for (let n = 0; n < 4; n += 1) state = dropConnect({ ...state, turn: 1 }, 0)
    expect(lineWinner(state.cells)).toBe(1)
  })

  it('flips a flanked reversi disk', () => {
    const cells = freshReversi().cells
    expect(flips(cells, 19, 1)).toContain(27)
    const next = playReversi(freshReversi(), 19)
    expect(next.cells[19]).toBe(1)
    expect(next.cells[27]).toBe(1)
  })

  it('jumps in draughts and crowns nothing on the first step', () => {
    const cells = Array(64).fill(0)
    cells[35] = 1
    cells[26] = -1
    const jumps = draughtMoves(cells, 1)
    expect(jumps.some((move) => move.capture === 26)).toBe(true)
    const next = playDraughts({ ...freshDraughts(), cells, turn: 1, chain: -1, over: 0 }, jumps[0])
    expect(next.cells[26]).toBe(0)
  })

  it('ends a draughts turn when a man is crowned', () => {
    const cells = Array(64).fill(0)
    cells[17] = 1
    cells[10] = -1
    cells[12] = -1
    const next = playDraughts(
      { ...freshDraughts(), cells, turn: 1, chain: -1, over: 0 },
      { from: 17, to: 3, capture: 10 },
    )
    expect(next.cells[3]).toBe(2)
    expect(next.turn).toBe(-1)
    expect(next.chain).toBe(-1)
    expect(next.cells[12]).toBe(-1)
  })

  it('wins five in a row', () => {
    let state = freshFive()
    for (let col = 0; col < 5; col += 1) state = playFive({ ...state, turn: 1 }, col)
    expect(state.winner).toBe(1)
  })

  it('turns a light back off', () => {
    const on = toggleLight(Array(25).fill(false), 12)
    expect(on.filter(Boolean)).toHaveLength(5)
    expect(lightsOut(toggleLight(on, 12))).toBe(true)
    let n = 0
    expect(freshLights(() => (n = (n + 1) % 9) / 10).some(Boolean)).toBe(true)
  })

  it('slides the fifteen blank only when the tile is beside it', () => {
    const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15]
    expect(slideFifteen(tiles, 15)[15]).toBe(0)
    expect(freshFifteen(() => 0.3)).toHaveLength(16)
    expect(fifteenSolved([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0])).toBe(true)
  })

  it('grows the repeat sequence and rejects a wrong press', () => {
    const start = freshRepeat(() => 0)
    const next = pressRepeat(start, start.sequence[0], () => 0.9)
    expect(next.sequence).toHaveLength(2)
    expect(pressRepeat(start, (start.sequence[0] + 1) % 4, () => 0).failed).toBe(true)
  })

  it('marks a code peg and a hangman miss', () => {
    expect(feedback([0, 0, 1, 1], [0, 1, 0, 2])).toEqual({ exact: 1, color: 2 })
    const solved = guessMaster(
      freshMaster(() => 0),
      [0, 0, 0, 0],
    )
    expect(solved.guesses[0].exact).toBe(4)
    const missed = guessLetter(
      freshHangman(() => 0),
      'Z',
    )
    expect(missed.misses).toBe(1)
    expect(
      wonHangman(
        guessLetter(
          freshHangman(() => 0),
          'A',
        ),
      ),
    ).toBe(false)
  })

  it('fires at the enemy fleet and answers', () => {
    const state = freshShips(2)
    const target = state.them.findIndex((cell) => cell > 0)
    const next = shootThem(state, target)
    expect(next.yourShots[target]).toBe(2)
    expect(next.theirShots.some((shot) => shot > 0)).toBe(true)
  })

  it('deals twenty-one and lets the dealer draw to 17', () => {
    const state = freshBlackjack(3)
    expect(state.you).toHaveLength(2)
    expect(handValue([1, 13])).toBe(21)
    const stood = standBlackjack({ ...state, you: [10, 7], dealer: [5, 5], deck: [10, 2, 3] })
    expect(handValue(stood.dealer)).toBeGreaterThanOrEqual(17)
  })

  it('builds a klondike foundation and a tableau stack', () => {
    const dealt = freshKlondike(1)
    expect(dealt.stock).toHaveLength(24)
    expect(dealt.tableau[6]).toHaveLength(7)
    const ace = toFoundation({ ...dealt, waste: [{ rank: 1, suit: 0, up: true }] }, { kind: 'waste' })
    expect(ace?.foundations[0]).toHaveLength(1)
    const king = toTableau(
      {
        ...dealt,
        waste: [{ rank: 13, suit: 3, up: true }],
        tableau: dealt.tableau.map((pile, index) => (index === 0 ? [] : pile)),
      },
      { kind: 'waste' },
      0,
    )
    expect(king?.tableau[0][0].rank).toBe(13)
    const source = {
      ...dealt,
      waste: [{ rank: 13, suit: 3 as const, up: true }],
      tableau: dealt.tableau.map((pile, index) => (index === 0 ? [] : pile)),
    }
    toTableau(source, { kind: 'waste' }, 0)
    expect(source.waste).toHaveLength(1)
    expect(source.tableau[0]).toHaveLength(0)
    expect(
      klondikeWon({
        ...dealt,
        foundations: [0, 1, 2, 3].map((suit) =>
          Array.from({ length: 13 }, (_, rank) => ({ rank: rank + 1, suit: suit as 0, up: true })),
        ),
      }),
    ).toBe(true)
  })

  it('pushes a box onto the goal', () => {
    const won = stepPush(freshPush(0), 0, 1)
    expect(won.won).toBe(true)
    expect(won.rows[1]).toContain('*')
  })

  it('builds a solvable sudoku grid and a marked guess', () => {
    const puzzle = freshSudoku(mulberry32(4))
    expect(sudokuSolved(puzzle.solution)).toBe(true)
    const holes = puzzle.puzzle.filter((cell) => cell === 0).length
    expect(holes).toBeGreaterThan(20)
    expect(holes).toBeLessThanOrEqual(46)
    expect(GUESS_WORDS.every((word) => word.length === 5)).toBe(true)
    expect(markGuess('LLAMA', 'ALLEY')).toEqual(['y', 'g', 'y', 'b', 'b'])
    expect(
      submitGuess(
        freshGuess(() => 0),
        GUESS_WORDS[0],
      ).guesses,
    ).toHaveLength(1)
  })

  it('claims a box, moves a tower disk, and scores a yacht', () => {
    let boxes = freshBoxes()
    boxes = playBoxes(boxes, 'h', 0)
    boxes = playBoxes(boxes, 'h', 4)
    boxes = playBoxes(boxes, 'v', 0)
    boxes = playBoxes(boxes, 'v', 1)
    expect(boxes.score[0] + boxes.score[1]).toBe(1)
    const moved = moveTower(freshTowers(5), 0)
    const placed = moveTower(moved, 1)
    expect(placed.pegs[1]).toEqual([1])
    expect(towersWon(freshTowers(5))).toBe(false)
    expect(yachtScore([5, 5, 5, 5, 5], 'yacht')).toBe(50)
    expect(yachtTotal({ '1': 3, '2': 6, '3': 9, '4': 12, '5': 15, '6': 18 })).toBe(63 + 35)
  })

  it('calls a higher card, jumps a peg, and walks an open maze passage', () => {
    const higher = freshHigher(1)
    const called = callHigher(higher, true)
    expect(called.current).not.toBe(higher.current)
    expect(cardLabel(0)).toBe('A♥')
    const pegs = playPeg(freshPegs(), 22)
    const landed = playPeg(pegs, 24)
    expect(landed.cells[24]).toBe('*')
    expect(landed.cells[23]).toBe('O')
    const maze = freshMaze(1)
    const dir = [MAZE_N, MAZE_E, MAZE_S, MAZE_W].find((bit) => maze.open[0] & bit)
    expect(moveMaze(maze, dir ?? MAZE_E).pr + moveMaze(maze, dir ?? MAZE_E).pc).toBeGreaterThan(0)
  })
})
