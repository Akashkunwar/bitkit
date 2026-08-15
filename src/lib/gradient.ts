export type GradientStop = {
  id: string
  color: string
  /** 0–100 */
  position: number
}

export type GradientType = 'linear' | 'radial' | 'conic' | 'mesh'

export type MeshBlob = {
  id: string
  color: string
  /** 0–100 viewport coordinates */
  x: number
  y: number
  /** radius as % of viewport */
  radius: number
}

export type GradientState = {
  type: GradientType
  angle: number
  radialShape: 'circle' | 'ellipse'
  radialPosition: string
  stops: GradientStop[]
  meshBackground: string
  meshBlobs: MeshBlob[]
}

let counter = 0
export function uid(): string {
  counter += 1
  return `g${Date.now().toString(36)}${counter}`
}

export function defaultGradient(): GradientState {
  return {
    type: 'linear',
    angle: 135,
    radialShape: 'circle',
    radialPosition: 'center',
    stops: [
      { id: uid(), color: '#0d8a78', position: 0 },
      { id: uid(), color: '#7c3aed', position: 100 },
    ],
    meshBackground: '#0d1413',
    meshBlobs: [
      { id: uid(), color: '#0d8a78', x: 20, y: 25, radius: 55 },
      { id: uid(), color: '#7c3aed', x: 80, y: 30, radius: 50 },
      { id: uid(), color: '#2563eb', x: 55, y: 85, radius: 60 },
    ],
  }
}

