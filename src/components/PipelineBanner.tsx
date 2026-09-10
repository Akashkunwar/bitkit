import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setHandoff } from '../lib/handoff'
import {
  continueRun,
  endRun,
  listPipelines,
  peekPipelineOutput,
  readRun,
  titleForStep,
  type Pipeline,
} from '../lib/pipelines'

export function PipelineBanner() {
  const navigate = useNavigate()
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<string | null>(null)

  const refresh = () => {
    const run = readRun()
    if (!run) {
      setPipeline(null)
      return
    }
    setIndex(run.index)
    void listPipelines().then((list) => {
      setPipeline(list.find((p) => p.id === run.pipelineId) ?? null)
    })
  }

  useEffect(() => {
    refresh()
    window.addEventListener('bitkit-pipeline', refresh)
    return () => window.removeEventListener('bitkit-pipeline', refresh)
  }, [])

  if (!pipeline) return null
  const current = pipeline.steps[index]
  const remaining = pipeline.steps.length - index - 1

  return (
    <div className="panel" style={{ borderColor: 'var(--accent)', marginBottom: '1rem' }}>
      <p className="field-label">Pipeline · {pipeline.name}</p>
      <p>
        Step {index + 1} of {pipeline.steps.length}
        {current ? ` · ${titleForStep(current)}` : ''}
        {remaining > 0 ? ` · ${remaining} left` : ''}
      </p>
      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            void (async () => {
              const output = peekPipelineOutput()
              if (output) setHandoff({ ...output, from: 'pipeline' })
              const next = await continueRun()
              window.dispatchEvent(new Event('bitkit-pipeline'))
              if (!next) return
              if ('done' in next) {
                setStatus('Pipeline finished.')
                setPipeline(null)
                return
              }
              navigate(next.path)
            })()
          }}
        >
          Continue
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            endRun()
            window.dispatchEvent(new Event('bitkit-pipeline'))
            setPipeline(null)
          }}
        >
          Stop
        </button>
      </div>
      {status ? <p className="status-ok">{status}</p> : null}
    </div>
  )
}
