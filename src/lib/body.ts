import { calendarDaysBetween } from './dateMath'
import { formatQuantity, readNumber, type Formula } from './formula'

function cmToInches(cm: number): number {
  return cm / 2.54
}

/** US Navy circumference method. Inputs are centimetres. */
export function navyBodyFat(sex: string, heightCm: number, neckCm: number, waistCm: number, hipCm: number): number {
  const height = cmToInches(heightCm)
  const neck = cmToInches(neckCm)
  const waist = cmToInches(waistCm)
  const hip = cmToInches(hipCm)
  if (height <= 0) throw new Error('Height must be above zero.')
  const who = sex.trim().toLowerCase()
  let estimate: number
  if (who === 'male') {
    if (waist <= neck) throw new Error('Waist has to be larger than the neck measurement.')
    estimate = 86.01 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76
  } else if (who === 'female') {
    if (waist + hip <= neck) throw new Error('Waist plus hip has to be larger than the neck measurement.')
    estimate = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387
  } else {
    throw new Error('Choose male or female.')
  }
  if (!Number.isFinite(estimate) || estimate < 0) {
    throw new Error(
      "Those measurements don't produce a usable body-fat percentage. Check the circumferences against the height.",
    )
  }
  return estimate
}

/** Devine formula, in kilograms. Height is centimetres. */
export function devineWeight(sex: string, heightCm: number): number {
  const inches = cmToInches(heightCm)
  const over = inches - 60
  const who = sex.trim().toLowerCase()
  if (who === 'male') return 50 + 2.3 * over
  if (who === 'female') return 45.5 + 2.3 * over
  throw new Error('Choose male or female.')
}

export function heartZones(age: number, resting: number): { name: string; low: number; high: number }[] {
  if (age <= 0 || age > 120) throw new Error('Enter an age from 1 to 120.')
  if (resting <= 0) throw new Error('Resting heart rate must be above zero.')
  const max = 220 - age
  if (resting >= max) throw new Error('Resting heart rate has to be below the estimated maximum.')
  const reserve = max - resting
  const bands = [
    ['Recovery', 0.5, 0.6],
    ['Aerobic', 0.6, 0.7],
    ['Tempo', 0.7, 0.8],
    ['Threshold', 0.8, 0.9],
    ['Peak', 0.9, 1],
  ] as const
  return bands.map(([name, low, high]) => ({
    name,
    low: Math.round(resting + reserve * low),
    high: Math.round(resting + reserve * high),
  }))
}

/** Widmark estimate as a percent. Not a legal or medical measurement. */
export function bacPercent(sex: string, weightKg: number, ml: number, abv: number, hours: number): number {
  if (weightKg <= 0) throw new Error('Weight must be above zero.')
  const who = sex.trim().toLowerCase()
  const r = who === 'male' ? 0.68 : who === 'female' ? 0.55 : NaN
  if (!Number.isFinite(r)) throw new Error('Choose male or female.')
  const grams = ml * (abv / 100) * 0.789
  const raw = (grams / (weightKg * 1000 * r)) * 100 - 0.015 * hours
  return Math.max(0, raw)
}

