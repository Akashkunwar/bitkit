import { useEffect, useMemo, useRef, useState } from 'react'
import { Segmented } from '../../components/Segmented'
import { ToolLayout } from '../../components/ToolLayout'
import { triggerDownload } from '../../lib/download'
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
} from '../../lib/sims'

const SIM_MODES = [
  { value: 'life', label: 'Game of Life' },
  { value: 'particles', label: 'Particle life' },
  { value: 'sand', label: 'Falling sand' },
  { value: 'mandelbrot', label: 'Mandelbrot' },
  { value: 'riemann', label: 'Riemann visualizer' },
  { value: 'pendulum', label: 'Double pendulum' },
  { value: 'galton', label: 'Galton board' },
  { value: 'cradle', label: "Newton's cradle" },
  { value: 'harmonograph', label: 'Harmonograph' },
  { value: 'spirograph', label: 'Spirograph' },
  { value: 'gravity', label: 'Gravity simulator' },
  { value: 'solar', label: 'Solar system' },
  { value: 'projectile', label: 'Projectile motion' },
  { value: 'lab', label: 'Pendulum lab' },
  { value: 'chart', label: 'Birth chart' },
  { value: 'countries', label: 'Visited countries' },
  { value: 'timeline', label: 'Maps timeline' },
] as const

type SimMode = (typeof SIM_MODES)[number]['value']

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const PLANETS = [
  { name: 'Mercury', color: '#b7aea6', orbit: 36 },
  { name: 'Venus', color: '#e6c27a', orbit: 54 },
  { name: 'Earth', color: '#4c8dff', orbit: 72 },
  { name: 'Mars', color: '#d46a4c', orbit: 92 },
  { name: 'Jupiter', color: '#d9b48f', orbit: 118 },
  { name: 'Saturn', color: '#e3d2a4', orbit: 146 },
]

function CanvasCard({
  width,
  height,
  draw,
  filename,
  label,
}: {
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D) => void
  filename: string
  label: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = width
    canvas.height = height
    draw(ctx)
  }, [draw, height, width])

  return (
    <div className="stack">
      <div className="preview-frame">
        <canvas ref={canvasRef} width={width} height={height} aria-label={label} />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          canvasRef.current?.toBlob((blob) => {
            if (blob) triggerDownload(blob, filename)
          }, 'image/png')
        }}
      >
        Download PNG
      </button>
    </div>
  )
}

function lifeSeed(): number[][] {
  const grid = Array.from({ length: 28 }, () => Array<number>(28).fill(0))
  grid[8][14] = 1
  grid[9][14] = 1
  grid[10][14] = 1
  const glider = [
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1],
  ]
  glider.forEach((row, r) => {
    row.forEach((cell, c) => {
      grid[16 + r][6 + c] = cell
    })
  })
  return grid
}

function sandStart(): number[][] {
  return Array.from({ length: 16 }, (_, column) => {
    const cells = Array<number>(20).fill(0)
    const grains = 3 + (column % 4)
    for (let i = 0; i < grains; i += 1) cells[i] = 1
    return cells
  })
}

function gravitySeed() {
  return [
    { x: 0, y: 0, vx: 0, vy: 0 },
    { x: 1.6, y: 0.2, vx: 0, vy: 0.12 },
    { x: -1.4, y: -0.3, vx: 0.02, vy: -0.1 },
  ]
}

function LifeSim() {
  const [grid, setGrid] = useState(lifeSeed)
  const [generation, setGeneration] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setGrid((current) => stepLife(current))
      setGeneration((value) => value + 1)
    }, 140)
    return () => window.clearInterval(id)
  }, [playing])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const cell = 12
    ctx.fillStyle = '#14202b'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.fillStyle = '#7dcea0'
    grid.forEach((row, r) => {
      row.forEach((value, c) => {
        if (value) ctx.fillRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2)
      })
    })
  }

  return (
    <div className="stack">
      <p>Generation {generation}. A vertical blinker flips onto its side each step.</p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => setPlaying((value) => !value)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setGrid((current) => stepLife(current))
            setGeneration((value) => value + 1)
          }}
        >
          Step
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setGrid(lifeSeed())
            setGeneration(0)
          }}
        >
          Reset
        </button>
      </div>
      <CanvasCard width={336} height={336} draw={draw} filename="game-of-life.png" label="Game of Life" />
    </div>
  )
}

