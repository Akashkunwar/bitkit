export type Sex = 'male' | 'female'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'
export type Goal = 'lose' | 'maintain' | 'gain'

export const ACTIVITIES: { value: Activity; label: string; factor: number; note: string }[] = [
  { value: 'sedentary', label: 'Sedentary', factor: 1.2, note: 'Desk job, little exercise' },
  { value: 'light', label: 'Light', factor: 1.375, note: 'Exercise 1–3 days a week' },
  { value: 'moderate', label: 'Moderate', factor: 1.55, note: 'Exercise 3–5 days a week' },
  { value: 'active', label: 'Active', factor: 1.725, note: 'Hard exercise 6–7 days a week' },
  { value: 'athlete', label: 'Athlete', factor: 1.9, note: 'Physical job or twice-daily training' },
]

export type BmiBand = {
  label: string
  from: number
  to: number
  tone: 'low' | 'ok' | 'warn' | 'high'
}

/** WHO international cut-offs. Asian populations use lower thresholds — see ASIAN_BANDS. */
export const BMI_BANDS: BmiBand[] = [
  { label: 'Underweight', from: 0, to: 18.5, tone: 'low' },
  { label: 'Healthy', from: 18.5, to: 25, tone: 'ok' },
  { label: 'Overweight', from: 25, to: 30, tone: 'warn' },
  { label: 'Obese', from: 30, to: Infinity, tone: 'high' },
]

/** India/WHO-Asia cut-offs: risk rises at a lower BMI than the international bands. */
export const ASIAN_BANDS: BmiBand[] = [
  { label: 'Underweight', from: 0, to: 18.5, tone: 'low' },
  { label: 'Healthy', from: 18.5, to: 23, tone: 'ok' },
  { label: 'Overweight', from: 23, to: 27.5, tone: 'warn' },
  { label: 'Obese', from: 27.5, to: Infinity, tone: 'high' },
]

export function bmi(kg: number, cm: number): number {
  if (kg <= 0 || cm <= 0) return 0
  const m = cm / 100
  return kg / (m * m)
}

export function bandFor(value: number, bands: BmiBand[]): BmiBand {
  return bands.find((b) => value >= b.from && value < b.to) ?? bands[bands.length - 1]
}

/** Weight range that lands inside the healthy band for this height. */
export function healthyWeightRange(cm: number, bands: BmiBand[]): { min: number; max: number } {
  const healthy = bands.find((b) => b.tone === 'ok') ?? bands[1]
  const m = cm / 100
  return { min: healthy.from * m * m, max: healthy.to * m * m }
}

/**
 * Mifflin–St Jeor, which predicts resting energy more accurately than
 * Harris–Benedict for most people.
 */
export function bmr(kg: number, cm: number, age: number, sex: Sex): number {
  if (kg <= 0 || cm <= 0 || age <= 0) return 0
  const base = 10 * kg + 6.25 * cm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function tdee(basal: number, activity: Activity): number {
  const found = ACTIVITIES.find((a) => a.value === activity)
  return basal * (found?.factor ?? 1.2)
}

export type Macros = { protein: number; carbs: number; fat: number; calories: number }

export const GOALS: { value: Goal; label: string; delta: number; note: string }[] = [
  { value: 'lose', label: 'Lose weight', delta: -0.2, note: '20% below maintenance' },
  { value: 'maintain', label: 'Maintain', delta: 0, note: 'At maintenance' },
  { value: 'gain', label: 'Build muscle', delta: 0.12, note: '12% above maintenance' },
]

/**
 * Protein is set per kilo of bodyweight (the part that actually matters), fat
 * takes a fixed share of energy, and carbohydrate fills the remainder.
 */
export function macrosFor(calories: number, kg: number, goal: Goal): Macros {
  const target = calories * (1 + (GOALS.find((g) => g.value === goal)?.delta ?? 0))
  const proteinPerKg = goal === 'lose' ? 2.0 : goal === 'gain' ? 1.8 : 1.6
  const protein = Math.max(0, kg * proteinPerKg)
  const fatCalories = target * 0.27
  const fat = fatCalories / 9
  const carbCalories = target - protein * 4 - fatCalories
  return {
    calories: Math.round(target),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(Math.max(0, carbCalories) / 4),
  }
}

export function waterLitres(kg: number): number {
  return (kg * 35) / 1000
}

/** Height in feet and inches, for people who think in those units. */
export function cmToFeet(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  return { feet, inches: Math.round(totalInches - feet * 12) }
}

export function feetToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54
}
