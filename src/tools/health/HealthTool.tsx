import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import {
  ACTIVITIES,
  ASIAN_BANDS,
  BMI_BANDS,
  bandFor,
  bmi,
  bmr,
  cmToFeet,
  feetToCm,
  GOALS,
  healthyWeightRange,
  macrosFor,
  tdee,
  waterLitres,
  type Activity,
  type Goal,
  type Sex,
} from '../../lib/health'

type Units = 'metric' | 'imperial'

const UNIT_OPTIONS: { value: Units; label: string }[] = [
  { value: 'metric', label: 'cm / kg' },
  { value: 'imperial', label: 'ft·in / lb' },
]

const SEXES: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export default function HealthTool() {
  const [units, setUnits] = useState<Units>('metric')
  const [cm, setCm] = useState(170)
  const [kg, setKg] = useState(70)
  const [age, setAge] = useState(30)
  const [sex, setSex] = useState<Sex>('male')
  const [activity, setActivity] = useState<Activity>('light')
  const [goal, setGoal] = useState<Goal>('maintain')
  const [asianBands, setAsianBands] = useState(true)

  const feet = cmToFeet(cm)
  const bands = asianBands ? ASIAN_BANDS : BMI_BANDS

  const numbers = useMemo(() => {
    const value = bmi(kg, cm)
    const basal = bmr(kg, cm, age, sex)
    const daily = tdee(basal, activity)
    return {
      bmi: value,
      band: bandFor(value, bands),
      range: healthyWeightRange(cm, bands),
      basal,
      daily,
      macros: macrosFor(daily, kg, goal),
      water: waterLitres(kg),
    }
  }, [kg, cm, age, sex, activity, goal, bands])

  const valid = cm > 50 && kg > 5 && age > 0

  return (
    <ToolLayout
      title="Health calculators"
      lede="BMI, resting energy, daily calories, and a macro split. Estimates for planning, not medical advice."
    >
      <Segmented label="Units" value={units} options={UNIT_OPTIONS} onChange={setUnits} />

      {units === 'metric' ? (
        <div className="split">
          <label className="field">
            <span>Height — cm</span>
            <input className="text-input" type="number" value={Math.round(cm)} onChange={(e) => setCm(Number(e.target.value) || 0)} />
          </label>
          <label className="field">
            <span>Weight — kg</span>
            <input className="text-input" type="number" value={Math.round(kg)} onChange={(e) => setKg(Number(e.target.value) || 0)} />
          </label>
        </div>
      ) : (
        <div className="split">
          <div className="field">
            <span>Height — feet and inches</span>
            <div className="row">
              <input
                className="text-input"
                type="number"
                value={feet.feet}
                onChange={(e) => setCm(feetToCm(Number(e.target.value) || 0, feet.inches))}
              />
              <input
                className="text-input"
                type="number"
                value={feet.inches}
                onChange={(e) => setCm(feetToCm(feet.feet, Number(e.target.value) || 0))}
              />
            </div>
          </div>
          <label className="field">
            <span>Weight — lb</span>
            <input
              className="text-input"
              type="number"
              value={Math.round(kg * 2.2046)}
              onChange={(e) => setKg((Number(e.target.value) || 0) / 2.2046)}
            />
          </label>
        </div>
      )}

      <div className="split">
        <label className="field">
          <span>Age</span>
          <input className="text-input" type="number" value={age} onChange={(e) => setAge(Number(e.target.value) || 0)} />
        </label>
        <Segmented label="Sex — for the energy formula" value={sex} options={SEXES} onChange={setSex} />
      </div>

      <label className="field">
        <span>Activity</span>
        <select className="text-input" value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
          {ACTIVITIES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label} — {a.note}
            </option>
          ))}
        </select>
      </label>

      {!valid ? (
        <p className="status-bad">Fill in a realistic height, weight, and age.</p>
      ) : (
        <>
          <div className="big-answer">
            <strong>{numbers.bmi.toFixed(1)}</strong> <span>BMI · {numbers.band.label}</span>
          </div>

          <div className="bmi-scale" role="img" aria-label={`BMI ${numbers.bmi.toFixed(1)}, ${numbers.band.label}`}>
            {bands.map((band) => (
              <span key={band.label} className="bmi-band" data-tone={band.tone}>
                {band.label}
              </span>
            ))}
          </div>

          <div className="pill-row">
            <span className="pill">
              Healthy weight for your height: <strong>{numbers.range.min.toFixed(0)}–{numbers.range.max.toFixed(0)} kg</strong>
            </span>
          </div>

          <label className="row">
            <input type="checkbox" checked={asianBands} onChange={(e) => setAsianBands(e.target.checked)} />
            Use WHO Asian cut-offs — risk rises at a lower BMI for South and East Asian populations
          </label>

          <div className="grid-tools" style={{ marginTop: '1.2rem' }}>
            <div className="panel">
              <p className="field-label">Energy</p>
              <div className="pill-row">
                <span className="pill">Resting <strong>{Math.round(numbers.basal)}</strong> kcal</span>
                <span className="pill">Maintenance <strong>{Math.round(numbers.daily)}</strong> kcal</span>
              </div>
              <p className="hint">Mifflin–St Jeor, then multiplied by your activity level.</p>
            </div>

            <div className="panel">
              <p className="field-label">Water</p>
              <div className="pill-row">
                <span className="pill"><strong>{numbers.water.toFixed(1)}</strong> litres a day</span>
              </div>
              <p className="hint">A rough 35 ml per kilo. Heat and exercise push it higher.</p>
            </div>
          </div>

          <p className="field-label" style={{ marginTop: '1.2rem' }}>
            Macro split
          </p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                className={goal === g.value ? 'chip chip-on' : 'chip'}
                aria-pressed={goal === g.value}
                onClick={() => setGoal(g.value)}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="macro-bar" aria-hidden="true">
            <span className="macro-p" style={{ flex: numbers.macros.protein * 4 }} />
            <span className="macro-c" style={{ flex: numbers.macros.carbs * 4 }} />
            <span className="macro-f" style={{ flex: numbers.macros.fat * 9 }} />
          </div>
          <div className="pill-row">
            <span className="pill">{numbers.macros.calories} kcal target</span>
            <span className="pill">Protein <strong>{numbers.macros.protein} g</strong></span>
            <span className="pill">Carbs <strong>{numbers.macros.carbs} g</strong></span>
            <span className="pill">Fat <strong>{numbers.macros.fat} g</strong></span>
          </div>

          <p className="hint" style={{ marginTop: '1rem' }}>
            BMI does not distinguish muscle from fat and says nothing about where weight sits, so it reads badly
            for athletes and for very short or tall people. These are planning estimates — talk to a doctor or
            dietitian before acting on them.
          </p>
        </>
      )}
    </ToolLayout>
  )
}
