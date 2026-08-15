import { toNumber, type Table } from './table'

export type ChartKind = 'bar' | 'groupedBar' | 'line' | 'area' | 'scatter' | 'pie' | 'donut'

export type ChartSpec = {
  kind: ChartKind
  labelColumn: number
  valueColumns: number[]
  title: string
  width: number
  height: number
  showGrid: boolean
  showLegend: boolean
  showValues: boolean
}

export type Series = { name: string; values: (number | null)[] }

export type ChartData = {
  labels: string[]
  series: Series[]
}

/**
 * Categorical palette. Hues are spaced far enough apart to stay distinct, and
 * each holds its lightness so the set reads evenly in light and dark themes.
 */
export const PALETTE = [
  '#0d8a78',
  '#7c3aed',
  '#c2610a',
  '#2563eb',
  '#b52d6b',
  '#3f7d1f',
  '#0e7490',
  '#a13a3a',
]

export function chartData(table: Table, spec: ChartSpec): ChartData {
  const labels = table.rows.map((row, i) => (row[spec.labelColumn] ?? `Row ${i + 1}`).trim() || `Row ${i + 1}`)
  const series = spec.valueColumns.map((col) => ({
    name: table.headers[col] ?? `Column ${col + 1}`,
    values: table.rows.map((row) => toNumber(row[col] ?? '')),
  }))
  return { labels, series }
}

function niceStep(range: number, targetTicks: number): number {
  if (range <= 0) return 1
  const rough = range / targetTicks
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

/** Axis bounds rounded out to readable tick values. */
export function axisBounds(values: number[]): { min: number; max: number; step: number } {
  const finite = values.filter((v) => Number.isFinite(v))
  if (!finite.length) return { min: 0, max: 1, step: 1 }
  let min = Math.min(...finite, 0)
  let max = Math.max(...finite, 0)
  if (min === max) {
    max = min + 1
  }
  const step = niceStep(max - min, 5)
  min = Math.floor(min / step) * step
  max = Math.ceil(max / step) * step
  return { min, max, step }
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return ''
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2)
}

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

type Layout = {
  left: number
  right: number
  top: number
  bottom: number
  plotW: number
  plotH: number
}

function layoutOf(spec: ChartSpec): Layout {
  const left = 56
  const right = 16
  const top = spec.title ? 44 : 20
  const bottom = spec.showLegend ? 62 : 42
  return {
    left,
    right,
    top,
    bottom,
    plotW: spec.width - left - right,
    plotH: spec.height - top - bottom,
  }
}

function legendSvg(spec: ChartSpec, data: ChartData): string {
  if (!spec.showLegend) return ''
  const y = spec.height - 18
  let x = layoutOf(spec).left
  const parts: string[] = []
  data.series.forEach((s, i) => {
    parts.push(
      `<rect x="${x}" y="${y - 9}" width="10" height="10" rx="2" fill="${PALETTE[i % PALETTE.length]}"/>`,
      `<text x="${x + 15}" y="${y}" class="lg">${esc(s.name)}</text>`,
    )
    x += 22 + s.name.length * 6.6
  })
  return parts.join('')
}

function gridSvg(spec: ChartSpec, l: Layout, bounds: { min: number; max: number; step: number }): string {
  const parts: string[] = []
  for (let v = bounds.min; v <= bounds.max + 1e-9; v += bounds.step) {
    const y = l.top + l.plotH - ((v - bounds.min) / (bounds.max - bounds.min)) * l.plotH
    if (spec.showGrid) {
      parts.push(`<line x1="${l.left}" y1="${y.toFixed(2)}" x2="${l.left + l.plotW}" y2="${y.toFixed(2)}" class="gr"/>`)
    }
    parts.push(`<text x="${l.left - 8}" y="${(y + 4).toFixed(2)}" class="ax" text-anchor="end">${fmt(v)}</text>`)
  }
  return parts.join('')
}

function xLabelsSvg(l: Layout, labels: string[], spec: ChartSpec): string {
  const slot = l.plotW / Math.max(1, labels.length)
  // Thin the labels out rather than letting them overlap into mush.
  const stride = Math.max(1, Math.ceil((labels.length * 52) / l.plotW))
  return labels
    .map((label, i) => {
      if (i % stride !== 0) return ''
      const x = l.left + slot * (i + 0.5)
      const text = label.length > 12 ? `${label.slice(0, 11)}…` : label
      return `<text x="${x.toFixed(2)}" y="${spec.height - (spec.showLegend ? 46 : 22)}" class="ax" text-anchor="middle">${esc(text)}</text>`
    })
    .join('')
}

