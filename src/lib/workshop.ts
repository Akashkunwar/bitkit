import { simpleInterest } from './finance'
import { formatQuantity, readNumber, type Formula } from './formula'

/** Grams in one US cup. Packed and sifted ingredients vary; these are common kitchen averages. */
export const CUP_GRAMS: Record<string, number> = {
  water: 237,
  milk: 245,
  flour: 120,
  sugar: 200,
  'brown sugar': 220,
  butter: 227,
  honey: 340,
  oil: 218,
  rice: 185,
  oats: 90,
  cocoa: 85,
  salt: 273,
}

export function cupToGrams(ingredient: string, cups: number): number {
  const key = ingredient.trim().toLowerCase()
  const density = CUP_GRAMS[key]
  if (density === undefined) {
    throw new Error(`Known ingredients: ${Object.keys(CUP_GRAMS).join(', ')}.`)
  }
  if (cups < 0) throw new Error('Cups cannot be negative.')
  return density * cups
}

function monthlyPayment(goal: number, annualPct: number, years: number): number {
  if (goal < 0) throw new Error('The goal cannot be negative.')
  if (years <= 0) throw new Error('Years must be above zero.')
  const months = Math.round(years * 12)
  const i = annualPct / 12 / 100
  if (i === 0) return goal / months
  return (goal * i) / ((1 + i) ** months - 1)
}

