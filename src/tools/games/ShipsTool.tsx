import { useState } from 'react'
import { freshShips, shootThem, type Ships } from '../../lib/games/ships'
import { Arcade } from './kit'

function cellName(side: string, index: number, shot: number, show: boolean, cell: number) {
  const row = Math.floor(index / 8) + 1
  const column = (index % 8) + 1
  const kind = shot === 2 ? 'hit' : shot === 1 ? 'miss' : show && cell ? 'ship' : 'unshot'
  return `${side}, row ${row}, column ${column}, ${kind}`
}

function Grid({
  side,
  cells,
  shots,
  hidden,
  onPick,
}: {
  side: string
  cells: number[]
  shots: number[]
  hidden: boolean
  onPick?: (index: number) => void
}) {
  return (
    <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(8, 1fr)', maxWidth: 280 }}>
      {cells.map((cell, index) => {
        const shot = shots[index]
        const show = !hidden || shot === 2
        const label = shot === 2 ? '✕' : shot === 1 ? '·' : show && cell ? '▣' : ''
        return (
          <button
            key={index}
            type="button"
            className="arcade-cell"
            aria-label={cellName(side, index, shot, show, cell)}
            onClick={() => onPick?.(index)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default function ShipsTool() {
  const [game, setGame] = useState<Ships>(() => freshShips(4))
  const [seed, setSeed] = useState(4)
  const status = game.over === 1 ? 'Fleet sunk' : game.over === 2 ? 'Your fleet is gone' : 'Fire on their grid'
  return (
    <Arcade
      title="Ships"
      lede="Your fleet is on the left. Fire on the right. A cross is a hit, a dot is open water. They shoot back."
      status={status}
      onRestart={() => {
        const next = seed + 1
        setSeed(next)
        setGame(freshShips(next))
      }}
    >
      <div className="arcade-boards">
        <div>
          <p>Yours</p>
          <Grid side="Yours" cells={game.you} shots={game.theirShots} hidden={false} />
        </div>
        <div>
          <p>Theirs</p>
          <Grid
            side="Theirs"
            cells={game.them}
            shots={game.yourShots}
            hidden
            onPick={(index) => setGame((current) => shootThem(current, index))}
          />
        </div>
      </div>
    </Arcade>
  )
}