function ParticleSim() {
  const count = stepParticles(48)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 40)
    return () => window.clearInterval(id)
  }, [])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const w = ctx.canvas.width
    const h = ctx.canvas.height
    ctx.fillStyle = '#10141c'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < count; i += 1) {
      const arm = i % 2 === 0 ? 70 : 118
      const speed = i % 2 === 0 ? 0.03 : -0.021
      const angle = tick * speed + (i / count) * Math.PI * 2
      ctx.fillStyle = `hsl(${(i * 37) % 360} 70% 62%)`
      ctx.beginPath()
      ctx.arc(w / 2 + Math.cos(angle) * arm, h / 2 + Math.sin(angle) * arm * 0.72, 4.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return (
    <div className="stack">
      <p>Particles: {count}. The count is conserved.</p>
      <CanvasCard width={420} height={320} draw={draw} filename="particle-life.png" label="Particle life" />
    </div>
  )
}

function SandSim() {
  const [columns, setColumns] = useState(sandStart)
  const [playing, setPlaying] = useState(true)
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setColumns((current) => current.map((column) => stepSand(column, true)))
    }, 80)
    return () => window.clearInterval(id)
  }, [playing])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const cell = 16
    const hues = ['#e2b657', '#d9a441', '#c9842a', '#efd48a']
    ctx.fillStyle = '#1c2430'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    columns.forEach((column, x) => {
      column.forEach((grain, y) => {
        if (!grain) return
        ctx.fillStyle = hues[x % hues.length]
        ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2)
      })
    })
  }

  return (
    <div className="stack">
      <p>Each loose grain falls one cell. Grains at the top drop first.</p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => setPlaying((value) => !value)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setColumns((current) => current.map((column) => stepSand(column, true)))}
        >
          Step
        </button>
        <button type="button" className="btn" onClick={() => setColumns(sandStart())}>
          Reset
        </button>
      </div>
      <CanvasCard width={256} height={320} draw={draw} filename="falling-sand.png" label="Falling sand" />
    </div>
  )
}

