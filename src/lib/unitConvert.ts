/**
 * Unit conversion across physical quantities.
 *
 * Most units are a fixed factor of their category's base unit. Temperature
 * has offsets and fuel economy has inverses (L/100 km goes down as km/L goes
 * up), so a unit may instead supply its own to/from functions. Factors are
 * the exact definitions where one exists (inch = 25.4 mm, lb = 0.45359237 kg,
 * US gallon = 231 in³).
 */

export type Unit = {
  id: string
  label: string
  symbol: string
  /** Multiply by this to reach the base unit. */
  factor?: number
  toBase?: (value: number) => number
  fromBase?: (value: number) => number
  /** Search aliases: "gaj", "pound", "litre". */
  aliases?: string[]
}

export type UnitCategory = {
  id: string
  label: string
  base: string
  units: Unit[]
  /** Sensible defaults for the from / to pickers. */
  defaults: [string, string]
  note?: string
}

const f = (id: string, label: string, symbol: string, factor: number, aliases?: string[]): Unit => ({
  id,
  label,
  symbol,
  factor,
  aliases,
})

const INCH = 0.0254
const FOOT = 0.3048
const YARD = 0.9144
const MILE = 1609.344
const POUND = 0.45359237
const US_GALLON = 3.785411784
const UK_GALLON = 4.54609

