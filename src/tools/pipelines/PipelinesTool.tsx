import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ToolLayout } from '../../components/ToolLayout'
import { CATEGORIES, tools } from '../../registry'
import { useUndo } from '../../lib/undo'
import {
  deletePipeline,
  endRun,
  listPipelines,
  missingSteps,
  newPipeline,
  pathForStep,
  readRun,
  savePipelines,
  startRun,
  titleForStep,
  upsertPipeline,
  type Pipeline,
} from '../../lib/pipelines'

export default function PipelinesTool() {
  const [list, setList] = useState<Pipeline[]>([])
  const [editing, setEditing] = useState<Pipeline | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const navigate = useNavigate()
  const undo = useUndo()

  useEffect(() => {
    void listPipelines().then(setList)
  }, [])

  const running = readRun()
  const runningPipeline = running ? list.find((p) => p.id === running.pipelineId) : null

  const save = async (pipeline: Pipeline) => {
    setList(await upsertPipeline(pipeline))
    setEditing(null)
    setStatus(`Saved “${pipeline.name}”.`)
  }

  const remove = async (pipeline: Pipeline) => {
    setList(await deletePipeline(pipeline.id))
    undo.push({
      label: `Deleted “${pipeline.name}”`,
      undo: async () => {
        setList(await upsertPipeline(pipeline))
      },
    })
  }

  const run = async (pipeline: Pipeline) => {
    const missing = missingSteps(pipeline)
    if (missing.length) {
      setStatus(`This pipeline refers to tools that no longer exist: ${missing.join(', ')}.`)
      return
    }
    if (!pipeline.steps.length) return
    startRun(pipeline.id)
    setList(await upsertPipeline({ ...pipeline, runs: pipeline.runs + 1 }))
    const first = pathForStep(pipeline.steps[0])
    if (first) navigate(first)
  }

  return (
    <ToolLayout
      title="Pipelines"
      lede="Save a sequence of tools you keep repeating, then walk a file through it one step at a time."
    >
      {runningPipeline ? (
        <div className="panel" style={{ borderColor: 'var(--accent)' }}>
          <p className="field-label">Running “{runningPipeline.name}”</p>
          <ol className="run-steps">
            {runningPipeline.steps.map((step, i) => (
              <li key={i} data-state={i < (running?.index ?? 0) ? 'done' : i === running?.index ? 'now' : 'next'}>
                {titleForStep(step)}
              </li>
            ))}
          </ol>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                endRun()
                setStatus('Pipeline stopped.')
              }}
            >
              Stop
            </button>
          </div>
        </div>
      ) : null}

      <div className="row" style={{ marginTop: '1rem' }}>
        <button type="button" className="btn btn-primary" onClick={() => setEditing(newPipeline())}>
          New pipeline
        </button>
      </div>

      {editing ? (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <label className="field">
            <span>Name</span>
            <input
              className="text-input"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>

          <p className="field-label">Steps</p>
          {editing.steps.length ? (
            <div className="result-list">
              {editing.steps.map((step, i) => (
                <div key={i} className="result-row">
                  <span className="pill">{i + 1}</span>
                  <span style={{ flex: 1 }}>{titleForStep(step)}</span>
                  <button
                    type="button"
                    className="btn-ghost"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => {
                      const steps = [...editing.steps]
                      ;[steps[i - 1], steps[i]] = [steps[i], steps[i - 1]]
                      setEditing({ ...editing, steps })
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    aria-label="Remove step"
                    onClick={() => setEditing({ ...editing, steps: editing.steps.filter((_, j) => j !== i) })}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Add tools below, in the order you want to visit them.</p>
          )}

          <label className="field">
            <span>Add a step</span>
            <select
              className="text-input"
              value=""
              onChange={(e) => {
                if (!e.target.value) return
                setEditing({ ...editing, steps: [...editing.steps, { toolId: e.target.value }] })
                e.target.value = ''
              }}
            >
              <option value="">Choose a tool…</option>
              {CATEGORIES.map((category) => (
                <optgroup key={category} label={category}>
                  {tools
                    .filter((t) => t.category === category)
                    .map((tool) => (
                      <option key={tool.id} value={tool.id}>
                        {tool.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!editing.steps.length || !editing.name.trim()}
              onClick={() => void save(editing)}
            >
              Save pipeline
            </button>
            <button type="button" className="btn" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {list.length ? (
        <div className="grid-tools" style={{ marginTop: '1.2rem' }}>
          {list.map((pipeline) => {
            const missing = missingSteps(pipeline)
            return (
              <div key={pipeline.id} className="panel">
                <p className="field-label">{pipeline.name}</p>
                <ol className="run-steps">
                  {pipeline.steps.map((step, i) => (
                    <li key={i}>{titleForStep(step)}</li>
                  ))}
                </ol>
                {missing.length ? (
                  <p className="status-bad">Missing tools: {missing.join(', ')}</p>
                ) : null}
                <div className="pill-row">
                  <span className="pill">{pipeline.steps.length} steps</span>
                  <span className="pill">{pipeline.runs} runs</span>
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!pipeline.steps.length || missing.length > 0}
                    onClick={() => void run(pipeline)}
                  >
                    Run
                  </button>
                  <button type="button" className="btn" onClick={() => setEditing(pipeline)}>
                    Edit
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => void remove(pipeline)}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="muted" style={{ marginTop: '1rem' }}>
          No pipelines yet. A common one: <strong>Image metadata → Resize &amp; compress → Clipboard download</strong>{' '}
          for cleaning a photo before uploading it somewhere.
        </p>
      )}

      {status ? <p className="status-ok">{status}</p> : null}

      <p className="hint" style={{ marginTop: '1.2rem' }}>
        A pipeline stores the route, not your files. Running one takes you through each tool in turn with the
        previous result handed forward, so nothing is processed out of sight.
      </p>

      {list.length ? (
        <div className="row" style={{ marginTop: '0.8rem' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              void savePipelines([]).then(() => {
                const old = list
                setList([])
                undo.push({
                  label: `Deleted all ${old.length} pipelines`,
                  undo: async () => {
                    await savePipelines(old)
                    setList(old)
                  },
                })
              })
            }}
          >
            Delete all
          </button>
        </div>
      ) : null}
    </ToolLayout>
  )
}
