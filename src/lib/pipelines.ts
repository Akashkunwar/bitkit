import { getPref, setPref } from './db'
import { tools } from '../registry'

/**
 * A pipeline is a saved sequence of tools to walk a file through — the
 * Send-to hop you keep repeating, recorded once and replayed.
 *
 * It stores the route, not the data: running a pipeline steps you through each
 * tool with the previous result handed forward, so nothing is ever processed
 * out of sight.
 */

const KEY = 'pipelines'

export type PipelineStep = {
  toolId: string
  /** Free-text reminder shown when the step comes up. */
  note?: string
}

export type Pipeline = {
  id: string
  name: string
  steps: PipelineStep[]
  createdAt: number
  runs: number
}

export type RunState = {
  pipelineId: string
  index: number
  startedAt: number
}

const RUN_KEY = 'bitkit-pipeline-run'

export function newPipeline(name = 'New pipeline'): Pipeline {
  return { id: crypto.randomUUID(), name, steps: [], createdAt: Date.now(), runs: 0 }
}

export async function listPipelines(): Promise<Pipeline[]> {
  const stored = await getPref<Pipeline[]>(KEY, [])
  return stored.filter((p) => p && Array.isArray(p.steps))
}

export async function savePipelines(list: Pipeline[]): Promise<void> {
  await setPref(KEY, list)
}

export async function upsertPipeline(pipeline: Pipeline): Promise<Pipeline[]> {
  const list = await listPipelines()
  const index = list.findIndex((p) => p.id === pipeline.id)
  const next = index >= 0 ? list.map((p) => (p.id === pipeline.id ? pipeline : p)) : [...list, pipeline]
  await savePipelines(next)
  return next
}

export async function deletePipeline(id: string): Promise<Pipeline[]> {
  const next = (await listPipelines()).filter((p) => p.id !== id)
  await savePipelines(next)
  return next
}

/** Steps whose tool no longer exists, so a stale pipeline fails loudly. */
export function missingSteps(pipeline: Pipeline): string[] {
  return pipeline.steps.filter((step) => !tools.some((t) => t.id === step.toolId)).map((s) => s.toolId)
}

export function pathForStep(step: PipelineStep): string | null {
  return tools.find((t) => t.id === step.toolId)?.path ?? null
}

export function titleForStep(step: PipelineStep): string {
  return tools.find((t) => t.id === step.toolId)?.title ?? `Unknown tool (${step.toolId})`
}

// --- run state, kept in sessionStorage so a reload does not lose your place ---

export function startRun(pipelineId: string): RunState {
  const state: RunState = { pipelineId, index: 0, startedAt: Date.now() }
  writeRun(state)
  return state
}

export function readRun(): RunState | null {
  try {
    const raw = sessionStorage.getItem(RUN_KEY)
    return raw ? (JSON.parse(raw) as RunState) : null
  } catch {
    return null
  }
}

export function writeRun(state: RunState | null): void {
  try {
    if (state) sessionStorage.setItem(RUN_KEY, JSON.stringify(state))
    else sessionStorage.removeItem(RUN_KEY)
  } catch {
    /* private mode */
  }
}

export function advanceRun(state: RunState): RunState {
  const next = { ...state, index: state.index + 1 }
  writeRun(next)
  return next
}

export function endRun(): void {
  writeRun(null)
}

/** Suggests a pipeline from the tools you have just moved between. */
export function suggestFromTrail(trail: string[]): PipelineStep[] {
  const steps: PipelineStep[] = []
  for (const toolId of trail) {
    if (steps[steps.length - 1]?.toolId === toolId) continue
    if (tools.some((t) => t.id === toolId)) steps.push({ toolId })
  }
  return steps
}