export const CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    label: 'Length',
    base: 'm',
    defaults: ['cm', 'in'],
    units: [
      f('nm', 'Nanometre', 'nm', 1e-9),
      f('um', 'Micrometre', 'µm', 1e-6, ['micron']),
      f('mm', 'Millimetre', 'mm', 1e-3),
      f('cm', 'Centimetre', 'cm', 1e-2),
      f('m', 'Metre', 'm', 1, ['meter']),
      f('km', 'Kilometre', 'km', 1e3, ['kilometer']),
      f('in', 'Inch', 'in', INCH, ['inches', '"']),
      f('ft', 'Foot', 'ft', FOOT, ['feet']),
      f('yd', 'Yard', 'yd', YARD, ['gaj']),
      f('mi', 'Mile', 'mi', MILE, ['miles']),
      f('nmi', 'Nautical mile', 'nmi', 1852),
      f('mil', 'Thou (mil)', 'mil', INCH / 1000),
      f('au', 'Astronomical unit', 'au', 149_597_870_700),
      f('ly', 'Light-year', 'ly', 9_460_730_472_580_800),
    ],
  },
  {
    id: 'area',
    label: 'Area',
    base: 'm²',
    defaults: ['m2', 'ft2'],
    units: [
      f('mm2', 'Square millimetre', 'mm²', 1e-6),
      f('cm2', 'Square centimetre', 'cm²', 1e-4),
      f('m2', 'Square metre', 'm²', 1, ['sq m', 'sqm']),
      f('ha', 'Hectare', 'ha', 1e4),
      f('km2', 'Square kilometre', 'km²', 1e6),
      f('in2', 'Square inch', 'in²', INCH * INCH),
      f('ft2', 'Square foot', 'ft²', FOOT * FOOT, ['sq ft', 'sqft']),
      f('yd2', 'Square yard (gaj)', 'yd²', YARD * YARD, ['gaj', 'sq yd']),
      f('acre', 'Acre', 'ac', 4046.8564224),
      f('mi2', 'Square mile', 'mi²', MILE * MILE),
      f('cent', 'Cent', 'cent', 4046.8564224 / 100),
      f('guntha', 'Guntha', 'guntha', 4046.8564224 / 40),
    ],
    note: 'Bigha and other regional land units vary by state, so they are not listed.',
  },
  {
    id: 'volume',
    label: 'Volume',
    base: 'L',
    defaults: ['l', 'usgal'],
    units: [
      f('ml', 'Millilitre', 'mL', 1e-3, ['cc']),
      f('l', 'Litre', 'L', 1, ['liter']),
      f('m3', 'Cubic metre', 'm³', 1000),
      f('cm3', 'Cubic centimetre', 'cm³', 1e-3),
      f('in3', 'Cubic inch', 'in³', 0.016387064),
      f('ft3', 'Cubic foot', 'ft³', 28.316846592),
      f('tsp', 'Teaspoon (US)', 'tsp', US_GALLON / 768),
      f('tbsp', 'Tablespoon (US)', 'tbsp', US_GALLON / 256),
      f('floz', 'Fluid ounce (US)', 'fl oz', US_GALLON / 128),
      f('cup', 'Cup (US)', 'cup', US_GALLON / 16),
      f('pt', 'Pint (US)', 'pt', US_GALLON / 8),
      f('qt', 'Quart (US)', 'qt', US_GALLON / 4),
      f('usgal', 'Gallon (US)', 'gal', US_GALLON),
      f('ukgal', 'Gallon (UK)', 'gal UK', UK_GALLON, ['imperial gallon']),
      f('ukpt', 'Pint (UK)', 'pt UK', UK_GALLON / 8),
    ],
  },
  {
    id: 'mass',
    label: 'Weight',
    base: 'kg',
    defaults: ['kg', 'lb'],
    units: [
      f('mg', 'Milligram', 'mg', 1e-6),
      f('g', 'Gram', 'g', 1e-3, ['gm']),
      f('kg', 'Kilogram', 'kg', 1, ['kilo']),
      f('t', 'Tonne', 't', 1000, ['metric ton']),
      f('q', 'Quintal', 'q', 100),
      f('oz', 'Ounce', 'oz', POUND / 16),
      f('lb', 'Pound', 'lb', POUND, ['lbs']),
      f('st', 'Stone', 'st', POUND * 14),
      f('ton', 'Short ton (US)', 'ton', POUND * 2000),
      f('lt', 'Long ton (UK)', 'LT', POUND * 2240),
      f('ct', 'Carat', 'ct', 2e-4),
      f('tola', 'Tola', 'tola', 0.0116638038),
    ],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    base: '°C',
    defaults: ['c', 'f'],
    units: [
      { id: 'c', label: 'Celsius', symbol: '°C', toBase: (v) => v, fromBase: (v) => v, aliases: ['centigrade'] },
      {
        id: 'f',
        label: 'Fahrenheit',
        symbol: '°F',
        toBase: (v) => ((v - 32) * 5) / 9,
        fromBase: (v) => (v * 9) / 5 + 32,
      },
      { id: 'k', label: 'Kelvin', symbol: 'K', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
      {
        id: 'r',
        label: 'Rankine',
        symbol: '°R',
        toBase: (v) => ((v - 491.67) * 5) / 9,
        fromBase: (v) => ((v + 273.15) * 9) / 5,
      },
    ],
  },
  {
    id: 'speed',
    label: 'Speed',
    base: 'm/s',
    defaults: ['kmh', 'mph'],
    units: [
      f('ms', 'Metres per second', 'm/s', 1),
      f('kmh', 'Kilometres per hour', 'km/h', 1000 / 3600, ['kph']),
      f('mph', 'Miles per hour', 'mph', MILE / 3600),
      f('kn', 'Knot', 'kn', 1852 / 3600),
      f('fts', 'Feet per second', 'ft/s', FOOT),
      f('mach', 'Mach (sea level, 15 °C)', 'Ma', 340.29),
      f('c', 'Speed of light', 'c', 299_792_458),
    ],
  },
  {
    id: 'time',
    label: 'Time',
    base: 's',
    defaults: ['h', 'min'],
    units: [
      f('ns', 'Nanosecond', 'ns', 1e-9),
      f('us', 'Microsecond', 'µs', 1e-6),
      f('ms', 'Millisecond', 'ms', 1e-3),
      f('s', 'Second', 's', 1, ['sec']),
      f('min', 'Minute', 'min', 60),
      f('h', 'Hour', 'h', 3600, ['hr']),
      f('d', 'Day', 'd', 86400),
      f('wk', 'Week', 'wk', 604800),
      f('mo', 'Month (average)', 'mo', 2_629_746),
      f('yr', 'Year (365.25 d)', 'yr', 31_557_600),
      f('dec', 'Decade', 'dec', 315_576_000),
      f('cen', 'Century', 'c.', 3_155_760_000),
    ],
  },
  {
    id: 'data',
    label: 'Data size',
    base: 'B',
    defaults: ['gb', 'mb'],
    units: [
      f('bit', 'Bit', 'bit', 1 / 8),
      f('b', 'Byte', 'B', 1),
      f('kb', 'Kilobyte', 'KB', 1e3),
      f('mb', 'Megabyte', 'MB', 1e6),
      f('gb', 'Gigabyte', 'GB', 1e9),
      f('tb', 'Terabyte', 'TB', 1e12),
      f('pb', 'Petabyte', 'PB', 1e15),
      f('kib', 'Kibibyte', 'KiB', 1024),
      f('mib', 'Mebibyte', 'MiB', 1024 ** 2),
      f('gib', 'Gibibyte', 'GiB', 1024 ** 3),
      f('tib', 'Tebibyte', 'TiB', 1024 ** 4),
    ],
    note: 'KB, MB, GB are powers of 1000; KiB, MiB, GiB are powers of 1024 — why a “1 TB” drive shows 931 GiB.',
  },
  {
    id: 'datarate',
    label: 'Data speed',
    base: 'bit/s',
    defaults: ['mbps', 'mbs'],
    units: [
      f('bps', 'Bits per second', 'bit/s', 1),
      f('kbps', 'Kilobits per second', 'kbit/s', 1e3),
      f('mbps', 'Megabits per second', 'Mbit/s', 1e6, ['mbps']),
      f('gbps', 'Gigabits per second', 'Gbit/s', 1e9),
      f('bs', 'Bytes per second', 'B/s', 8),
      f('kbs', 'Kilobytes per second', 'KB/s', 8e3),
      f('mbs', 'Megabytes per second', 'MB/s', 8e6),
      f('gbs', 'Gigabytes per second', 'GB/s', 8e9),
    ],
    note: 'Internet plans are sold in megabits; downloads show megabytes. 100 Mbit/s is 12.5 MB/s.',
  },
  {
    id: 'pressure',
    label: 'Pressure',
    base: 'Pa',
    defaults: ['bar', 'psi'],
    units: [
      f('pa', 'Pascal', 'Pa', 1),
      f('hpa', 'Hectopascal', 'hPa', 100),
      f('kpa', 'Kilopascal', 'kPa', 1e3),
      f('mpa', 'Megapascal', 'MPa', 1e6),
      f('bar', 'Bar', 'bar', 1e5),
      f('mbar', 'Millibar', 'mbar', 100),
      f('atm', 'Atmosphere', 'atm', 101_325),
      f('psi', 'Pounds per square inch', 'psi', 6894.757293168),
      f('mmhg', 'Millimetre of mercury', 'mmHg', 133.322387415),
      f('inhg', 'Inch of mercury', 'inHg', 3386.389),
      f('torr', 'Torr', 'Torr', 101_325 / 760),
    ],
  },
  {
    id: 'energy',
    label: 'Energy',
    base: 'J',
    defaults: ['kcal', 'kj'],
    units: [
      f('j', 'Joule', 'J', 1),
      f('kj', 'Kilojoule', 'kJ', 1e3),
      f('mj', 'Megajoule', 'MJ', 1e6),
      f('cal', 'Calorie', 'cal', 4.184),
      f('kcal', 'Kilocalorie (food Calorie)', 'kcal', 4184, ['calories']),
      f('wh', 'Watt-hour', 'Wh', 3600),
      f('kwh', 'Kilowatt-hour (unit)', 'kWh', 3.6e6, ['unit', 'electricity']),
      f('btu', 'British thermal unit', 'BTU', 1055.05585262),
      f('ev', 'Electronvolt', 'eV', 1.602176634e-19),
      f('ftlb', 'Foot-pound', 'ft·lbf', 1.3558179483314),
    ],
  },
  {
    id: 'power',
    label: 'Power',
    base: 'W',
    defaults: ['kw', 'hp'],
    units: [
      f('w', 'Watt', 'W', 1),
      f('kw', 'Kilowatt', 'kW', 1e3),
      f('mw', 'Megawatt', 'MW', 1e6),
      f('hp', 'Horsepower (mechanical)', 'hp', 745.69987158227),
      f('ps', 'Metric horsepower (PS)', 'PS', 735.49875),
      f('btuh', 'BTU per hour', 'BTU/h', 0.29307107017),
      f('ton-ac', 'Ton of refrigeration (AC ton)', 'TR', 3516.8528420667, ['ac']),
    ],
  },
  {
    id: 'angle',
    label: 'Angle',
    base: 'rad',
    defaults: ['deg', 'rad'],
    units: [
      f('deg', 'Degree', '°', Math.PI / 180),
      f('rad', 'Radian', 'rad', 1),
      f('grad', 'Gradian', 'gon', Math.PI / 200),
      f('arcmin', 'Arcminute', '′', Math.PI / 10800),
      f('arcsec', 'Arcsecond', '″', Math.PI / 648000),
      f('turn', 'Turn', 'turn', Math.PI * 2),
    ],
  },
  {
    id: 'frequency',
    label: 'Frequency',
    base: 'Hz',
    defaults: ['rpm', 'hz'],
    units: [
      f('hz', 'Hertz', 'Hz', 1),
      f('khz', 'Kilohertz', 'kHz', 1e3),
      f('mhz', 'Megahertz', 'MHz', 1e6),
      f('ghz', 'Gigahertz', 'GHz', 1e9),
      f('rpm', 'Revolutions per minute', 'rpm', 1 / 60),
    ],
  },
  {
    id: 'force',
    label: 'Force',
    base: 'N',
    defaults: ['n', 'kgf'],
    units: [
      f('n', 'Newton', 'N', 1),
      f('kn', 'Kilonewton', 'kN', 1e3),
      f('dyn', 'Dyne', 'dyn', 1e-5),
      f('kgf', 'Kilogram-force', 'kgf', 9.80665),
      f('lbf', 'Pound-force', 'lbf', 4.4482216152605),
    ],
  },
  {
    id: 'fuel',
    label: 'Fuel economy',
    base: 'km/L',
    defaults: ['kml', 'l100'],
    units: [
      {
        id: 'kml',
        label: 'Kilometres per litre',
        symbol: 'km/L',
        toBase: (v) => v,
        fromBase: (v) => v,
        aliases: ['mileage'],
      },
      {
        id: 'l100',
        label: 'Litres per 100 km',
        symbol: 'L/100 km',
        toBase: (v) => 100 / v,
        fromBase: (v) => 100 / v,
      },
      {
        id: 'mpgus',
        label: 'Miles per gallon (US)',
        symbol: 'mpg',
        toBase: (v) => (v * MILE) / 1000 / US_GALLON,
        fromBase: (v) => (v * 1000 * US_GALLON) / MILE,
      },
      {
        id: 'mpguk',
        label: 'Miles per gallon (UK)',
        symbol: 'mpg UK',
        toBase: (v) => (v * MILE) / 1000 / UK_GALLON,
        fromBase: (v) => (v * 1000 * UK_GALLON) / MILE,
      },
    ],
    note: 'L/100 km is the inverse of km/L: lower is better.',
  },
]

