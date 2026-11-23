import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  buttonActive,
  buttonFill,
  notePadActivity,
  padLabel,
  padMemoryKey,
  padSignature,
  readingFromPad,
  STANDARD_PAD,
  stickPercent,
  type PadMemory,
  type PadReading,
} from '../../lib/diagnose'

function livePads(): PadReading[] {
  const pads = navigator.getGamepads?.() ?? []
  return [...pads].flatMap((pad) => (pad ? [readingFromPad(pad)] : []))
}

function PadKey({ label, held, seen }: { label: string; held: boolean; seen: boolean }) {
  return (
    <span className="diag-padkey" data-held={held ? '' : undefined} data-seen={!held && seen ? '' : undefined}>
      {label}
    </span>
  )
}

function Stick({
  x,
  y,
  clicked,
  seen,
  label,
}: {
  x: number
  y: number
  clicked: boolean
  seen: boolean
  label: string
}) {
  return (
    <div className="diag-stick-wrap">
      <div
        className="diag-stick-well"
        data-held={clicked ? '' : undefined}
        data-seen={seen ? '' : undefined}
        aria-hidden="true"
      >
        <span className="diag-stick-knob" style={{ left: `${stickPercent(x)}%`, top: `${stickPercent(y)}%` }} />
      </div>
      <span className="diag-kicker">{label}</span>
    </div>
  )
}

