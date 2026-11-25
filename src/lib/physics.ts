import { formatQuantity, readNumber, type Formula } from './formula'

const C = 299_792_458
const R = 8.314462618
const G = 9.80665

export const PHYSICS_FORMULAS: Formula[] = [
  {
    id: 'ohm-v',
    label: 'Voltage (Ohm)',
    hint: 'V = I × R. Current in amperes, resistance in ohms.',
    fields: [
      { id: 'i', label: 'Current (A)', sample: '0.5' },
      { id: 'r', label: 'Resistance (Ω)', sample: '240' },
    ],
    run: (raw) => [
      {
        label: 'Voltage',
        value: `${formatQuantity(readNumber(raw.i, 'current') * readNumber(raw.r, 'resistance'))} V`,
      },
    ],
  },
  {
    id: 'ohm-i',
    label: 'Current (Ohm)',
    hint: 'I = V / R.',
    fields: [
      { id: 'v', label: 'Voltage (V)', sample: '120' },
      { id: 'r', label: 'Resistance (Ω)', sample: '240' },
    ],
    run: (raw) => {
      const r = readNumber(raw.r, 'resistance')
      if (r === 0) throw new Error('Resistance cannot be zero.')
      return [{ label: 'Current', value: `${formatQuantity(readNumber(raw.v, 'voltage') / r)} A` }]
    },
  },
  {
    id: 'ohm-r',
    label: 'Resistance (Ohm)',
    hint: 'R = V / I.',
    fields: [
      { id: 'v', label: 'Voltage (V)', sample: '120' },
      { id: 'i', label: 'Current (A)', sample: '0.5' },
    ],
    run: (raw) => {
      const i = readNumber(raw.i, 'current')
      if (i === 0) throw new Error('Current cannot be zero.')
      return [{ label: 'Resistance', value: `${formatQuantity(readNumber(raw.v, 'voltage') / i)} Ω` }]
    },
  },
  {
    id: 'power',
    label: 'Electrical power',
    hint: 'P = V × I, and the same power as I²R and V²/R.',
    fields: [
      { id: 'v', label: 'Voltage (V)', sample: '120' },
      { id: 'i', label: 'Current (A)', sample: '2' },
    ],
    run: (raw) => {
      const v = readNumber(raw.v, 'voltage')
      const i = readNumber(raw.i, 'current')
      const p = v * i
      return [
        { label: 'Power', value: `${formatQuantity(p)} W` },
        { label: 'Resistance', value: i === 0 ? '—' : `${formatQuantity(v / i)} Ω` },
      ]
    },
  },
  {
    id: 'wave',
    label: 'Wavelength',
    hint: 'λ = c / f for light in a vacuum. c is 299,792,458 m/s.',
    fields: [{ id: 'f', label: 'Frequency (Hz)', sample: '100000000' }],
    run: (raw) => {
      const f = readNumber(raw.f, 'frequency')
      if (f <= 0) throw new Error('Frequency must be above zero.')
      return [
        { label: 'Wavelength', value: `${formatQuantity(C / f)} m` },
        { label: 'Period', value: `${formatQuantity(1 / f)} s` },
      ]
    },
  },
  {
    id: 'freq',
    label: 'Frequency from wavelength',
    hint: 'f = c / λ for light in a vacuum.',
    fields: [{ id: 'l', label: 'Wavelength (m)', sample: '0.5' }],
    run: (raw) => {
      const l = readNumber(raw.l, 'wavelength')
      if (l <= 0) throw new Error('Wavelength must be above zero.')
      return [{ label: 'Frequency', value: `${formatQuantity(C / l)} Hz` }]
    },
  },
  {
    id: 'sound',
    label: 'Sound wave',
    hint: 'v = f × λ. Supply the speed of sound you want to use (about 343 m/s in air).',
    fields: [
      { id: 'v', label: 'Speed (m/s)', sample: '343' },
      { id: 'f', label: 'Frequency (Hz)', sample: '440' },
    ],
    run: (raw) => {
      const v = readNumber(raw.v, 'speed')
      const f = readNumber(raw.f, 'frequency')
      if (f === 0) throw new Error('Frequency cannot be zero.')
      return [{ label: 'Wavelength', value: `${formatQuantity(v / f)} m` }]
    },
  },
  {
    id: 'ke',
    label: 'Kinetic energy',
    hint: 'KE = ½mv². Mass in kilograms, speed in metres per second.',
    fields: [
      { id: 'm', label: 'Mass (kg)', sample: '2' },
      { id: 'v', label: 'Speed (m/s)', sample: '3' },
    ],
    run: (raw) => {
      const m = readNumber(raw.m, 'mass')
      const v = readNumber(raw.v, 'speed')
      return [{ label: 'Energy', value: `${formatQuantity(0.5 * m * v * v)} J` }]
    },
  },
  {
    id: 'pe',
    label: 'Potential energy',
    hint: 'PE = mgh, with g = 9.80665 m/s².',
    fields: [
      { id: 'm', label: 'Mass (kg)', sample: '2' },
      { id: 'h', label: 'Height (m)', sample: '5' },
    ],
    run: (raw) => [
      { label: 'Energy', value: `${formatQuantity(readNumber(raw.m, 'mass') * G * readNumber(raw.h, 'height'))} J` },
    ],
  },
  {
    id: 'force',
    label: 'Force',
    hint: 'F = ma. Mass in kilograms, acceleration in m/s².',
    fields: [
      { id: 'm', label: 'Mass (kg)', sample: '10' },
      { id: 'a', label: 'Acceleration (m/s²)', sample: '2' },
    ],
    run: (raw) => [
      { label: 'Force', value: `${formatQuantity(readNumber(raw.m, 'mass') * readNumber(raw.a, 'acceleration'))} N` },
    ],
  },
  {
    id: 'momentum',
    label: 'Momentum',
    hint: 'p = mv.',
    fields: [
      { id: 'm', label: 'Mass (kg)', sample: '10' },
      { id: 'v', label: 'Velocity (m/s)', sample: '4' },
    ],
    run: (raw) => [
      {
        label: 'Momentum',
        value: `${formatQuantity(readNumber(raw.m, 'mass') * readNumber(raw.v, 'velocity'))} kg·m/s`,
      },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    hint: 'W = F × d when force and displacement are in the same direction.',
    fields: [
      { id: 'f', label: 'Force (N)', sample: '20' },
      { id: 'd', label: 'Distance (m)', sample: '3' },
    ],
    run: (raw) => [
      { label: 'Work', value: `${formatQuantity(readNumber(raw.f, 'force') * readNumber(raw.d, 'distance'))} J` },
    ],
  },
  {
    id: 'pressure',
    label: 'Pressure',
    hint: 'P = F / A. Area in square metres.',
    fields: [
      { id: 'f', label: 'Force (N)', sample: '100' },
      { id: 'a', label: 'Area (m²)', sample: '0.5' },
    ],
    run: (raw) => {
      const a = readNumber(raw.a, 'area')
      if (a === 0) throw new Error('Area cannot be zero.')
      return [{ label: 'Pressure', value: `${formatQuantity(readNumber(raw.f, 'force') / a)} Pa` }]
    },
  },
  {
    id: 'density',
    label: 'Density',
    hint: 'ρ = m / V. Volume in cubic metres.',
    fields: [
      { id: 'm', label: 'Mass (kg)', sample: '2' },
      { id: 'v', label: 'Volume (m³)', sample: '0.001' },
    ],
    run: (raw) => {
      const v = readNumber(raw.v, 'volume')
      if (v === 0) throw new Error('Volume cannot be zero.')
      return [{ label: 'Density', value: `${formatQuantity(readNumber(raw.m, 'mass') / v)} kg/m³` }]
    },
  },
  {
    id: 'speed',
    label: 'Speed',
    hint: 'Average speed from distance and time.',
    fields: [
      { id: 'd', label: 'Distance (m)', sample: '100' },
      { id: 't', label: 'Time (s)', sample: '12' },
    ],
    run: (raw) => {
      const t = readNumber(raw.t, 'time')
      if (t === 0) throw new Error('Time cannot be zero.')
      const mps = readNumber(raw.d, 'distance') / t
      return [
        { label: 'Speed', value: `${formatQuantity(mps)} m/s` },
        { label: 'Speed', value: `${formatQuantity(mps * 3.6)} km/h` },
      ]
    },
  },
  {
    id: 'accel',
    label: 'Acceleration',
    hint: 'a = Δv / Δt.',
    fields: [
      { id: 'v', label: 'Change in speed (m/s)', sample: '20' },
      { id: 't', label: 'Time (s)', sample: '4' },
    ],
    run: (raw) => {
      const t = readNumber(raw.t, 'time')
      if (t === 0) throw new Error('Time cannot be zero.')
      return [{ label: 'Acceleration', value: `${formatQuantity(readNumber(raw.v, 'change in speed') / t)} m/s²` }]
    },
  },
  {
    id: 'gas',
    label: 'Ideal gas',
    hint: 'n = PV / RT. Pressure in pascals, volume in m³, temperature in kelvin. R = 8.314 J/mol·K.',
    fields: [
      { id: 'p', label: 'Pressure (Pa)', sample: '101325' },
      { id: 'v', label: 'Volume (m³)', sample: '0.0224' },
      { id: 't', label: 'Temperature (K)', sample: '273.15' },
    ],
    run: (raw) => {
      const t = readNumber(raw.t, 'temperature')
      if (t === 0) throw new Error('Temperature cannot be zero.')
      const n = (readNumber(raw.p, 'pressure') * readNumber(raw.v, 'volume')) / (R * t)
      return [{ label: 'Amount', value: `${formatQuantity(n, 6)} mol` }]
    },
  },
  {
    id: 'half',
    label: 'Half-life',
    hint: 'Amount left after elapsed time, in the same time unit as the half-life.',
    fields: [
      { id: 'start', label: 'Starting amount', sample: '100' },
      { id: 'half', label: 'Half-life', sample: '5' },
      { id: 'time', label: 'Elapsed', sample: '10' },
    ],
    run: (raw) => {
      const half = readNumber(raw.half, 'half-life')
      if (half <= 0) throw new Error('Half-life must be above zero.')
      const elapsed = readNumber(raw.time, 'elapsed time')
      const lives = elapsed / half
      return [
        { label: 'Remaining', value: formatQuantity(readNumber(raw.start, 'starting amount') * 0.5 ** lives) },
        { label: 'Half-lives', value: formatQuantity(lives) },
      ]
    },
  },
]