export function getCategory(id: string): UnitCategory {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
}

export function getUnit(category: UnitCategory, id: string): Unit {
  const unit = category.units.find((u) => u.id === id)
  if (!unit) throw new Error(`Unknown unit “${id}” in ${category.label}.`)
  return unit
}

function toBase(unit: Unit, value: number): number {
  if (unit.toBase) return unit.toBase(value)
  return value * (unit.factor ?? 1)
}

function fromBase(unit: Unit, value: number): number {
  if (unit.fromBase) return unit.fromBase(value)
  return value / (unit.factor ?? 1)
}

export function convertUnit(categoryId: string, value: number, fromId: string, toId: string): number {
  const category = getCategory(categoryId)
  if (fromId === toId) return value
  return fromBase(getUnit(category, toId), toBase(getUnit(category, fromId), value))
}

/** Rounds to `digits` significant figures and drops trailing zeros. */
export function formatSig(value: number, digits = 8): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e15 || abs < 1e-6) {
    const [m, e] = value.toExponential(digits - 1).split('e')
    return `${Number(m)} × 10^${Number(e)}`
  }
  const rounded = Number(value.toPrecision(digits))
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 12, useGrouping: true })
}

export type UnitMatch = { category: UnitCategory; unit: Unit }

/** Finds units by name, symbol, or alias — "psi", "gaj", "pound". */
export function searchUnits(query: string): UnitMatch[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: UnitMatch[] = []
  for (const category of CATEGORIES) {
    for (const unit of category.units) {
      const hay = [unit.label, unit.symbol, unit.id, ...(unit.aliases ?? [])].map((s) => s.toLowerCase())
      if (hay.some((s) => s === q) || hay.some((s) => s.includes(q))) out.push({ category, unit })
    }
  }
  // Exact symbol or id matches first.
  return out.sort((a, b) => {
    const exact = (m: UnitMatch) => (m.unit.symbol.toLowerCase() === q || m.unit.id === q ? 0 : 1)
    return exact(a) - exact(b)
  })
}
