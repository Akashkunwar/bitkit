import { useEffect, useState } from 'react'
import { freshPush, LEVELS, nextPush, stepPush, type Push } from '../../lib/games/push'
import { Arcade } from './kit'
import { isTypingTarget } from './loop'

const KEYS: Record<string, [number, number]> = {
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
}

export default function PushTool() {
  const [state, setState] = useState<Push>(freshPush)
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const step = KEYS[event.key]
      if (!step || isTypingTarget(event.target)) return
      event.preventDefault()
      setState((current) => stepPush(current, step[0], step[1]))
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [])
  return (
    <Arcade
      title="Sokoban"
      lede="Arrow keys push the boxes onto the dots. Walls stop you."
      status={
        state.won && state.level >= LEVELS.length - 1
          ? 'Pack finished'
          : state.won
            ? 'Level clear'
            : `Level ${state.level + 1}`
      }
      onRestart={() => setState(freshPush(0))}
    >
      <pre className="arcade-word">{state.rows.join('\n')}</pre>
      <div className="arcade-keys">
        <button type="button" className="btn" onClick={() => setState((current) => stepPush(current, -1, 0))}>
          Up
        </button>
        <button type="button" className="btn" onClick={() => setState((current) => stepPush(current, 0, -1))}>
          Left
        </button>
        <button type="button" className="btn" onClick={() => setState((current) => stepPush(current, 0, 1))}>
          Right
        </button>
        <button type="button" className="btn" onClick={() => setState((current) => stepPush(current, 1, 0))}>
          Down
        </button>
        {state.won && state.level < LEVELS.length - 1 && (
          <button type="button" className="btn" onClick={() => setState((current) => nextPush(current))}>
            Next
          </button>
        )}
      </div>
    </Arcade>
  )
}