function Meter({ label, value, held, seen }: { label: string; value: number; held: boolean; seen: boolean }) {
  return (
    <div className="diag-meter" data-held={held ? '' : undefined} data-seen={!held && seen ? '' : undefined}>
      <span>{label}</span>
      <div className="diag-axis-track" aria-hidden="true">
        <span className="diag-axis-fill" style={{ left: 0, width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  )
}

function Cluster({ children }: { children: ReactNode }) {
  return <div className="diag-cluster">{children}</div>
}

export function PadCheck() {
  const [pads, setPads] = useState<PadReading[]>([])
  const [memory, setMemory] = useState<PadMemory>({})
  const [rumbleNote, setRumbleNote] = useState<string | null>(null)
  const signature = useRef('')

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const readings = livePads()
      const next = padSignature(readings)
      if (next !== signature.current) {
        signature.current = next
        setPads(readings)
      }
      setMemory((current) => notePadActivity(current, readings))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const rumble = (index: number) => {
    const pad = navigator.getGamepads?.()[index]
    const actuator = pad?.vibrationActuator
    if (!actuator) {
      setRumbleNote('This controller did not offer rumble to the page.')
      return
    }
    void actuator
      .playEffect('dual-rumble', { duration: 280, startDelay: 0, strongMagnitude: 0.7, weakMagnitude: 0.45 })
      .then((result) => {
        setRumbleNote(result === 'complete' ? 'Rumble played.' : 'The controller declined rumble.')
      })
      .catch(() => setRumbleNote('The controller declined rumble.'))
  }

  return (
    <section className="panel" aria-labelledby="diag-pad-title">
      <div className="diag-head">
        <h2 id="diag-pad-title">Controller</h2>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setMemory({})
            setRumbleNote(null)
          }}
        >
          Reset
        </button>
      </div>
      <p className="hint">
        Press a button on the controller. Chrome waits for that before it will show the pad. A joystick that does not
        use the standard layout still lists every button and axis underneath. Sticks count as moved once they leave the
        centre.
      </p>
      {pads.length === 0 ? <p className="diag-readout">No controller yet.</p> : null}
      {rumbleNote ? <p className="hint">{rumbleNote}</p> : null}
      {pads.map((pad) => {
        const remembered = memory[padMemoryKey(pad)] ?? { buttons: [], axes: [] }
        const standard = pad.mapping === 'standard'
        const pressed = (index: number) => buttonActive(pad.buttons[index])
        const seen = (index: number) => remembered.buttons.includes(index)
        const axis = (index: number) => pad.axes[index] ?? 0
        return (
          <article key={`${pad.index}-${pad.id}`} className="diag-pad">
            <h3>{pad.id || `Controller ${pad.index + 1}`}</h3>
            <p className="diag-pad-id">
              {standard
                ? 'Standard layout.'
                : 'This pad uses its own layout, so the names below may not match the printed buttons.'}{' '}
              {remembered.buttons.length} buttons and {remembered.axes.length} axes have responded.
            </p>
            {standard ? (
              <div className="diag-schematic">
                <Stick x={axis(0)} y={axis(1)} clicked={pressed(10)} seen={seen(10)} label="Left stick" />
                <div className="diag-pad-mid">
                  <Cluster>
                    <span className="diag-hole" />
                    <PadKey label="Up" held={pressed(12)} seen={seen(12)} />
                    <span className="diag-hole" />
                    <PadKey label="Left" held={pressed(14)} seen={seen(14)} />
                    <span className="diag-hole" />
                    <PadKey label="Right" held={pressed(15)} seen={seen(15)} />
                    <span className="diag-hole" />
                    <PadKey label="Down" held={pressed(13)} seen={seen(13)} />
                    <span className="diag-hole" />
                  </Cluster>
                  <div className="diag-menus">
                    <PadKey label="Back" held={pressed(8)} seen={seen(8)} />
                    <PadKey label="Guide" held={pressed(16)} seen={seen(16)} />
                    <PadKey label="Start" held={pressed(9)} seen={seen(9)} />
                  </div>
                  <Cluster>
                    <span className="diag-hole" />
                    <PadKey label="Y" held={pressed(3)} seen={seen(3)} />
                    <span className="diag-hole" />
                    <PadKey label="X" held={pressed(2)} seen={seen(2)} />
                    <span className="diag-hole" />
                    <PadKey label="B" held={pressed(1)} seen={seen(1)} />
                    <span className="diag-hole" />
                    <PadKey label="A" held={pressed(0)} seen={seen(0)} />
                    <span className="diag-hole" />
                  </Cluster>
                </div>
                <Stick x={axis(2)} y={axis(3)} clicked={pressed(11)} seen={seen(11)} label="Right stick" />
              </div>
            ) : null}
            {standard ? (
              <div className="diag-meters">
                {([4, 5, 6, 7] as const).map((index) => (
                  <Meter
                    key={index}
                    label={STANDARD_PAD.find((button) => button.index === index)?.short ?? padLabel(index)}
                    value={buttonFill(pad.buttons[index])}
                    held={pressed(index)}
                    seen={seen(index)}
                  />
                ))}
              </div>
            ) : null}
            <div className="diag-axes">
              {pad.axes.map((value, index) => {
                const fromCentre = stickPercent(value) - 50
                return (
                  <div className="diag-axis" key={index} data-seen={remembered.axes.includes(index) ? '' : undefined}>
                    <span>Axis {index}</span>
                    <div className="diag-axis-track" aria-hidden="true">
                      <span className="diag-axis-zero" />
                      <span
                        className="diag-axis-fill"
                        style={
                          fromCentre >= 0
                            ? { left: '50%', width: `${fromCentre}%` }
                            : { left: `${50 + fromCentre}%`, width: `${-fromCentre}%` }
                        }
                      />
                    </div>
                    <span>{value.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
            <div className="diag-chips" aria-label="All buttons">
              {pad.buttons.map((button, index) => (
                <span
                  key={index}
                  className="diag-chip"
                  data-held={buttonActive(button) ? '' : undefined}
                  data-seen={!buttonActive(button) && seen(index) ? '' : undefined}
                >
                  {padLabel(index)}
                  {button.value > 0 && button.value < 1 ? ` ${Math.round(button.value * 100)}%` : ''}
                </span>
              ))}
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => rumble(pad.index)}>
                Test rumble
              </button>
            </div>
          </article>
        )
      })}
    </section>
  )
}