function MandelbrotSim() {
  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    const image = ctx.createImageData(width, height)
    for (let py = 0; py < height; py += 1) {
      for (let px = 0; px < width; px += 1) {
        const x = -2.1 + (px / width) * 2.8
        const y = -1.2 + (py / height) * 2.4
        const escape = mandelbrotEscape(x, y)
        const offset = (py * width + px) * 4
        if (escape >= 20) {
          image.data[offset] = 7
          image.data[offset + 1] = 8
          image.data[offset + 2] = 16
        } else {
          image.data[offset] = 20 + escape * 10
          image.data[offset + 1] = 40 + escape * 8
          image.data[offset + 2] = 80 + escape * 6
        }
        image.data[offset + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
  }

  return (
    <div className="stack">
      <p>Dark pixels stay in the set. Brighter pixels escaped.</p>
      <CanvasCard width={280} height={200} draw={draw} filename="mandelbrot.png" label="Mandelbrot set" />
    </div>
  )
}

function RiemannSim() {
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

function DoublePendulumSim() {
  const [upper, setUpper] = useState({ theta: 1.1, omega: 0 })
  const [lower, setLower] = useState({ theta: -0.7, omega: 0 })
  useEffect(() => {
    const id = window.setInterval(() => {
      setUpper((state) => stepPendulum(state.theta, state.omega, 0.02))
      setLower((state) => stepPendulum(state.theta, state.omega, 0.02))
    }, 16)
    return () => window.clearInterval(id)
  }, [])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, width, height)
    const x0 = width / 2
    const y0 = 36
    const x1 = x0 + Math.sin(upper.theta) * 110
    const y1 = y0 + Math.cos(upper.theta) * 110
    const x2 = x1 + Math.sin(lower.theta) * 96
    const y2 = y1 + Math.cos(lower.theta) * 96
    ctx.strokeStyle = '#243044'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.fillStyle = '#c45b2d'
    for (const [x, y] of [
      [x1, y1],
      [x2, y2],
    ] as const) {
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return (
    <div className="stack">
      <p>
        Upper {upper.theta.toFixed(2)} rad, lower {lower.theta.toFixed(2)} rad. Each arm uses one pendulum step.
      </p>
      <CanvasCard width={420} height={320} draw={draw} filename="double-pendulum.png" label="Double pendulum" />
    </div>
  )
}

function GaltonSim() {
  const [bins, setBins] = useState<number[]>(() => Array<number>(11).fill(0))
  const total = bins.reduce((sum, count) => sum + count, 0)

  const drop = (times: number) => {
    setBins((current) => {
      let next = current
      for (let n = 0; n < times; n += 1) {
        let bin = 0
        for (let peg = 0; peg < current.length - 1; peg += 1) if (Math.random() < 0.5) bin += 1
        next = dropBall(next, bin)
      }
      return next
    })
  }

  return (
    <div className="stack">
      <p>
        {total} balls dropped across {bins.length} bins.
      </p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => drop(1)}>
          Drop one
        </button>
        <button type="button" className="btn" onClick={() => drop(20)}>
          Drop 20
        </button>
        <button type="button" className="btn" onClick={() => setBins(Array<number>(bins.length).fill(0))}>
          Reset
        </button>
      </div>
      <div className="table-wrap" style={{ maxHeight: 'none' }}>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Bin</th>
              <th className="num">Balls</th>
              <th>Pile</th>
            </tr>
          </thead>
          <tbody>
            {bins.map((count, index) => (
              <tr key={index}>
                <td>{index}</td>
                <td className="num">{count}</td>
                <td>
                  <div style={{ height: 14, width: count * 6, background: '#c45b2d' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CradleSim() {
  const balls = 5
  const [tick, setTick] = useState(0)
  const frame = cradleFrame(balls, tick)
  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 700)
    return () => window.clearInterval(id)
  }, [])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#243044'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(40, 40)
    ctx.lineTo(width - 40, 40)
    ctx.stroke()
    frame.forEach((lifted, index) => {
      const x = 70 + index * 70
      const y = lifted ? 78 : 150
      ctx.strokeStyle = '#8a8175'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 40)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.fillStyle = lifted ? '#c45b2d' : '#d9d3c7'
      ctx.beginPath()
      ctx.arc(x, y, 22, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#243044'
      ctx.stroke()
    })
  }

  return (
    <div className="stack">
      <p>The lifted ball switches between the two ends.</p>
      <CanvasCard width={420} height={240} draw={draw} filename="newtons-cradle.png" label="Newton's cradle" />
    </div>
  )
}

function CurveSim({ kind }: { kind: 'harmonograph' | 'spirograph' }) {
  const points = kind === 'harmonograph' ? harmonographPoints(900) : spirographPoints(900)
  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#243044'
    ctx.lineWidth = 1.25
    ctx.beginPath()
    const scale = kind === 'harmonograph' ? 130 : 42
    points.forEach((point, index) => {
      const x = width / 2 + point.x * scale
      const y = height / 2 + point.y * scale
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  return (
    <div className="stack">
      <p>{points.length} points.</p>
      <CanvasCard
        width={420}
        height={420}
        draw={draw}
        filename={kind === 'harmonograph' ? 'harmonograph.png' : 'spirograph.png'}
        label={kind === 'harmonograph' ? 'Harmonograph' : 'Spirograph'}
      />
    </div>
  )
}

function GravitySim() {
  const [bodies, setBodies] = useState(gravitySeed)
  useEffect(() => {
    const id = window.setInterval(() => {
      setBodies((current) => {
        const next = stepBodies(current)
        const lost = next.some((body) => !Number.isFinite(body.x) || Math.abs(body.x) > 12 || Math.abs(body.y) > 12)
        return lost ? gravitySeed() : next
      })
    }, 40)
    return () => window.clearInterval(id)
  }, [])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#10141c'
    ctx.fillRect(0, 0, width, height)
    const colors = ['#f4f1ea', '#7eb6ff', '#e2b657']
    bodies.forEach((body, index) => {
      ctx.fillStyle = colors[index % colors.length]
      ctx.beginPath()
      ctx.arc(width / 2 + body.x * 36, height / 2 + body.y * 36, index === 0 ? 11 : 7, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  return (
    <div className="stack">
      <p>{bodies.length} bodies. The step keeps every one of them.</p>
      <button type="button" className="btn" onClick={() => setBodies(gravitySeed())}>
        Reset
      </button>
      <CanvasCard width={420} height={420} draw={draw} filename="gravity.png" label="Gravity simulator" />
    </div>
  )
}

function SolarSim() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 40)
    return () => window.clearInterval(id)
  }, [])

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    const cx = width / 2
    const cy = height / 2
    ctx.fillStyle = '#10141c'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#e2b657'
    ctx.beginPath()
    ctx.arc(cx, cy, 12, 0, Math.PI * 2)
    ctx.fill()
    PLANETS.forEach((planet, index) => {
      const angle = planetAngle(index, tick)
      ctx.strokeStyle = 'rgba(244, 241, 234, 0.25)'
      ctx.beginPath()
      ctx.arc(cx, cy, planet.orbit, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = planet.color
      ctx.beginPath()
      ctx.arc(cx + Math.cos(angle) * planet.orbit, cy + Math.sin(angle) * planet.orbit, 6, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  return (
    <div className="stack">
      <div className="table-wrap" style={{ maxHeight: 'none' }}>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Planet</th>
              <th className="num">Angle (rad)</th>
            </tr>
          </thead>
          <tbody>
            {PLANETS.map((planet, index) => (
              <tr key={planet.name}>
                <td>{planet.name}</td>
                <td className="num">{planetAngle(index, tick).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CanvasCard width={420} height={420} draw={draw} filename="solar-system.png" label="Solar system" />
    </div>
  )
}

function ProjectileSim() {
  const [speed, setSpeed] = useState(10)
  const [degrees, setDegrees] = useState(45)
  const angle = (degrees * Math.PI) / 180
  const { range } = trajectory(speed, angle)

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, width, height)
    const ground = height - 32
    ctx.strokeStyle = '#8a8175'
    ctx.beginPath()
    ctx.moveTo(20, ground)
    ctx.lineTo(width - 20, ground)
    ctx.stroke()
    ctx.strokeStyle = '#c45b2d'
    ctx.lineWidth = 2
    ctx.beginPath()
    const span = Math.max(range, 0.001)
    const flight = span / (speed * Math.max(Math.cos(angle), 0.05))
    for (let i = 0; i <= 48; i += 1) {
      const t = (flight * i) / 48
      const x = speed * Math.cos(angle) * t
      const y = speed * Math.sin(angle) * t - 0.5 * 9.81 * t * t
      const px = 24 + (x / span) * (width - 48)
      const py = ground - (Math.max(y, 0) / Math.max(span * 0.3, 1)) * (height - 64)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }

  return (
    <div className="stack">
      <div className="row">
        <label className="field">
          <span>Speed · {speed} m/s</span>
          <input
            type="range"
            min={1}
            max={40}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Angle · {degrees}°</span>
          <input
            type="range"
            min={10}
            max={80}
            value={degrees}
            onChange={(event) => setDegrees(Number(event.target.value))}
          />
        </label>
      </div>
      <p>Range {range.toFixed(2)} m.</p>
      <CanvasCard width={640} height={280} draw={draw} filename="projectile.png" label="Projectile arc" />
    </div>
  )
}

function PendulumLab() {
  const [length, setLength] = useState(1)
  const [state, setState] = useState({ theta: 0.6, omega: 0 })
  useEffect(() => {
    const id = window.setInterval(() => setState((current) => stepPendulum(current.theta, current.omega, 0.02)), 16)
    return () => window.clearInterval(id)
  }, [])
  const seconds = period(length)

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f3ea'
    ctx.fillRect(0, 0, width, height)
    const x0 = width / 2
    const y0 = 24
    const arm = 50 + length * 36
    const x = x0 + Math.sin(state.theta) * arm
    const y = y0 + Math.cos(state.theta) * arm
    ctx.strokeStyle = '#243044'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.fillStyle = '#c45b2d'
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fill()
  }

  return (
    <div className="stack">
      <label className="field">
        <span>Length · {length.toFixed(2)} m</span>
        <input
          type="range"
          min={0.2}
          max={4}
          step={0.05}
          value={length}
          onChange={(event) => setLength(Number(event.target.value))}
        />
      </label>
      <p>Period {seconds.toFixed(3)} s for this length, using 9.81 m/s².</p>
      <CanvasCard width={420} height={280} draw={draw} filename="pendulum-lab.png" label="Pendulum" />
    </div>
  )
}

function BirthChart() {
  const [month, setMonth] = useState(3)
  const [day, setDay] = useState(21)
  const sign = sunSign(month, day)

  return (
    <div className="stack">
      <p>Sun sign only.</p>
      <p className="muted">No houses and no ephemeris. The sign comes from the calendar date.</p>
      <div className="row">
        <label className="field">
          <span>Month</span>
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Day</span>
          <input type="number" min={1} max={31} value={day} onChange={(event) => setDay(Number(event.target.value))} />
        </label>
      </div>
      <p>
        <strong>{sign}</strong>
      </p>
    </div>
  )
}

function CountriesSim() {
  const [selected, setSelected] = useState<string[]>([])

  return (
    <div className="stack">
      <p>This is a button list, not a geographic map.</p>
      <p className="muted">{selected.length ? selected.join(', ') : 'None selected yet.'}</p>
      <div className="row">
        {COUNTRIES.map((name) => {
          const on = selected.includes(name)
          return (
            <button
              key={name}
              type="button"
              className={on ? 'btn btn-primary' : 'btn'}
              aria-pressed={on}
              onClick={() => setSelected((current) => toggleCountry(current, name))}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimelineSim() {
  const [text, setText] = useState('[{"lat":1,"lng":2,"time":"t"}]')
  const parsed = useMemo(() => {
    try {
      return { points: parseTimeline(text), error: null as string | null }
    } catch (err) {
      return {
        points: [] as { lat: number; lng: number; time: string }[],
        error: err instanceof Error ? err.message : 'Invalid timeline.',
      }
    }
  }, [text])

  return (
    <div className="stack">
      <p>This does not fetch maps.</p>
      <label className="field">
        <span>Points as JSON</span>
        <textarea className="code-area" rows={6} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      {parsed.error ? <p className="status-bad">{parsed.error}</p> : null}
      {parsed.error ? null : (
        <div className="table-wrap" style={{ maxHeight: 'none' }}>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Time</th>
                <th className="num">Latitude</th>
                <th className="num">Longitude</th>
              </tr>
            </thead>
            <tbody>
              {parsed.points.length ? (
                parsed.points.map((point, index) => (
                  <tr key={`${point.time}-${index}`}>
                    <td>{point.time}</td>
                    <td className="num">{point.lat}</td>
                    <td className="num">{point.lng}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>No points in this timeline.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SimBody({ mode }: { mode: SimMode }) {
  switch (mode) {
    case 'life':
      return <LifeSim />
    case 'particles':
      return <ParticleSim />
    case 'sand':
      return <SandSim />
    case 'mandelbrot':
      return <MandelbrotSim />
    case 'riemann':
      return <RiemannSim />
    case 'pendulum':
      return <DoublePendulumSim />
    case 'galton':
      return <GaltonSim />
    case 'cradle':
      return <CradleSim />
    case 'harmonograph':
      return <CurveSim kind="harmonograph" />
    case 'spirograph':
      return <CurveSim kind="spirograph" />
    case 'gravity':
      return <GravitySim />
    case 'solar':
      return <SolarSim />
    case 'projectile':
      return <ProjectileSim />
    case 'lab':
      return <PendulumLab />
    case 'chart':
      return <BirthChart />
    case 'countries':
      return <CountriesSim />
    case 'timeline':
      return <TimelineSim />
    default: {
      const exhaustive: never = mode
      throw new Error(exhaustive)
    }
  }
}

export default function SimsTool() {
  const [mode, setMode] = useState<SimMode>('life')
  const options: { value: SimMode; label: string }[] = SIM_MODES.map((item) => ({
    value: item.value,
    label: item.label,
  }))

  return (
    <ToolLayout
      title="Simulations"
      lede="Local models for life, motion, orbits, and charts. Everything stays in the browser."
    >
      <Segmented label="Simulation" value={mode} options={options} onChange={setMode} />
      <SimBody mode={mode} />
    </ToolLayout>
  )
}
