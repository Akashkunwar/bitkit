import { useEffect, useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { deck, resolvePair } from '../../lib/games/memory'

const FACES = ['★', '●', '▲', '◆', '✚', '◐', '✿', '☂']
const NAMES = ['star', 'circle', 'triangle', 'diamond', 'plus', 'half', 'flower', 'umbrella']

export default function MemoryTool() {
  const [seed, setSeed] = useState(4)
  const cards = useMemo(() => deck(8, seed), [seed])
  const [up, setUp] = useState<number[]>([])
  const [matched, setMatched] = useState<boolean[]>(() => Array(16).fill(false))

  useEffect(() => {
    if (up.length < 2) return
    const timer = window.setTimeout(() => {
      setMatched((current) => resolvePair(cards, [up[0], up[1]], current))
      setUp([])
    }, 700)
    return () => window.clearTimeout(timer)
  }, [up, cards])

  const won = matched.every(Boolean)

  return (
    <ToolLayout title="Memory" lede="Turn two cards. Matching faces stay up.">
      <div className="arcade">
        <div className="arcade-top">
          <strong>{won ? 'Paired' : `${matched.filter(Boolean).length / 2} / 8`}</strong>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSeed((value) => value + 1)
              setUp([])
              setMatched(Array(16).fill(false))
            }}
          >
            Restart
          </button>
        </div>
        <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {cards.map((face, index) => {
            const shown = matched[index] || up.includes(index)
            const row = Math.floor(index / 4) + 1
            const column = (index % 4) + 1
            return (
              <button
                key={`${seed}-${index}`}
                type="button"
                className="arcade-cell"
                aria-label={
                  shown ? `Row ${row}, column ${column}, ${NAMES[face]}` : `Row ${row}, column ${column}, face down`
                }
                onClick={() => {
                  if (shown || up.length >= 2) return
                  setUp((current) => [...current, index])
                }}
              >
                {shown ? FACES[face] : ''}
              </button>
            )
          })}
        </div>
      </div>
    </ToolLayout>
  )
}
