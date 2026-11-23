import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Segmented } from '../../components/Segmented'
import { stereoPan, type Ear } from '../../lib/diagnose'

const EARS: { value: Ear; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'both', label: 'Both' },
  { value: 'right', label: 'Right' },
]

type Tone = {
  set: (ear: Ear, volume: number) => void
  stop: () => void
}

function startTone(ear: Ear, volume: number, sweep: boolean): Tone {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  gain.gain.value = volume
  const now = ctx.currentTime
  if (sweep) {
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(3200, now + 3)
  } else {
    osc.frequency.value = 440
  }

  let pan: StereoPannerNode | null = null
  if (typeof ctx.createStereoPanner === 'function') {
    pan = ctx.createStereoPanner()
    pan.pan.value = stereoPan(ear)
    osc.connect(gain)
    gain.connect(pan)
    pan.connect(ctx.destination)
  } else {
    const merger = ctx.createChannelMerger(2)
    osc.connect(gain)
    if (ear !== 'right') gain.connect(merger, 0, 0)
    if (ear !== 'left') gain.connect(merger, 0, 1)
    merger.connect(ctx.destination)
  }

  osc.start()
  return {
    set(nextEar, nextVolume) {
      gain.gain.value = nextVolume
      if (pan) pan.pan.value = stereoPan(nextEar)
    },
    stop() {
      try {
        osc.stop()
      } catch {
        /* already stopped */
      }
      void ctx.close()
    },
  }
}

export function SoundCheck() {
  const [ear, setEar] = useState<Ear>('both')
  const [volume, setVolume] = useState(0.25)
  const [playing, setPlaying] = useState<'tone' | 'sweep' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const tone = useRef<Tone | null>(null)

  const stop = () => {
    tone.current?.stop()
    tone.current = null
    setPlaying(null)
  }

  useEffect(() => {
    return () => {
      tone.current?.stop()
      tone.current = null
    }
  }, [])

  useEffect(() => {
    tone.current?.set(ear, volume)
  }, [ear, volume])

  const play = (kind: 'tone' | 'sweep') => {
    stop()
    setError(null)
    try {
      tone.current = startTone(ear, volume, kind === 'sweep')
      setPlaying(kind)
    } catch {
      setError('This browser could not play a test tone.')
    }
  }

  const leftOn = playing !== null && ear !== 'right'
  const rightOn = playing !== null && ear !== 'left'

  return (
    <section className="panel" aria-labelledby="diag-sound-title">
      <h2 id="diag-sound-title">Speakers</h2>
      <p className="hint">
        Left means the speaker on your left as you face the screen. Headphones make a dead side obvious. The tone is
        generated in this tab and is not recorded. To check the microphone, open the{' '}
        <Link to="/soundmeter">Sound meter</Link>.
      </p>
      <div className="diag-ears" aria-hidden="true">
        <span data-on={leftOn ? '' : undefined}>L</span>
        <span data-on={rightOn ? '' : undefined}>R</span>
      </div>
      <Segmented label="Speaker" value={ear} options={EARS} onChange={setEar} />
      <label className="field">
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
        />
      </label>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => play('tone')}>
          Play tone
        </button>
        <button type="button" className="btn" onClick={() => play('sweep')}>
          Play sweep
        </button>
        <button type="button" className="btn" onClick={stop} disabled={playing === null}>
          Stop
        </button>
      </div>
      {error ? <p className="status-bad">{error}</p> : null}
      <p className="diag-readout" aria-live="polite">
        {playing === 'tone' ? 'Playing a 440 Hz tone.' : playing === 'sweep' ? 'Sweeping from low to high.' : 'Silent.'}
      </p>
    </section>
  )
}
