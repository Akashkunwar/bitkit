import { tools, type ToolMeta } from '../registry'
import { setHandoff, suggestPath } from './handoff'
import { filesFromPaste } from './clipboard'

/**
 * Things the command palette can *do*, not just navigate to.
 *
 * An action either runs immediately or hands off to a tool with a preset
 * applied, so "paste and compress to 450 KB" is one keystroke instead of four
 * clicks. Presets travel through the same handoff channel Send-to uses.
 */

export type ActionContext = {
  navigate: (path: string) => void
  setTheme: (theme: 'light' | 'dark') => void
  currentTheme: 'light' | 'dark'
  openCheatsheet: () => void
  notify: (message: string) => void
}

export type Action = {
  id: string
  label: string
  hint?: string
  group: string
  keywords: string
  run: (ctx: ActionContext) => void | Promise<void>
}

/** Presets that a tool reads out of the handoff and applies on arrival. */
export type Preset = Record<string, unknown>

const PRESET_KEY = 'bitkit-preset'

export function setPreset(toolId: string, preset: Preset): void {
  try {
    sessionStorage.setItem(PRESET_KEY, JSON.stringify({ toolId, preset }))
  } catch {
    /* private mode */
  }
}

export function takePreset(toolId: string): Preset | null {
  try {
    const raw = sessionStorage.getItem(PRESET_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { toolId: string; preset: Preset }
    if (parsed.toolId !== toolId) return null
    sessionStorage.removeItem(PRESET_KEY)
    return parsed.preset
  } catch {
    return null
  }
}

function go(tool: ToolMeta, preset?: Preset) {
  return (ctx: ActionContext) => {
    if (preset) setPreset(tool.id, preset)
    ctx.navigate(tool.path)
  }
}

function toolById(id: string): ToolMeta | undefined {
  return tools.find((t) => t.id === id)
}

/** Reads the clipboard, then routes the image to a tool with a preset. */
async function pasteInto(ctx: ActionContext, toolId: string, preset?: Preset): Promise<void> {
  const tool = toolById(toolId)
  if (!tool) return
  try {
    // A synthetic event: filesFromPaste falls back to the async clipboard API.
    const files = await filesFromPaste(new ClipboardEvent('paste'))
    if (!files.length) {
      ctx.notify('No image on the clipboard. Copy one first, then try again.')
      return
    }
    if (preset) setPreset(tool.id, preset)
    setHandoff({ files, from: 'palette' })
    ctx.navigate(tool.path)
  } catch {
    ctx.notify('This browser would not let BitKit read the clipboard. Paste directly into the tool instead.')
  }
}

export function buildActions(): Action[] {
  const list: Action[] = []
  const add = (action: Action) => list.push(action)

  // --- image presets ---
  const compress = toolById('compress')
  if (compress) {
    for (const kb of [450, 300, 200, 100]) {
      add({
        id: `compress-${kb}`,
        label: `Compress an image to ${kb} KB`,
        hint: 'Resize & compress',
        group: 'Images',
        keywords: `compress resize shrink kb size ${kb} form portal upload`,
        run: go(compress, { maxBytes: `${kb}kb` }),
      })
    }
    add({
      id: 'paste-compress-450',
      label: 'Paste and compress to 450 KB',
      hint: 'Reads your clipboard',
      group: 'Images',
      keywords: 'paste clipboard compress 450 form portal screenshot',
      run: (ctx) => pasteInto(ctx, 'compress', { maxBytes: '450kb' }),
    })
    add({
      id: 'paste-download',
      label: 'Paste an image and save it',
      hint: 'Clipboard download',
      group: 'Images',
      keywords: 'paste clipboard save screenshot download',
      run: (ctx) => pasteInto(ctx, 'clipboard'),
    })
  }

  const passport = toolById('passport')
  if (passport) {
    add({
      id: 'passport-sheet',
      label: 'Make a passport photo sheet',
      hint: '600×600 tiled for printing',
      group: 'Images',
      keywords: 'passport visa photo print sheet id',
      run: go(passport),
    })
  }

  const exif = toolById('exif')
  if (exif) {
    add({
      id: 'strip-metadata',
      label: 'Strip location and metadata from a photo',
      hint: 'Image metadata',
      group: 'Images',
      keywords: 'exif gps location privacy strip metadata remove',
      run: go(exif),
    })
  }

  // --- documents ---
  const shrink = toolById('shrink')
  if (shrink) {
    for (const target of ['2mb', '1mb', '500kb']) {
      add({
        id: `shrink-${target}`,
        label: `Shrink a PDF under ${target.toUpperCase()}`,
        hint: 'PDF shrink',
        group: 'Documents',
        keywords: `pdf shrink compress smaller upload limit ${target}`,
        run: go(shrink, { limit: target }),
      })
    }
  }

  const pages = toolById('pages')
  if (pages) {
    add({
      id: 'merge-pdfs',
      label: 'Merge several PDFs into one',
      hint: 'PDF merge & split',
      group: 'Documents',
      keywords: 'merge combine join pdf together',
      run: go(pages),
    })
  }

  // --- developer ---
  const password = toolById('password')
  if (password) {
    add({
      id: 'password-strong',
      label: 'Generate a strong password',
      group: 'Developer',
      keywords: 'password generate random secure strong',
      run: go(password, { mode: 'password', length: 24 }),
    })
    add({
      id: 'uuid',
      label: 'Generate a UUID',
      hint: 'Password generator',
      group: 'Developer',
      keywords: 'uuid guid identifier random token',
      run: go(password, { mode: 'token', tokenFormat: 'uuid' }),
    })
  }

  const json = toolById('json')
  if (json) {
    add({
      id: 'format-json',
      label: 'Format and validate JSON',
      group: 'Developer',
      keywords: 'json format pretty validate lint parse',
      run: go(json),
    })
  }

  // --- app ---
  add({
    id: 'theme-toggle',
    label: 'Switch theme',
    hint: 'Light and dark',
    group: 'BitKit',
    keywords: 'theme dark light mode appearance night',
    run: (ctx) => ctx.setTheme(ctx.currentTheme === 'dark' ? 'light' : 'dark'),
  })
  add({
    id: 'shortcuts',
    label: 'Show keyboard shortcuts',
    hint: 'Or press ?',
    group: 'BitKit',
    keywords: 'shortcuts keyboard keys chords help cheatsheet',
    run: (ctx) => ctx.openCheatsheet(),
  })
  const settings = toolById('settings')
  if (settings) {
    add({
      id: 'backup',
      label: 'Back up everything to a file',
      hint: 'Notes, pins, and settings',
      group: 'BitKit',
      keywords: 'backup export save data notes settings restore',
      run: go(settings),
    })
  }
  const pipelines = toolById('pipelines')
  if (pipelines) {
    add({
      id: 'pipelines',
      label: 'Run a saved pipeline',
      group: 'BitKit',
      keywords: 'pipeline recipe chain workflow automation steps',
      run: go(pipelines),
    })
  }

  return list
}

export const ACTIONS: Action[] = buildActions()

export function searchActions(query: string, list: Action[] = ACTIONS): Action[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return list
    .map((action) => {
      const label = action.label.toLowerCase()
      let score = 0
      if (label.startsWith(q)) score = 90
      else if (label.includes(q)) score = 70
      else if (action.keywords.includes(q)) score = 40
      return { action, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.action)
}

export function suggestForFiles(files: File[]): string {
  return suggestPath(files)
}
