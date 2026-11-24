import { describe, expect, it } from 'vitest'
import { clearLines, drop, emptyBoard, lockPiece, nudge, rotate, spawn } from '../lib/games/blocks'
import { freshBreakout, stepBreakout } from '../lib/games/breakout'
import { deck, resolvePair } from '../lib/games/memory'
import { adjacent, placeMines, reveal, emptyMask } from '../lib/games/mines'
import { freshPong, stepPong } from '../lib/games/pong'
import { moveGrid } from '../lib/games/slide'
import { opposite, placeFood, stepSnake } from '../lib/games/snake'
import { bestMove, winner } from '../lib/games/tictactoe'

describe('classic games', () => {
  it('grows the snake when it eats and stops on a wall', () => {
    const body = [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
    ]
    const eaten = stepSnake(body, 'right', { x: 3, y: 2 })
    expect(eaten.ate).toBe(true)
    expect(eaten.body).toHaveLength(3)
    expect(stepSnake([{ x: 0, y: 0 }], 'left', { x: 5, y: 5 }).dead).toBe(true)
    expect(opposite('up', 'down')).toBe(true)
    expect(placeFood(body, 2)).not.toEqual(body[0])
  })

  it('clears a full line of blocks and turns a piece', () => {
    const board = emptyBoard()
    board[19] = Array(10).fill(1)
    expect(clearLines(board).cleared).toBe(1)
    const piece = spawn(2)
    const turned = nudge(emptyBoard(), piece, 0, 0, rotate(piece.shape))
    expect(turned?.shape[0].length).toBe(piece.shape.length)
    const locked = lockPiece(emptyBoard(), { ...spawn(1), y: 18 })
    const fallen = drop(locked, spawn(0), 1)
    expect(fallen.board).toHaveLength(20)
    expect(fallen.spawned).toBe(false)
    const landed = drop(emptyBoard(), { ...spawn(1), y: 18 }, 4)
    expect(landed.spawned).toBe(true)
    expect(landed.piece.id).toBe(4)
  })

  it('merges a row of 2048 to the left', () => {
    const moved = moveGrid(
      [
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      'left',
    )
    expect(moved.grid[0][0]).toBe(4)
    expect(moved.score).toBe(4)
  })

  it('keeps the first mines click safe and opens a zero', () => {
    const mines = placeMines(9, 9, 10, 0, 0, 5)
    expect(mines[0][0]).toBe(false)
    expect(adjacent(mines, 0, 0)).toBe(0)
    const opened = reveal(mines, emptyMask(9, 9, false), 0, 0)
    expect(opened.hit).toBe(false)
    expect(opened.opened[0][0]).toBe(true)
  })

  it('bounces the pong ball off the player paddle', () => {
    const start = freshPong()
    start.ball = { x: 30, y: 150, vx: -4, vy: 0 }
    start.playerY = 120
    const next = stepPong(start, 0)
    expect(next.ball.vx).toBeGreaterThan(0)
  })

  it('removes a breakout brick the ball hits', () => {
    const start = freshBreakout()
    start.ball = { x: 30, y: 40, vx: 0, vy: -3 }
    const next = stepBreakout(start, 0)
    expect(next.bricks.some((alive) => !alive)).toBe(true)
    expect(next.score).toBe(10)
  })

  it('pairs memory cards and lets X take a winning square', () => {
    const cards = deck(2, 1)
    expect(cards).toHaveLength(4)
    const matched = resolvePair([0, 1, 0, 1], [0, 2], [false, false, false, false])
    expect(matched[0]).toBe(true)
    const board = ['X', 'X', null, 'O', 'O', null, null, null, null] as const
    expect(bestMove([...board], 'X')).toBe(2)
    expect(winner(['X', 'X', 'X', null, null, null, null, null, null])).toBe('X')
  })
})