function barsSvg(spec: ChartSpec, data: ChartData, l: Layout, bounds: { min: number; max: number }): string {
  const groups = data.labels.length
  const slot = l.plotW / Math.max(1, groups)
  const count = spec.kind === 'groupedBar' ? data.series.length : 1
  const inner = slot * 0.72
  const barW = inner / count
  const zeroY = l.top + l.plotH - ((0 - bounds.min) / (bounds.max - bounds.min)) * l.plotH
  const parts: string[] = []

  data.series.slice(0, count).forEach((s, si) => {
    s.values.forEach((value, i) => {
      if (value == null) return
      const y = l.top + l.plotH - ((value - bounds.min) / (bounds.max - bounds.min)) * l.plotH
      const x = l.left + slot * i + (slot - inner) / 2 + barW * si
      const top = Math.min(y, zeroY)
      const height = Math.max(1, Math.abs(zeroY - y))
      parts.push(
        `<rect x="${x.toFixed(2)}" y="${top.toFixed(2)}" width="${Math.max(1, barW - 2).toFixed(2)}" height="${height.toFixed(2)}" rx="2" fill="${PALETTE[si % PALETTE.length]}"/>`,
      )
      if (spec.showValues && count === 1) {
        parts.push(
          `<text x="${(x + barW / 2).toFixed(2)}" y="${(top - 4).toFixed(2)}" class="vl" text-anchor="middle">${fmt(value)}</text>`,
        )
      }
    })
  })
  return parts.join('')
}

function linePath(values: (number | null)[], l: Layout, bounds: { min: number; max: number }): string {
  const slot = l.plotW / Math.max(1, values.length)
  let d = ''
  let open = false
  values.forEach((value, i) => {
    if (value == null) {
      // A gap in the data should break the line, not interpolate across it.
      open = false
      return
    }
    const x = l.left + slot * (i + 0.5)
    const y = l.top + l.plotH - ((value - bounds.min) / (bounds.max - bounds.min)) * l.plotH
    d += `${open ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
    open = true
  })
  return d
}

function linesSvg(spec: ChartSpec, data: ChartData, l: Layout, bounds: { min: number; max: number }): string {
  const slot = l.plotW / Math.max(1, data.labels.length)
  const zeroY = l.top + l.plotH - ((0 - bounds.min) / (bounds.max - bounds.min)) * l.plotH
  const parts: string[] = []
  data.series.forEach((s, si) => {
    const color = PALETTE[si % PALETTE.length]
    const d = linePath(s.values, l, bounds)
    if (!d) return
    if (spec.kind === 'area') {
      const first = s.values.findIndex((v) => v != null)
      const last = s.values.length - 1 - [...s.values].reverse().findIndex((v) => v != null)
      if (first >= 0) {
        const x0 = l.left + slot * (first + 0.5)
        const x1 = l.left + slot * (last + 0.5)
        parts.push(
          `<path d="${d}L${x1.toFixed(2)} ${zeroY.toFixed(2)}L${x0.toFixed(2)} ${zeroY.toFixed(2)}Z" fill="${color}" fill-opacity="0.18"/>`,
        )
      }
    }
    parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`)
    s.values.forEach((value, i) => {
      if (value == null) return
      const x = l.left + slot * (i + 0.5)
      const y = l.top + l.plotH - ((value - bounds.min) / (bounds.max - bounds.min)) * l.plotH
      parts.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3" fill="${color}"/>`)
    })
  })
  return parts.join('')
}

function scatterSvg(data: ChartData, l: Layout, bounds: { min: number; max: number }): string {
  const slot = l.plotW / Math.max(1, data.labels.length)
  return data.series
    .flatMap((s, si) =>
      s.values.map((value, i) => {
        if (value == null) return ''
        const x = l.left + slot * (i + 0.5)
        const y = l.top + l.plotH - ((value - bounds.min) / (bounds.max - bounds.min)) * l.plotH
        return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5" fill="${PALETTE[si % PALETTE.length]}" fill-opacity="0.75"/>`
      }),
    )
    .join('')
}