const SEX = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export const BODY_FORMULAS: Formula[] = [
  {
    id: 'navy',
    label: 'Body fat (Navy)',
    hint: 'US Navy circumference estimate. Hip is used for the female formula. This is not a clinical measurement.',
    fields: [
      { id: 'sex', label: 'Sex', sample: 'male', options: SEX },
      { id: 'height', label: 'Height (cm)', sample: '178' },
      { id: 'neck', label: 'Neck (cm)', sample: '38' },
      { id: 'waist', label: 'Waist (cm)', sample: '86' },
      { id: 'hip', label: 'Hip (cm)', sample: '96' },
    ],
    run: (raw) => [
      {
        label: 'Body fat',
        value: `${formatQuantity(
          navyBodyFat(
            raw.sex ?? '',
            readNumber(raw.height, 'height'),
            readNumber(raw.neck, 'neck'),
            readNumber(raw.waist, 'waist'),
            readNumber(raw.hip, 'hip'),
          ),
          1,
        )}%`,
      },
    ],
  },
  {
    id: 'ideal',
    label: 'Ideal weight (Devine)',
    hint: 'The Devine formula used for drug dosing, not a target you must hit. Height in centimetres.',
    fields: [
      { id: 'sex', label: 'Sex', sample: 'female', options: SEX },
      { id: 'height', label: 'Height (cm)', sample: '165' },
    ],
    run: (raw) => [
      {
        label: 'Weight',
        value: `${formatQuantity(devineWeight(raw.sex ?? '', readNumber(raw.height, 'height')), 1)} kg`,
      },
    ],
  },
  {
    id: 'zones',
    label: 'Heart-rate zones',
    hint: 'Karvonen zones from age and resting heart rate. Maximum is estimated as 220 − age.',
    fields: [
      { id: 'age', label: 'Age', sample: '35' },
      { id: 'rest', label: 'Resting bpm', sample: '60' },
    ],
    run: (raw) => {
      const age = readNumber(raw.age, 'age')
      const zones = heartZones(age, readNumber(raw.rest, 'resting heart rate'))
      return [
        { label: 'Estimated max', value: `${Math.round(220 - age)} bpm` },
        ...zones.map((zone) => ({ label: zone.name, value: `${zone.low}–${zone.high} bpm` })),
      ]
    },
  },
  {
    id: 'pace',
    label: 'Running pace',
    hint: 'Pace from distance and the time it took.',
    fields: [
      { id: 'km', label: 'Distance (km)', sample: '10' },
      { id: 'min', label: 'Minutes', sample: '52' },
      { id: 'sec', label: 'Seconds', sample: '30' },
    ],
    run: (raw) => {
      const km = readNumber(raw.km, 'distance')
      if (km <= 0) throw new Error('Distance must be above zero.')
      const seconds = readNumber(raw.min, 'minutes') * 60 + readNumber(raw.sec, 'seconds')
      if (seconds <= 0) throw new Error('Time must be above zero.')
      const perKm = seconds / km
      const paceMin = Math.floor(perKm / 60)
      const paceSec = Math.round(perKm % 60)
      return [
        { label: 'Pace', value: `${paceMin}:${String(paceSec).padStart(2, '0')} / km` },
        { label: 'Speed', value: `${formatQuantity(km / (seconds / 3600), 2)} km/h` },
      ]
    },
  },
  {
    id: 'due',
    label: 'Due date',
    hint: 'Naegele’s rule: 280 days after the first day of the last menstrual period.',
    fields: [{ id: 'lmp', label: 'Last period', date: true, sample: '2026-01-01' }],
    run: (raw) => {
      const start = parseDate(raw.lmp ?? '')
      const due = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 280)
      const today = new Date()
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const days = calendarDaysBetween(start, todayDate)
      const weeks = Math.floor(days / 7)
      const extra = days % 7
      return [
        { label: 'Due', value: formatDate(due) },
        { label: 'From that date to today', value: days < 0 ? 'The date is in the future.' : `${weeks}w ${extra}d` },
      ]
    },
  },
  {
    id: 'bac',
    label: 'BAC estimate',
    hint: 'Widmark estimate from one drink volume. It ignores food, medicines, and metabolism differences. Not a legal measurement.',
    fields: [
      { id: 'sex', label: 'Sex', sample: 'female', options: SEX },
      { id: 'weight', label: 'Weight (kg)', sample: '62' },
      { id: 'ml', label: 'Drink volume (ml)', sample: '150' },
      { id: 'abv', label: 'Alcohol %', sample: '12' },
      { id: 'hours', label: 'Hours since', sample: '1' },
    ],
    run: (raw) => [
      {
        label: 'Estimate',
        value: `${formatQuantity(
          bacPercent(
            raw.sex ?? '',
            readNumber(raw.weight, 'weight'),
            readNumber(raw.ml, 'volume'),
            readNumber(raw.abv, 'alcohol'),
            readNumber(raw.hours, 'hours'),
          ),
          3,
        )}%`,
      },
    ],
  },
]

function parseDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) throw new Error('Choose a date.')
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1) {
    throw new Error('That date is not valid.')
  }
  return date
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
