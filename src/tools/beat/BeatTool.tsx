import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'

export default function BeatTool() {
  const [bpm, setBpm] = useState(100)
  const [playing, setPlaying] = useState(false)
  const [freq, setFreq] = useState(440)
  const [toneOn, setToneOn] = useState(false)
  const tone = useRef<{ ctx: AudioContext; osc: OscillatorNode } | null>(null)
  const taps = useRef<number[]>([])
  const bpmRef = useRef(bpm)
  const clockRef = useRef<AudioContext | null>(null)
  bpmRef.current = bpm

  useEffect(() => {
    return () => {
      void clockRef.current?.close()
      clockRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!playing) return
    const ctx = clockRef.current
    if (!ctx) return
    let next = ctx.currentTime + 0.05
    const id = window.setInterval(() => {
      if (ctx.state === 'closed') return
      if (ctx.state === 'suspended') void ctx.resume()
      const step = 60 / Math.min(240, Math.max(30, bpmRef.current))
      // A backgrounded tab leaves the clock in the past. Skip those beats
      // instead of playing them all the moment the tab is focused again.
      if (next < ctx.currentTime) next = ctx.currentTime + 0.02
      const horizon = ctx.currentTime + 0.25
      let scheduled = 0
      while (next < horizon && scheduled < 8) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.0001, next)
        gain.gain.exponentialRampToValueAtTime(0.08, next + 0.005)
        gain.gain.exponentialRampToValueAtTime(0.0001, next + 0.06)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(next)
        osc.stop(next + 0.07)
        next += step
        scheduled += 1
      }
    }, 40)
    return () => window.clearInterval(id)
  }, [playing])

  useEffect(() => {
    return () => {
      tone.current?.osc.stop()
      void tone.current?.ctx.close()
    }
  }, [])

  const toggleTone = async () => {
    if (tone.current) {
      tone.current.osc.stop()
      void tone.current.ctx.close()
      tone.current = null
      setToneOn(false)
      return
    }
    const ctx = new AudioContext()
    void ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    gain.gain.value = 0.05
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    tone.current = { ctx, osc }
    setToneOn(true)
  }

  const retune = (value: number) => {
    setFreq(value)
    if (tone.current) tone.current.osc.frequency.value = value
  }

  const tap = () => {
    const now = performance.now()
    taps.current = [...taps.current.filter((time) => now - time < 4000), now]
    if (taps.current.length < 2) return
    const gaps: number[] = []
    for (let i = 1; i < taps.current.length; i += 1) gaps.push(taps.current[i] - taps.current[i - 1])
    const average = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
    if (average > 0) setBpm(Math.round(Math.min(240, Math.max(30, 60000 / average))))
  }

  return (
    <ToolLayout title="Beat" lede="A metronome, a tap tempo, and a steady tone. Sound stays in this tab.">
      <section className="panel">
        <label className="field">
          <span>Metronome — {bpm} bpm</span>
          <input type="range" min={30} max={240} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} />
        </label>
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (playing) {
                setPlaying(false)
                const ctx = clockRef.current
                clockRef.current = null
                if (ctx) void ctx.close()
                return
              }
              if (!clockRef.current || clockRef.current.state === 'closed') {
                clockRef.current = new AudioContext()
              }
              void clockRef.current.resume()
              setPlaying(true)
            }}
          >
            {playing ? 'Stop' : 'Start'}
          </button>
          <button type="button" className="btn" onClick={tap}>
            Tap tempo
          </button>
        </div>
      </section>
      <section className="panel">
        <label className="field">
          <span>Tone — {freq} Hz</span>
          <input
            type="range"
            min={80}
            max={2000}
            value={freq}
            onChange={(event) => retune(Number(event.target.value))}
          />
        </label>
        <button type="button" className="btn" onClick={() => void toggleTone()}>
          {toneOn ? 'Stop tone' : 'Play tone'}
        </button>
      </section>
    </ToolLayout>
  )
}