function stopList(stops: GradientStop[]): string {
  return [...stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${s.position}%`)
    .join(', ')
}

export function gradientCss(state: GradientState): string {
  if (state.type === 'linear') return `linear-gradient(${state.angle}deg, ${stopList(state.stops)})`
  if (state.type === 'radial')
    return `radial-gradient(${state.radialShape} at ${state.radialPosition}, ${stopList(state.stops)})`
  if (state.type === 'conic') return `conic-gradient(from ${state.angle}deg at ${state.radialPosition}, ${stopList(state.stops)})`
  const layers = state.meshBlobs.map(
    (b) => `radial-gradient(circle at ${b.x}% ${b.y}%, ${b.color} 0%, transparent ${b.radius}%)`,
  )
  return [...layers, state.meshBackground].join(', ')
}

export function gradientCssRule(state: GradientState): string {
  if (state.type === 'mesh') {
    const layers = state.meshBlobs
      .map((b) => `    radial-gradient(circle at ${b.x}% ${b.y}%, ${b.color} 0%, transparent ${b.radius}%)`)
      .join(',\n')
    return `background-color: ${state.meshBackground};\nbackground-image:\n${layers};`
  }
  return `background-image: ${gradientCss(state)};`
}


const POSITION_FRACTIONS: Record<string, number> = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 }

/** Maps a CSS position keyword pair ("center", "top left") to 0–1 fractions. */
function positionFractions(position: string): { cx: number; cy: number } {
  const words = position.trim().toLowerCase().split(/\s+/).filter(Boolean)
  let cx = 0.5
  let cy = 0.5
  for (const word of words) {
    if (word === 'left' || word === 'right') cx = POSITION_FRACTIONS[word]
    else if (word === 'top' || word === 'bottom') cy = POSITION_FRACTIONS[word]
    else if (word.endsWith('%')) {
      const value = Number.parseFloat(word) / 100
      if (Number.isFinite(value)) {
        if (words.indexOf(word) === 0) cx = value
        else cy = value
      }
    }
  }
  if (words.length === 1 && (words[0] === 'left' || words[0] === 'right')) cy = 0.5
  return { cx, cy }
}

function sampleStops(stops: GradientStop[], t: number): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  if (!sorted.length) return '#000000'
  const pct = t * 100
  if (pct <= sorted[0].position) return sorted[0].color
  if (pct >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].color
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (pct >= a.position && pct <= b.position) {
      const span = b.position - a.position
      return mixHex(a.color, b.color, span === 0 ? 0 : (pct - a.position) / span)
    }
  }
  return sorted[sorted.length - 1].color
}

function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const m = hex.replace('#', '')
    const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0)
  }
  const [r1, g1, b1] = parse(a)
  const [r2, g2, b2] = parse(b)
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${mix(r1, r2)}${mix(g1, g2)}${mix(b1, b2)}`
}

/**
 * SVG has no conic primitive, so approximate it with flat-shaded wedges.
 * 180 slices is past the point where banding is visible at export sizes.
 */
function conicSvg(state: GradientState, width: number, height: number): string {
  const slices = 180
  const { cx, cy } = positionFractions(state.radialPosition)
  const ox = cx * width
  const oy = cy * height
  const reach = Math.hypot(Math.max(ox, width - ox), Math.max(oy, height - oy)) * 1.02
  const start = ((state.angle - 90) * Math.PI) / 180
  const wedges: string[] = []
  for (let i = 0; i < slices; i += 1) {
    const a0 = start + (i / slices) * Math.PI * 2
    const a1 = start + ((i + 1.5) / slices) * Math.PI * 2
    const x0 = (ox + Math.cos(a0) * reach).toFixed(2)
    const y0 = (oy + Math.sin(a0) * reach).toFixed(2)
    const x1 = (ox + Math.cos(a1) * reach).toFixed(2)
    const y1 = (oy + Math.sin(a1) * reach).toFixed(2)
    const color = sampleStops(state.stops, (i + 0.5) / slices)
    wedges.push(`  <path d="M${ox.toFixed(2)} ${oy.toFixed(2)} L${x0} ${y0} L${x1} ${y1} Z" fill="${color}"/>`)
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <clipPath id="c"><rect width="${width}" height="${height}"/></clipPath>`,
    '  <g clip-path="url(#c)">',
    ...wedges,
    '  </g>',
    '</svg>',
  ].join('\n')
}

export function gradientSvg(state: GradientState, width = 800, height = 600): string {
  const sorted = [...state.stops].sort((a, b) => a.position - b.position)
  const stopsXml = sorted
    .map((s) => `    <stop offset="${s.position}%" stop-color="${s.color}"/>`)
    .join('\n')

  if (state.type === 'linear') {
    const rad = ((state.angle - 90) * Math.PI) / 180
    const x = Math.cos(rad) * 0.5
    const y = Math.sin(rad) * 0.5
    const attrs = `x1="${(0.5 - x).toFixed(4)}" y1="${(0.5 - y).toFixed(4)}" x2="${(0.5 + x).toFixed(4)}" y2="${(0.5 + y).toFixed(4)}"`
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `  <defs><linearGradient id="g" ${attrs}>`,
      stopsXml,
      '  </linearGradient></defs>',
      `  <rect width="${width}" height="${height}" fill="url(#g)"/>`,
      '</svg>',
    ].join('\n')
  }

  if (state.type === 'radial') {
    const { cx, cy } = positionFractions(state.radialPosition)
    // A circle keeps one radius; an ellipse stretches to the box, which is what
    // the CSS keyword does, so mirror it with a gradientTransform.
    const shape =
      state.radialShape === 'circle'
        ? `cx="${(cx * 100).toFixed(2)}%" cy="${(cy * 100).toFixed(2)}%" r="70%"`
        : `cx="${(cx * 100).toFixed(2)}%" cy="${(cy * 100).toFixed(2)}%" r="70%" gradientTransform="translate(${cx.toFixed(4)} ${cy.toFixed(4)}) scale(1 ${(height / width).toFixed(4)}) translate(${(-cx).toFixed(4)} ${(-cy).toFixed(4)})"`
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `  <defs><radialGradient id="g" ${shape}>`,
      stopsXml,
      '  </radialGradient></defs>',
      `  <rect width="${width}" height="${height}" fill="url(#g)"/>`,
      '</svg>',
    ].join('\n')
  }

  if (state.type === 'conic') {
    return conicSvg(state, width, height)
  }

  if (state.type === 'mesh') {
    const defs = state.meshBlobs
      .map(
        (b, i) =>
          `    <radialGradient id="m${i}" cx="${b.x}%" cy="${b.y}%" r="${b.radius}%"><stop offset="0%" stop-color="${b.color}"/><stop offset="100%" stop-color="${b.color}" stop-opacity="0"/></radialGradient>`,
      )
      .join('\n')
    const rects = state.meshBlobs
      .map((_, i) => `  <rect width="${width}" height="${height}" fill="url(#m${i})"/>`)
      .join('\n')
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `  <defs>\n${defs}\n  </defs>`,
      `  <rect width="${width}" height="${height}" fill="${state.meshBackground}"/>`,
      rects,
      '</svg>',
    ].join('\n')
  }

  return ''
}
