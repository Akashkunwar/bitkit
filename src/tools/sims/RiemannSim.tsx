import { useMemo, useState } from 'react'
import { primesUpTo } from '../../lib/sims'
import { CanvasCard } from './CanvasCard'

export function RiemannSim() {
  const [limit, setLimit] = useState(80)
  const primes = useMemo(() => primesUpTo(limit), [limit])
  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#c45b2d'
    ctx.lineWidth = 2
    ctx.beginPath()
    const known = new Set(primes)
    let seen = 0
    for (let n = 0; n <= limit; n += 1) {
      if (known.has(n)) seen += 1
      const x = 28 + (n / Math.max(limit, 1)) * (width - 48)
      const y = height - 28 - (seen / Math.max(primes.length, 1)) * (height - 56)
      if (n === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  return (
    <div className="stack">
      <p>This plots primes and is not a full Riemann zeta continuation.</p>
      <label className="field">
        <span>Numbers through {limit}</span>
        <input
          type="range"
          min={10}
          max={200}
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value))}
        />
      </label>
      <p className="muted">
        {primes.length} primes: {primes.join(', ')}
      </p>
      <CanvasCard width={640} height={240} draw={draw} filename="primes.png" label="Prime counting plot" />
    </div>
  )
}
