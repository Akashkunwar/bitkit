import { useState } from 'react'
import { Segmented } from '../../components/Segmented'
import { ToolLayout } from '../../components/ToolLayout'
import { BirthChart } from './BirthChart'
import { CountriesSim } from './CountriesSim'
import { CradleSim } from './CradleSim'
import { CurveSim } from './CurveSim'
import { DoublePendulumSim } from './DoublePendulumSim'
import { GaltonSim } from './GaltonSim'
import { GravitySim } from './GravitySim'
import { LifeSim } from './LifeSim'
import { MandelbrotSim } from './MandelbrotSim'
import { ParticleSim } from './ParticleSim'
import { PendulumLab } from './PendulumLab'
import { ProjectileSim } from './ProjectileSim'
import { RiemannSim } from './RiemannSim'
import { SandSim } from './SandSim'
import { SolarSim } from './SolarSim'
import { TimelineSim } from './TimelineSim'

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
