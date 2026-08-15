export type Unit = { id: string; label: string; toBase: number }

export type Family = {
  id: string
  label: string
  units: Unit[]
}

export const FAMILIES: Family[] = [
  {
    id: 'length',
    label: 'Length',
    units: [
      { id: 'mm', label: 'mm', toBase: 0.001 },
      { id: 'cm', label: 'cm', toBase: 0.01 },
      { id: 'm', label: 'm', toBase: 1 },
      { id: 'km', label: 'km', toBase: 1000 },
      { id: 'in', label: 'in', toBase: 0.0254 },
      { id: 'ft', label: 'ft', toBase: 0.3048 },
      { id: 'yd', label: 'yd', toBase: 0.9144 },
      { id: 'mi', label: 'mi', toBase: 1609.344 },
    ],
  },
  {
    id: 'mass',
    label: 'Mass',
    units: [
      { id: 'g', label: 'g', toBase: 1 },
      { id: 'kg', label: 'kg', toBase: 1000 },
      { id: 'lb', label: 'lb', toBase: 453.59237 },
      { id: 'oz', label: 'oz', toBase: 28.349523125 },
    ],
  },
  {
    id: 'temp',
    label: 'Temperature',
    units: [
      { id: 'c', label: '°C', toBase: 1 },
      { id: 'f', label: '°F', toBase: 1 },
      { id: 'k', label: 'K', toBase: 1 },
    ],
  },
  {
    id: 'type',
    label: 'Type (px / rem)',
    units: [
      { id: 'px', label: 'px', toBase: 1 },
      { id: 'rem', label: 'rem', toBase: 16 },
    ],
  },
]

export function convertLinear(value: number, from: Unit, to: Unit): number {
  return (value * from.toBase) / to.toBase
}

export function convertTemp(value: number, from: string, to: string): number {
  let c = value
  if (from === 'f') c = (value - 32) * (5 / 9)
  if (from === 'k') c = value - 273.15
  if (to === 'c') return c
  if (to === 'f') return c * (9 / 5) + 32
  if (to === 'k') return c + 273.15
  return c
}

export function convert(familyId: string, value: number, fromId: string, toId: string, remRoot = 16): number {
  if (familyId === 'temp') return convertTemp(value, fromId, toId)
  const family = FAMILIES.find((f) => f.id === familyId)
  if (!family) throw new Error('Unknown unit family.')
  const from = family.units.find((u) => u.id === fromId)
  const to = family.units.find((u) => u.id === toId)
  if (!from || !to) throw new Error('Unknown unit.')
  if (familyId === 'type') {
    const fromBase = fromId === 'rem' ? remRoot : 1
    const toBase = toId === 'rem' ? remRoot : 1
    return (value * fromBase) / toBase
  }
  return convertLinear(value, from, to)
}

export function percentOf(percent: number, of: number): number {
  return (percent / 100) * of
}

export function whatPercent(part: number, whole: number): number {
  if (whole === 0) throw new Error('Cannot divide by zero.')
  return (part / whole) * 100
}

export function percentChange(from: number, to: number): number {
  if (from === 0) throw new Error('Cannot divide by zero.')
  return ((to - from) / from) * 100
}

export function addTax(amount: number, rate: number): { tax: number; total: number } {
  const tax = (amount * rate) / 100
  return { tax, total: amount + tax }
}

export function splitBill(total: number, people: number, tipPercent: number): { tip: number; grand: number; each: number } {
  if (people < 1) throw new Error('Need at least one person.')
  const tip = (total * tipPercent) / 100
  const grand = total + tip
  return { tip, grand, each: grand / people }
}

export function fluidClamp(minPx: number, maxPx: number, minVw = 360, maxVw = 1240, root = 16): string {
  if (maxVw === minVw) throw new Error('Viewport range cannot be zero.')
  const slope = (maxPx - minPx) / (maxVw - minVw)
  const intercept = minPx - slope * minVw
  const vw = (slope * 100).toFixed(4)
  const rem = (intercept / root).toFixed(4)
  const min = (minPx / root).toFixed(4)
  const max = (maxPx / root).toFixed(4)
  return `clamp(${min}rem, ${rem}rem + ${vw}vw, ${max}rem)`
}