function pieSvg(spec: ChartSpec, data: ChartData): string {
  const series = data.series[0]
  if (!series) return ''
  const values = series.values.map((v) => (v != null && v > 0 ? v : 0))
  const total = values.reduce((a, b) => a + b, 0)
  if (total <= 0) return ''

  const cx = spec.width / 2
  const cy = spec.title ? spec.height / 2 + 8 : spec.height / 2
  const radius = Math.min(spec.width, spec.height - (spec.showLegend ? 60 : 20)) / 2 - 12
  const inner = spec.kind === 'donut' ? radius * 0.58 : 0
  const parts: string[] = []
  let angle = -Math.PI / 2

  values.forEach((value, i) => {
    if (value <= 0) return
    const sweep = (value / total) * Math.PI * 2
    const end = angle + sweep
    const large = sweep > Math.PI ? 1 : 0
    const x0 = cx + Math.cos(angle) * radius
    const y0 = cy + Math.sin(angle) * radius
    const x1 = cx + Math.cos(end) * radius
    const y1 = cy + Math.sin(end) * radius
    const color = PALETTE[i % PALETTE.length]

    if (inner) {
      const ix0 = cx + Math.cos(end) * inner
      const iy0 = cy + Math.sin(end) * inner
      const ix1 = cx + Math.cos(angle) * inner
      const iy1 = cy + Math.sin(angle) * inner
      parts.push(
        `<path d="M${x0.toFixed(2)} ${y0.toFixed(2)}A${radius} ${radius} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${ix0.toFixed(2)} ${iy0.toFixed(2)}A${inner} ${inner} 0 ${large} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)}Z" fill="${color}"/>`,
      )
    } else {
      parts.push(
        `<path d="M${cx} ${cy}L${x0.toFixed(2)} ${y0.toFixed(2)}A${radius} ${radius} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z" fill="${color}"/>`,
      )
    }

    if (spec.showValues) {
      const mid = angle + sweep / 2
      const lr = inner ? (radius + inner) / 2 : radius * 0.68
      parts.push(
        `<text x="${(cx + Math.cos(mid) * lr).toFixed(2)}" y="${(cy + Math.sin(mid) * lr + 4).toFixed(2)}" class="pv" text-anchor="middle">${Math.round((value / total) * 100)}%</text>`,
      )
    }
    angle = end
  })
  return parts.join('')
}

const STYLE = `<style>
.ax{font:11px system-ui,sans-serif;fill:#5c706d}
.lg{font:11px system-ui,sans-serif;fill:#5c706d}
.vl{font:10px system-ui,sans-serif;fill:#5c706d}
.pv{font:11px system-ui,sans-serif;fill:#fff;font-weight:600}
.ti{font:600 15px system-ui,sans-serif;fill:#10201f}
.gr{stroke:#dbe4e2;stroke-width:1}
.ai{stroke:#c4d2cf;stroke-width:1}
</style>`

export function chartSvg(table: Table, spec: ChartSpec): string {
  const data = chartData(table, spec)
  const l = layoutOf(spec)
  const head = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}" role="img">`,
    STYLE,
    `<rect width="${spec.width}" height="${spec.height}" fill="#ffffff"/>`,
    spec.title ? `<text x="${l.left}" y="26" class="ti">${esc(spec.title)}</text>` : '',
  ]

  if (spec.kind === 'pie' || spec.kind === 'donut') {
    return [...head, pieSvg(spec, data), legendSvg(spec, data), '</svg>'].join('')
  }

  const all = data.series.flatMap((s) => s.values.filter((v): v is number => v != null))
  const bounds = axisBounds(all)
  const zeroY = l.top + l.plotH - ((0 - bounds.min) / (bounds.max - bounds.min)) * l.plotH

  const body =
    spec.kind === 'bar' || spec.kind === 'groupedBar'
      ? barsSvg(spec, data, l, bounds)
      : spec.kind === 'scatter'
        ? scatterSvg(data, l, bounds)
        : linesSvg(spec, data, l, bounds)

  return [
    ...head,
    gridSvg(spec, l, bounds),
    body,
    `<line x1="${l.left}" y1="${zeroY.toFixed(2)}" x2="${l.left + l.plotW}" y2="${zeroY.toFixed(2)}" class="ai"/>`,
    `<line x1="${l.left}" y1="${l.top}" x2="${l.left}" y2="${l.top + l.plotH}" class="ai"/>`,
    xLabelsSvg(l, data.labels, spec),
    legendSvg(spec, data),
    '</svg>',
  ].join('')
}

export async function svgToPng(svg: string, scale = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not rasterize the chart.'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth * scale
    canvas.height = img.naturalHeight * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed.'))), 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