export const WORKSHOP_FORMULAS: Formula[] = [
  {
    id: 'tip',
    label: 'Tip and split',
    hint: 'Tip on the bill, then the total divided by the number of people.',
    fields: [
      { id: 'bill', label: 'Bill', sample: '86' },
      { id: 'pct', label: 'Tip %', sample: '15' },
      { id: 'people', label: 'People', sample: '2' },
    ],
    run: (raw) => {
      const bill = readNumber(raw.bill, 'bill')
      const pct = readNumber(raw.pct, 'tip')
      const people = readNumber(raw.people, 'people')
      if (bill < 0) throw new Error('The bill cannot be negative.')
      if (people <= 0) throw new Error('People must be above zero.')
      const tip = bill * (pct / 100)
      const total = bill + tip
      return [
        { label: 'Tip', value: formatQuantity(tip, 2) },
        { label: 'Total', value: formatQuantity(total, 2) },
        { label: 'Each', value: formatQuantity(total / people, 2) },
      ]
    },
  },
  {
    id: 'unit',
    label: 'Price per unit',
    hint: 'Price divided by quantity. Useful for packs, weight, and length.',
    fields: [
      { id: 'price', label: 'Price', sample: '3.49' },
      { id: 'qty', label: 'Quantity', sample: '750' },
      { id: 'unit', label: 'Unit name', sample: 'g' },
    ],
    run: (raw) => {
      const qty = readNumber(raw.qty, 'quantity')
      if (qty === 0) throw new Error('Quantity cannot be zero.')
      const each = readNumber(raw.price, 'price') / qty
      const unit = (raw.unit ?? '').trim() || 'unit'
      return [{ label: 'Each', value: `${formatQuantity(each, 4)} / ${unit}` }]
    },
  },
  {
    id: 'margin',
    label: 'Margin and markup',
    hint: 'Margin is profit over the selling price. Markup is profit over the cost.',
    fields: [
      { id: 'cost', label: 'Cost', sample: '40' },
      { id: 'price', label: 'Price', sample: '65' },
    ],
    run: (raw) => {
      const cost = readNumber(raw.cost, 'cost')
      const price = readNumber(raw.price, 'price')
      if (price === 0) throw new Error('Price cannot be zero.')
      if (cost === 0) throw new Error('Cost cannot be zero when computing markup.')
      const profit = price - cost
      return [
        { label: 'Profit', value: formatQuantity(profit, 2) },
        { label: 'Margin', value: `${formatQuantity((profit / price) * 100, 2)}%` },
        { label: 'Markup', value: `${formatQuantity((profit / cost) * 100, 2)}%` },
      ]
    },
  },
  {
    id: 'roi',
    label: 'Return on investment',
    hint: 'ROI = (end − start) / start.',
    fields: [
      { id: 'start', label: 'Start', sample: '1000' },
      { id: 'end', label: 'End', sample: '1250' },
    ],
    run: (raw) => {
      const start = readNumber(raw.start, 'start')
      const end = readNumber(raw.end, 'end')
      if (start === 0) throw new Error('Start cannot be zero.')
      return [
        { label: 'Gain', value: formatQuantity(end - start, 2) },
        { label: 'ROI', value: `${formatQuantity(((end - start) / start) * 100, 2)}%` },
      ]
    },
  },
  {
    id: 'simple',
    label: 'Simple interest',
    hint: 'Interest = principal × rate × years. The rate is an annual percent.',
    fields: [
      { id: 'p', label: 'Principal', sample: '10000' },
      { id: 'r', label: 'Annual rate %', sample: '6' },
      { id: 't', label: 'Years', sample: '3' },
    ],
    run: (raw) => {
      const p = readNumber(raw.p, 'principal')
      const interest = simpleInterest(p, readNumber(raw.r, 'rate'), readNumber(raw.t, 'years'))
      return [
        { label: 'Interest', value: formatQuantity(interest, 2) },
        { label: 'Amount', value: formatQuantity(p + interest, 2) },
      ]
    },
  },
  {
    id: 'rule72',
    label: 'Rule of 72',
    hint: 'A quick estimate of how long a compounding amount takes to double.',
    fields: [{ id: 'rate', label: 'Annual rate %', sample: '8' }],
    run: (raw) => {
      const rate = readNumber(raw.rate, 'rate')
      if (rate <= 0) throw new Error('Rate must be above zero.')
      return [{ label: 'Years to double', value: formatQuantity(72 / rate, 2) }]
    },
  },
  {
    id: 'save',
    label: 'Savings goal',
    hint: 'Monthly deposit, at month end, to reach a goal. Rate is the annual percent, compounded monthly.',
    fields: [
      { id: 'goal', label: 'Goal', sample: '100000' },
      { id: 'rate', label: 'Annual rate %', sample: '7' },
      { id: 'years', label: 'Years', sample: '5' },
    ],
    run: (raw) => {
      const payment = monthlyPayment(
        readNumber(raw.goal, 'goal'),
        readNumber(raw.rate, 'rate'),
        readNumber(raw.years, 'years'),
      )
      return [{ label: 'Each month', value: formatQuantity(payment, 2) }]
    },
  },
  {
    id: 'inflation',
    label: 'Inflation',
    hint: 'What today’s amount costs after inflation, and what a future amount is worth today.',
    fields: [
      { id: 'amount', label: 'Amount', sample: '100' },
      { id: 'rate', label: 'Annual inflation %', sample: '4' },
      { id: 'years', label: 'Years', sample: '10' },
    ],
    run: (raw) => {
      const amount = readNumber(raw.amount, 'amount')
      const years = readNumber(raw.years, 'years')
      const ratePct = readNumber(raw.rate, 'inflation')
      if (ratePct <= -100) throw new Error('Inflation must be above -100%.')
      const factor = (1 + ratePct / 100) ** years
      if (!Number.isFinite(factor) || factor === 0) throw new Error('Inflation must be above -100%.')
      return [
        { label: 'Future cost', value: formatQuantity(amount * factor, 2) },
        { label: 'Present value', value: formatQuantity(amount / factor, 2) },
      ]
    },
  },
  {
    id: 'npv',
    label: 'Net present value',
    hint: 'One cash flow per line, starting with year 1. The initial outlay is entered separately and treated as spent today.',
    fields: [
      { id: 'rate', label: 'Discount rate %', sample: '10' },
      { id: 'initial', label: 'Initial outlay', sample: '1000' },
      { id: 'flows', label: 'Cash flows', area: true, sample: '400\n400\n500' },
    ],
    run: (raw) => {
      const rate = readNumber(raw.rate, 'discount rate') / 100
      if (rate <= -1) throw new Error('Discount rate must be above -100%.')
      const flows = (raw.flows ?? '')
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => readNumber(line, 'cash flow'))
      if (!flows.length) throw new Error('Enter at least one cash flow.')
      const present = flows.reduce((sum, flow, index) => sum + flow / (1 + rate) ** (index + 1), 0)
      if (!Number.isFinite(present)) throw new Error('Discount rate must be above -100%.')
      const npv = present - readNumber(raw.initial, 'initial outlay')
      return [
        { label: 'NPV', value: formatQuantity(npv, 2) },
        { label: 'Present value of flows', value: formatQuantity(present, 2) },
      ]
    },
  },
  {
    id: 'even',
    label: 'Break-even',
    hint: 'Units you need to sell so contribution covers fixed costs.',
    fields: [
      { id: 'fixed', label: 'Fixed costs', sample: '5000' },
      { id: 'price', label: 'Price per unit', sample: '40' },
      { id: 'variable', label: 'Variable cost per unit', sample: '15' },
    ],
    run: (raw) => {
      const price = readNumber(raw.price, 'price')
      const variable = readNumber(raw.variable, 'variable cost')
      const contribution = price - variable
      if (contribution <= 0) throw new Error('Price has to be above the variable cost.')
      const units = readNumber(raw.fixed, 'fixed costs') / contribution
      return [
        { label: 'Units', value: formatQuantity(units, 2) },
        { label: 'Revenue', value: formatQuantity(units * price, 2) },
      ]
    },
  },
  {
    id: 'dim',
    label: 'Dimensional weight',
    hint: 'Air-freight style: (L × W × H) / divisor, in centimetres. 5000 is a common divisor. Chargeable weight is the greater of dimensional and actual.',
    fields: [
      { id: 'l', label: 'Length (cm)', sample: '40' },
      { id: 'w', label: 'Width (cm)', sample: '30' },
      { id: 'h', label: 'Height (cm)', sample: '20' },
      { id: 'div', label: 'Divisor', sample: '5000' },
      { id: 'actual', label: 'Actual weight (kg)', sample: '3' },
    ],
    run: (raw) => {
      const div = readNumber(raw.div, 'divisor')
      if (div === 0) throw new Error('Divisor cannot be zero.')
      const dim = (readNumber(raw.l, 'length') * readNumber(raw.w, 'width') * readNumber(raw.h, 'height')) / div
      const actual = readNumber(raw.actual, 'actual weight')
      return [
        { label: 'Dimensional kg', value: formatQuantity(dim, 2) },
        { label: 'Chargeable kg', value: formatQuantity(Math.max(dim, actual), 2) },
      ]
    },
  },
  {
    id: 'paint',
    label: 'Paint',
    hint: 'Wall area of a rectangular room, ignoring doors. Coverage is square metres per litre.',
    fields: [
      { id: 'l', label: 'Length (m)', sample: '4' },
      { id: 'w', label: 'Width (m)', sample: '3' },
      { id: 'h', label: 'Height (m)', sample: '2.7' },
      { id: 'coats', label: 'Coats', sample: '2' },
      { id: 'cover', label: 'Coverage (m²/L)', sample: '10' },
    ],
    run: (raw) => {
      const cover = readNumber(raw.cover, 'coverage')
      if (cover <= 0) throw new Error('Coverage must be above zero.')
      const area = 2 * (readNumber(raw.l, 'length') + readNumber(raw.w, 'width')) * readNumber(raw.h, 'height')
      const coats = readNumber(raw.coats, 'coats')
      return [
        { label: 'Wall area', value: `${formatQuantity(area, 2)} m²` },
        { label: 'Paint', value: `${formatQuantity((area * coats) / cover, 2)} L` },
      ]
    },
  },
  {
    id: 'tile',
    label: 'Tiles',
    hint: 'How many tiles cover a floor, plus a waste allowance.',
    fields: [
      { id: 'l', label: 'Room length (m)', sample: '4' },
      { id: 'w', label: 'Room width (m)', sample: '3' },
      { id: 'tl', label: 'Tile length (cm)', sample: '60' },
      { id: 'tw', label: 'Tile width (cm)', sample: '60' },
      { id: 'waste', label: 'Waste %', sample: '10' },
    ],
    run: (raw) => {
      const tile = (readNumber(raw.tl, 'tile length') / 100) * (readNumber(raw.tw, 'tile width') / 100)
      if (tile <= 0) throw new Error('Tile area must be above zero.')
      const room = readNumber(raw.l, 'room length') * readNumber(raw.w, 'room width')
      const needed = (room / tile) * (1 + readNumber(raw.waste, 'waste') / 100)
      return [
        { label: 'Tiles', value: String(Math.ceil(needed - 1e-9)) },
        { label: 'Floor area', value: `${formatQuantity(room, 2)} m²` },
      ]
    },
  },
  {
    id: 'concrete',
    label: 'Concrete volume',
    hint: 'Volume of a rectangular slab. Depth is in centimetres so a typical pour is easy to type.',
    fields: [
      { id: 'l', label: 'Length (m)', sample: '5' },
      { id: 'w', label: 'Width (m)', sample: '4' },
      { id: 'd', label: 'Depth (cm)', sample: '10' },
    ],
    run: (raw) => {
      const m3 = readNumber(raw.l, 'length') * readNumber(raw.w, 'width') * (readNumber(raw.d, 'depth') / 100)
      return [
        { label: 'Volume', value: `${formatQuantity(m3, 3)} m³` },
        { label: 'Volume', value: `${formatQuantity(m3 * 35.3146667, 2)} ft³` },
      ]
    },
  },
  {
    id: 'ppi',
    label: 'Screen PPI',
    hint: 'Pixels per inch from the resolution and the diagonal size.',
    fields: [
      { id: 'w', label: 'Width (px)', sample: '1920' },
      { id: 'h', label: 'Height (px)', sample: '1080' },
      { id: 'inches', label: 'Diagonal (in)', sample: '24' },
    ],
    run: (raw) => {
      const inches = readNumber(raw.inches, 'diagonal')
      if (inches <= 0) throw new Error('Diagonal must be above zero.')
      const px = Math.hypot(readNumber(raw.w, 'width'), readNumber(raw.h, 'height'))
      return [{ label: 'PPI', value: formatQuantity(px / inches, 1) }]
    },
  },
  {
    id: 'stairs',
    label: 'Stairs',
    hint: 'Riser count from the total rise and the riser height you want. Goings are one fewer than risers.',
    fields: [
      { id: 'rise', label: 'Total rise (cm)', sample: '270' },
      { id: 'riser', label: 'Target riser (cm)', sample: '18' },
    ],
    run: (raw) => {
      const target = readNumber(raw.riser, 'target riser')
      const total = readNumber(raw.rise, 'total rise')
      if (target <= 0 || total <= 0) throw new Error('Rise and riser must be above zero.')
      const risers = Math.max(1, Math.round(total / target))
      return [
        { label: 'Risers', value: String(risers) },
        { label: 'Actual riser', value: `${formatQuantity(total / risers, 2)} cm` },
        { label: 'Goings', value: String(Math.max(0, risers - 1)) },
      ]
    },
  },
  {
    id: 'pitch',
    label: 'Roof pitch',
    hint: 'Angle and grade from rise and run, in the same unit.',
    fields: [
      { id: 'rise', label: 'Rise', sample: '6' },
      { id: 'run', label: 'Run', sample: '12' },
    ],
    run: (raw) => {
      const run = readNumber(raw.run, 'run')
      const rise = readNumber(raw.rise, 'rise')
      if (run === 0) throw new Error('Run cannot be zero.')
      const grade = rise / run
      return [
        { label: 'Pitch', value: `${formatQuantity(rise, 2)} : ${formatQuantity(run, 2)}` },
        { label: 'Angle', value: `${formatQuantity((Math.atan(grade) * 180) / Math.PI, 2)}°` },
        { label: 'Grade', value: `${formatQuantity(grade * 100, 2)}%` },
      ]
    },
  },
  {
    id: 'board',
    label: 'Board feet',
    hint: 'Board feet = thickness (in) × width (in) × length (ft) / 12.',
    fields: [
      { id: 't', label: 'Thickness (in)', sample: '1' },
      { id: 'w', label: 'Width (in)', sample: '6' },
      { id: 'l', label: 'Length (ft)', sample: '8' },
    ],
    run: (raw) => [
      {
        label: 'Board feet',
        value: formatQuantity(
          (readNumber(raw.t, 'thickness') * readNumber(raw.w, 'width') * readNumber(raw.l, 'length')) / 12,
          2,
        ),
      },
    ],
  },
  {
    id: 'recipe',
    label: 'Recipe scale',
    hint: 'Scales every leading number. Write one ingredient per line, such as “2 cups flour”.',
    fields: [
      { id: 'from', label: 'Original servings', sample: '4' },
      { id: 'to', label: 'Wanted servings', sample: '6' },
      { id: 'lines', label: 'Ingredients', area: true, sample: '2 cups flour\n1 tsp salt\n0.5 cup butter' },
    ],
    run: (raw) => {
      const from = readNumber(raw.from, 'original servings')
      if (from === 0) throw new Error('Original servings cannot be zero.')
      const factor = readNumber(raw.to, 'wanted servings') / from
      const lines = (raw.lines ?? '').split('\n').map((line) => {
        const match = /^(\s*)(\d*\.?\d+)(.*)$/.exec(line)
        if (!match) return line
        return `${match[1]}${formatQuantity(Number(match[2]) * factor, 3)}${match[3]}`
      })
      return [
        { label: 'Factor', value: formatQuantity(factor, 3) },
        { label: 'Scaled', value: lines.join('\n') },
      ]
    },
  },
  {
    id: 'cups',
    label: 'Cups to grams',
    hint: 'US cups to grams for common ingredients. Packed flour and brown sugar vary by how you fill the cup.',
    fields: [
      { id: 'ingredient', label: 'Ingredient', sample: 'flour' },
      { id: 'cups', label: 'Cups', sample: '2' },
    ],
    run: (raw) => [
      { label: 'Grams', value: formatQuantity(cupToGrams(raw.ingredient ?? '', readNumber(raw.cups, 'cups')), 1) },
    ],
  },
]
