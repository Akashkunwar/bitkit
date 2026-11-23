import QRCode from 'qrcode'

export const BODY_SHAPES = [
  { id: 'square', label: 'Square' },
  { id: 'round', label: 'Round' },
  { id: 'circular', label: 'Circular' },
  { id: 'dot', label: 'Dot' },
  { id: 'circle', label: 'Circle' },
  { id: 'circle-zebra', label: 'Circle rows' },
  { id: 'circle-zebra-vertical', label: 'Circle columns' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'star', label: 'Star' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'japnese', label: 'Japanese' },
  { id: 'mosaic', label: 'Mosaic' },
  { id: 'edge-cut', label: 'Edge cut' },
  { id: 'edge-cut-smooth', label: 'Smooth cut' },
  { id: 'pointed', label: 'Pointed' },
  { id: 'pointed-smooth', label: 'Pointed smooth' },
  { id: 'pointed-edge-cut', label: 'Pointed cut' },
  { id: 'pointed-in', label: 'Pointed in' },
  { id: 'pointed-in-smooth', label: 'Pointed in soft' },
  { id: 'rounded-in', label: 'Rounded in' },
  { id: 'rounded-in-smooth', label: 'Rounded in soft' },
  { id: 'rounded-pointed', label: 'Rounded point' },
] as const

export const EYE_FRAMES = [
  { id: 'frame0', label: 'Square frame' },
  { id: 'frame1', label: 'Rounded frame' },
  { id: 'frame2', label: 'Circle frame' },
  { id: 'frame3', label: 'Diamond frame' },
  { id: 'frame4', label: 'Soft frame' },
  { id: 'frame5', label: 'Extra round frame' },
  { id: 'frame6', label: 'Cut frame' },
  { id: 'frame7', label: 'Light cut frame' },
  { id: 'frame8', label: 'Squircle frame' },
  { id: 'frame10', label: 'Circle on square' },
  { id: 'frame11', label: 'Square on circle' },
  { id: 'frame12', label: 'Pointed frame' },
  { id: 'frame13', label: 'Deep round frame' },
  { id: 'frame14', label: 'Diamond circle frame' },
  { id: 'frame16', label: 'Capsule frame' },
] as const

export const EYE_BALLS = [
  { id: 'ball0', label: 'Square center' },
  { id: 'ball1', label: 'Circle center' },
  { id: 'ball2', label: 'Rounded center' },
  { id: 'ball3', label: 'Diamond center' },
  { id: 'ball5', label: 'Star center' },
  { id: 'ball6', label: 'Small circle' },
  { id: 'ball7', label: 'Leaf center' },
  { id: 'ball8', label: 'Soft square' },
  { id: 'ball10', label: 'Up triangle' },
  { id: 'ball11', label: 'Down triangle' },
  { id: 'ball12', label: 'Horizontal bar' },
  { id: 'ball13', label: 'Vertical bar' },
  { id: 'ball14', label: 'Plus' },
  { id: 'ball15', label: 'Hexagon' },
  { id: 'ball16', label: 'Octagon' },
  { id: 'ball17', label: 'Teardrop' },
  { id: 'ball18', label: 'Large circle' },
  { id: 'ball19', label: 'Rounded diamond' },
] as const

export type BodyShape = (typeof BODY_SHAPES)[number]['id']
export type EyeFrame = (typeof EYE_FRAMES)[number]['id']
export type EyeBall = (typeof EYE_BALLS)[number]['id']
export type GradientKind = 'none' | 'linear' | 'radial'
export type EcLevel = 'L' | 'M' | 'Q' | 'H'

export type QrLook = {
  body: BodyShape
  eye: EyeFrame
  ball: EyeBall
  dark: string
  light: string
  transparent: boolean
  gradient: GradientKind
  gradientTo: string
  gradientOnEyes: boolean
  customEyes: boolean
  eyeFrameColors: [string, string, string]
  eyeBallColors: [string, string, string]
  margin: number
  ecLevel: EcLevel
}

type Nb = {
  n: boolean
  e: boolean
  s: boolean
  w: boolean
  nw: boolean
  ne: boolean
  sw: boolean
  se: boolean
}

type Matrix = { size: number; get(row: number, col: number): number }

function n(value: number): string {
  return value
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')
}

function circle(x: number, y: number, r: number): string {
  const cx = x + 0.5
  const cy = y + 0.5
  return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 1 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 1 ${n(cx - r)} ${n(cy)}Z`
}

function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  if (radius <= 0) return `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`
  return `M${n(x + radius)} ${n(y)}H${n(x + w - radius)}A${n(radius)} ${n(radius)} 0 0 1 ${n(x + w)} ${n(y + radius)}V${n(y + h - radius)}A${n(radius)} ${n(radius)} 0 0 1 ${n(x + w - radius)} ${n(y + h)}H${n(x + radius)}A${n(radius)} ${n(radius)} 0 0 1 ${n(x)} ${n(y + h - radius)}V${n(y + radius)}A${n(radius)} ${n(radius)} 0 0 1 ${n(x + radius)} ${n(y)}Z`
}

function disc(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 1 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 1 ${n(cx - r)} ${n(cy)}Z`
}

function diamondBox(x: number, y: number, s: number): string {
  const m = s / 2
  return `M${n(x + m)} ${n(y)}L${n(x + s)} ${n(y + m)}L${n(x + m)} ${n(y + s)}L${n(x)} ${n(y + m)}Z`
}

function octagon(x: number, y: number, s: number, cut: number): string {
  const c = Math.min(cut, s / 2)
  return `M${n(x + c)} ${n(y)}H${n(x + s - c)}L${n(x + s)} ${n(y + c)}V${n(y + s - c)}L${n(x + s - c)} ${n(y + s)}H${n(x + c)}L${n(x)} ${n(y + s - c)}V${n(y + c)}Z`
}

function capsule(x: number, y: number, w: number, h: number): string {
  const r = h / 2
  return `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`
}

function roundCell(x: number, y: number, r: number, nb: Nb): string {
  const x1 = x + 1
  const y1 = y + 1
  const parts = [`M${n(nb.n || nb.w ? x : x + r)} ${n(y)}`]
  if (!nb.n && !nb.e) parts.push(`H${n(x1 - r)}Q${n(x1)} ${n(y)} ${n(x1)} ${n(y + r)}`)
  else parts.push(`H${n(x1)}`)
  if (!nb.e && !nb.s) parts.push(`V${n(y1 - r)}Q${n(x1)} ${n(y1)} ${n(x1 - r)} ${n(y1)}`)
  else parts.push(`V${n(y1)}`)
  if (!nb.s && !nb.w) parts.push(`H${n(x + r)}Q${n(x)} ${n(y1)} ${n(x)} ${n(y1 - r)}`)
  else parts.push(`H${n(x)}`)
  if (!nb.w && !nb.n) parts.push(`V${n(y + r)}Q${n(x)} ${n(y)} ${n(x + r)} ${n(y)}`)
  else parts.push(`V${n(y)}`)
  parts.push('Z')
  return parts.join('')
}

function classyCell(x: number, y: number, cut: number, smooth: boolean, nb: Nb): string {
  const x1 = x + 1
  const y1 = y + 1
  const amount = (openA: boolean, openB: boolean, diagonal: boolean) =>
    !openA && !openB ? cut : diagonal ? cut * 0.55 : 0
  const tl = amount(nb.n, nb.w, !nb.nw)
  const tr = amount(nb.n, nb.e, !nb.ne)
  const br = amount(nb.s, nb.e, !nb.se)
  const bl = amount(nb.s, nb.w, !nb.sw)
  if (!smooth) {
    return `M${n(x + tl)} ${n(y)}H${n(x1 - tr)}L${n(x1)} ${n(y + tr)}V${n(y1 - br)}L${n(x1 - br)} ${n(y1)}H${n(x + bl)}L${n(x)} ${n(y1 - bl)}V${n(y + tl)}Z`
  }
  return `M${n(x + tl)} ${n(y)}H${n(x1 - tr)}Q${n(x1)} ${n(y)} ${n(x1)} ${n(y + tr)}V${n(y1 - br)}Q${n(x1)} ${n(y1)} ${n(x1 - br)} ${n(y1)}H${n(x + bl)}Q${n(x)} ${n(y1)} ${n(x)} ${n(y1 - bl)}V${n(y + tl)}Q${n(x)} ${n(y)} ${n(x + tl)} ${n(y)}Z`
}

function edgeCut(x: number, y: number, cut: number, smooth: boolean): string {
  if (smooth)
    return `M${n(x)} ${n(y)}H${n(x + 1 - cut)}Q${n(x + 1)} ${n(y)} ${n(x + 1)} ${n(y + cut)}V${n(y + 1)}H${n(x)}Z`
  return `M${n(x)} ${n(y)}H${n(x + 1 - cut)}L${n(x + 1)} ${n(y + cut)}V${n(y + 1)}H${n(x)}Z`
}

function curvedDiamond(x: number, y: number): string {
  return `M${n(x + 0.5)} ${n(y)}Q${n(x + 0.88)} ${n(y + 0.12)} ${n(x + 1)} ${n(y + 0.5)}Q${n(x + 0.88)} ${n(y + 0.88)} ${n(x + 0.5)} ${n(y + 1)}Q${n(x + 0.12)} ${n(y + 0.88)} ${n(x)} ${n(y + 0.5)}Q${n(x + 0.12)} ${n(y + 0.12)} ${n(x + 0.5)} ${n(y)}Z`
}

function inward(x: number, y: number, smooth: boolean): string {
  if (!smooth) {
    return `M${n(x + 0.28)} ${n(y)}H${n(x + 0.72)}L${n(x + 1)} ${n(y + 0.28)}L${n(x + 0.78)} ${n(y + 0.5)}L${n(x + 1)} ${n(y + 0.72)}L${n(x + 0.72)} ${n(y + 1)}H${n(x + 0.28)}L${n(x)} ${n(y + 0.72)}L${n(x + 0.22)} ${n(y + 0.5)}L${n(x)} ${n(y + 0.28)}Z`
  }
  return `M${n(x + 0.3)} ${n(y)}H${n(x + 0.7)}Q${n(x + 0.78)} ${n(y + 0.22)} ${n(x + 1)} ${n(y + 0.3)}Q${n(x + 0.78)} ${n(y + 0.5)} ${n(x + 1)} ${n(y + 0.7)}Q${n(x + 0.78)} ${n(y + 0.78)} ${n(x + 0.7)} ${n(y + 1)}H${n(x + 0.3)}Q${n(x + 0.22)} ${n(y + 0.78)} ${n(x)} ${n(y + 0.7)}Q${n(x + 0.22)} ${n(y + 0.5)} ${n(x)} ${n(y + 0.3)}Q${n(x + 0.22)} ${n(y + 0.22)} ${n(x + 0.3)} ${n(y)}Z`
}

function leaf(x: number, y: number, turn: number): string {
  const tips = [
    `M${n(x + 0.5)} ${n(y)}Q${n(x + 1)} ${n(y + 0.2)} ${n(x + 0.82)} ${n(y + 0.72)}Q${n(x + 0.68)} ${n(y + 1)} ${n(x + 0.5)} ${n(y + 1)}Q${n(x + 0.32)} ${n(y + 1)} ${n(x + 0.18)} ${n(y + 0.72)}Q${n(x)} ${n(y + 0.2)} ${n(x + 0.5)} ${n(y)}Z`,
    `M${n(x + 1)} ${n(y + 0.5)}Q${n(x + 0.8)} ${n(y + 1)} ${n(x + 0.28)} ${n(y + 0.82)}Q${n(x)} ${n(y + 0.68)} ${n(x)} ${n(y + 0.5)}Q${n(x)} ${n(y + 0.32)} ${n(x + 0.28)} ${n(y + 0.18)}Q${n(x + 0.8)} ${n(y)} ${n(x + 1)} ${n(y + 0.5)}Z`,
    `M${n(x + 0.5)} ${n(y + 1)}Q${n(x)} ${n(y + 0.8)} ${n(x + 0.18)} ${n(y + 0.28)}Q${n(x + 0.32)} ${n(y)} ${n(x + 0.5)} ${n(y)}Q${n(x + 0.68)} ${n(y)} ${n(x + 0.82)} ${n(y + 0.28)}Q${n(x + 1)} ${n(y + 0.8)} ${n(x + 0.5)} ${n(y + 1)}Z`,
    `M${n(x)} ${n(y + 0.5)}Q${n(x + 0.2)} ${n(y)} ${n(x + 0.72)} ${n(y + 0.18)}Q${n(x + 1)} ${n(y + 0.32)} ${n(x + 1)} ${n(y + 0.5)}Q${n(x + 1)} ${n(y + 0.68)} ${n(x + 0.72)} ${n(y + 0.82)}Q${n(x + 0.2)} ${n(y + 1)} ${n(x)} ${n(y + 0.5)}Z`,
  ]
  return tips[turn] ?? tips[0]
}

function star(x: number, y: number): string {
  return `M${n(x + 0.5)} ${n(y)}L${n(x + 0.64)} ${n(y + 0.36)}L${n(x + 1)} ${n(y + 0.5)}L${n(x + 0.64)} ${n(y + 0.64)}L${n(x + 0.5)} ${n(y + 1)}L${n(x + 0.36)} ${n(y + 0.64)}L${n(x)} ${n(y + 0.5)}L${n(x + 0.36)} ${n(y + 0.36)}Z`
}

function bodyPath(shape: BodyShape, x: number, y: number, nb: Nb): string {
  const alone = !nb.n && !nb.e && !nb.s && !nb.w
  switch (shape) {
    case 'square':
      return `M${n(x)} ${n(y)}H${n(x + 1)}V${n(y + 1)}H${n(x)}Z`
    case 'round':
      return roundCell(x, y, 0.42, nb)
    case 'circular':
      return alone ? circle(x, y, 0.5) : roundCell(x, y, 0.5, nb)
    case 'dot':
      return circle(x, y, 0.32)
    case 'circle':
      return circle(x, y, 0.46)
    case 'circle-zebra':
      return circle(x, y, Math.round(y) % 2 === 0 ? 0.46 : 0.28)
    case 'circle-zebra-vertical':
      return circle(x, y, Math.round(x) % 2 === 0 ? 0.46 : 0.28)
    case 'diamond':
      return diamondBox(x, y, 1)
    case 'star':
      return star(x, y)
    case 'leaf':
      return leaf(x, y, (Math.round(x) + Math.round(y)) % 4)
    case 'japnese':
      return roundRect(x + 0.08, y + 0.08, 0.84, 0.84, 0.22)
    case 'mosaic': {
      const inset = 0.04 + ((Math.round(x) * 5 + Math.round(y) * 3) % 4) * 0.04
      return `M${n(x + inset)} ${n(y + inset)}H${n(x + 1 - inset)}V${n(y + 1 - inset)}H${n(x + inset)}Z`
    }
    case 'edge-cut':
      return edgeCut(x, y, 0.42, false)
    case 'edge-cut-smooth':
      return edgeCut(x, y, 0.42, true)
    case 'pointed':
      return classyCell(x, y, 0.5, false, nb)
    case 'pointed-smooth':
      return curvedDiamond(x, y)
    case 'pointed-edge-cut':
      return edgeCut(x, y, 0.62, false)
    case 'pointed-in':
      return inward(x, y, false)
    case 'pointed-in-smooth':
      return inward(x, y, true)
    case 'rounded-in':
      return classyCell(x, y, 0.46, false, nb)
    case 'rounded-in-smooth':
      return classyCell(x, y, 0.46, true, nb)
    case 'rounded-pointed':
      return classyCell(x, y, 0.62, true, nb)
    default:
      return `M${n(x)} ${n(y)}H${n(x + 1)}V${n(y + 1)}H${n(x)}Z`
  }
}

function framePath(frame: EyeFrame, x: number, y: number): string {
  const outer = 7
  const inner = 5
  switch (frame) {
    case 'frame0':
      return roundRect(x, y, outer, outer, 0) + roundRect(x + 1, y + 1, inner, inner, 0)
    case 'frame1':
      return roundRect(x, y, outer, outer, 0.8) + roundRect(x + 1, y + 1, inner, inner, 0.45)
    case 'frame2':
      return disc(x + 3.5, y + 3.5, 3.5) + disc(x + 3.5, y + 3.5, 2.45)
    case 'frame3':
      return diamondBox(x, y, outer) + diamondBox(x + 1.15, y + 1.15, 4.7)
    case 'frame4':
      return roundRect(x, y, outer, outer, 1.5) + roundRect(x + 1, y + 1, inner, inner, 1)
    case 'frame5':
      return roundRect(x, y, outer, outer, 2.2) + roundRect(x + 1, y + 1, inner, inner, 1.4)
    case 'frame6':
      return octagon(x, y, outer, 1.35) + octagon(x + 1, y + 1, inner, 0.7)
    case 'frame7':
      return octagon(x, y, outer, 0.7) + octagon(x + 1, y + 1, inner, 0.35)
    case 'frame8':
      return roundRect(x, y, outer, outer, 2.5) + roundRect(x + 1, y + 1, inner, inner, 1.6)
    case 'frame10':
      return disc(x + 3.5, y + 3.5, 3.5) + roundRect(x + 1, y + 1, inner, inner, 0)
    case 'frame11':
      return roundRect(x, y, outer, outer, 0) + disc(x + 3.5, y + 3.5, 2.45)
    case 'frame12':
      return octagon(x, y, outer, 1.8) + roundRect(x + 1, y + 1, inner, inner, 0)
    case 'frame13':
      return roundRect(x, y, outer, outer, 2.8) + roundRect(x + 1.1, y + 1.1, 4.8, 4.8, 1.8)
    case 'frame14':
      return diamondBox(x, y, outer) + disc(x + 3.5, y + 3.5, 2.2)
    case 'frame16':
      return capsule(x, y, outer, outer) + capsule(x + 1, y + 1, inner, inner)
    default:
      return roundRect(x, y, outer, outer, 0) + roundRect(x + 1, y + 1, inner, inner, 0)
  }
}

function ballPath(ball: EyeBall, x: number, y: number): string {
  switch (ball) {
    case 'ball0':
      return roundRect(x, y, 3, 3, 0)
    case 'ball1':
      return disc(x + 1.5, y + 1.5, 1.5)
    case 'ball2':
      return roundRect(x, y, 3, 3, 0.7)
    case 'ball3':
      return diamondBox(x, y, 3)
    case 'ball5':
      return `M${n(x + 1.5)} ${n(y)}L${n(x + 1.92)} ${n(y + 1.08)}L${n(x + 3)} ${n(y + 1.5)}L${n(x + 1.92)} ${n(y + 1.92)}L${n(x + 1.5)} ${n(y + 3)}L${n(x + 1.08)} ${n(y + 1.92)}L${n(x)} ${n(y + 1.5)}L${n(x + 1.08)} ${n(y + 1.08)}Z`
    case 'ball6':
      return disc(x + 1.5, y + 1.5, 1.05)
    case 'ball7':
      return `M${n(x + 1.5)} ${n(y)}Q${n(x + 3)} ${n(y + 0.55)} ${n(x + 2.4)} ${n(y + 2.15)}Q${n(x + 2)} ${n(y + 3)} ${n(x + 1.5)} ${n(y + 3)}Q${n(x + 1)} ${n(y + 3)} ${n(x + 0.6)} ${n(y + 2.15)}Q${n(x)} ${n(y + 0.55)} ${n(x + 1.5)} ${n(y)}Z`
    case 'ball8':
      return roundRect(x + 0.15, y + 0.15, 2.7, 2.7, 0.9)
    case 'ball10':
      return `M${n(x + 1.5)} ${n(y)}L${n(x + 3)} ${n(y + 2.7)}H${n(x)}Z`
    case 'ball11':
      return `M${n(x)} ${n(y + 0.3)}H${n(x + 3)}L${n(x + 1.5)} ${n(y + 3)}Z`
    case 'ball12':
      return capsule(x, y + 0.7, 3, 1.6)
    case 'ball13':
      return capsule(x + 0.7, y, 1.6, 3)
    case 'ball14':
      return roundRect(x + 1.05, y, 0.9, 3, 0.2) + roundRect(x, y + 1.05, 3, 0.9, 0.2)
    case 'ball15':
      return octagon(x + 0.15, y + 0.15, 2.7, 0.75)
    case 'ball16':
      return octagon(x, y, 3, 0.7)
    case 'ball17':
      return `M${n(x + 1.5)} ${n(y + 3)}Q${n(x)} ${n(y + 2.45)} ${n(x + 0.6)} ${n(y + 0.85)}Q${n(x + 1)} ${n(y)} ${n(x + 1.5)} ${n(y)}Q${n(x + 2)} ${n(y)} ${n(x + 2.4)} ${n(y + 0.85)}Q${n(x + 3)} ${n(y + 2.45)} ${n(x + 1.5)} ${n(y + 3)}Z`
    case 'ball18':
      return disc(x + 1.5, y + 1.5, 1.65)
    case 'ball19':
      return `M${n(x + 1.5)} ${n(y)}Q${n(x + 2.65)} ${n(y + 0.35)} ${n(x + 3)} ${n(y + 1.5)}Q${n(x + 2.65)} ${n(y + 2.65)} ${n(x + 1.5)} ${n(y + 3)}Q${n(x + 0.35)} ${n(y + 2.65)} ${n(x)} ${n(y + 1.5)}Q${n(x + 0.35)} ${n(y + 0.35)} ${n(x + 1.5)} ${n(y)}Z`
    default:
      return roundRect(x, y, 3, 3, 0)
  }
}

function inFinder(x: number, y: number, size: number): boolean {
  const hit = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7
  return hit(0, 0) || hit(size - 7, 0) || hit(0, size - 7)
}

function neighbors(matrix: Matrix, x: number, y: number): Nb {
  const on = (col: number, row: number) =>
    col >= 0 && row >= 0 && col < matrix.size && row < matrix.size && matrix.get(row, col) === 1
  return {
    n: on(x, y - 1),
    e: on(x + 1, y),
    s: on(x, y + 1),
    w: on(x - 1, y),
    nw: on(x - 1, y - 1),
    ne: on(x + 1, y - 1),
    sw: on(x - 1, y + 1),
    se: on(x + 1, y + 1),
  }
}

function hexChannel(hex: string, index: number): number {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.replace(/./g, (ch) => ch + ch) : clean
  return Number.parseInt(full.slice(index * 2, index * 2 + 2), 16) / 255
}

function luminance(hex: string): number {
  const channels = [0, 1, 2].map((index) => {
    const value = hexChannel(hex, index)
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** WCAG contrast between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const left = luminance(a)
  const right = luminance(b)
  const [hi, lo] = left > right ? [left, right] : [right, left]
  return (hi + 0.05) / (lo + 0.05)
}

function safeColor(value: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : '#10201f'
}

export function renderStyledQr(text: string, look: QrLook): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: look.ecLevel })
  const matrix = qr.modules
  const margin = Math.max(0, Math.round(look.margin))
  const total = matrix.size + margin * 2
  const dark = safeColor(look.dark)
  const light = safeColor(look.light)
  const gradientTo = safeColor(look.gradientTo)
  const body: string[] = []
  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (matrix.get(y, x) !== 1 || inFinder(x, y, matrix.size)) continue
      body.push(bodyPath(look.body, x + margin, y + margin, neighbors(matrix, x, y)))
    }
  }
  const origins: [number, number][] = [
    [margin, margin],
    [margin + matrix.size - 7, margin],
    [margin, margin + matrix.size - 7],
  ]
  const frames = origins.map(([x, y], index) => ({
    d: framePath(look.eye, x, y),
    fill: look.customEyes ? safeColor(look.eyeFrameColors[index] ?? dark) : '',
  }))
  const balls = origins.map(([x, y], index) => ({
    d: ballPath(look.ball, x + 2, y + 2),
    fill: look.customEyes ? safeColor(look.eyeBallColors[index] ?? dark) : '',
  }))
  const useGradient = look.gradient !== 'none'
  const bodyFill = useGradient ? 'url(#qr-fill)' : dark
  const eyeFill = useGradient && look.gradientOnEyes ? 'url(#qr-fill)' : dark
  const gradient =
    look.gradient === 'linear'
      ? `<linearGradient id="qr-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${gradientTo}"/></linearGradient>`
      : look.gradient === 'radial'
        ? `<radialGradient id="qr-fill" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${gradientTo}"/></radialGradient>`
        : ''
  const background = look.transparent ? '' : `<rect width="${total}" height="${total}" fill="${light}"/>`
  const eyeMarkup = [...frames, ...balls]
    .map((part) => `<path fill="${part.fill || eyeFill}" fill-rule="evenodd" d="${part.d}"/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="${look.body === 'square' && look.eye === 'frame0' ? 'crispEdges' : 'geometricPrecision'}">${gradient ? `<defs>${gradient}</defs>` : ''}${background}<path fill="${bodyFill}" d="${body.join('')}"/>${eyeMarkup}</svg>`
}

const SWATCH: number[][] = [
  [1, 1, 0],
  [1, 0, 1],
  [0, 1, 1],
]

function swatchNeighbors(x: number, y: number): Nb {
  const on = (col: number, row: number) => SWATCH[row]?.[col] === 1
  return {
    n: on(x, y - 1),
    e: on(x + 1, y),
    s: on(x, y + 1),
    w: on(x - 1, y),
    nw: on(x - 1, y - 1),
    ne: on(x + 1, y - 1),
    sw: on(x - 1, y + 1),
    se: on(x + 1, y + 1),
  }
}

export function bodySwatch(shape: BodyShape): string {
  const parts: string[] = []
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      if (SWATCH[y][x] !== 1) continue
      parts.push(bodyPath(shape, x, y, swatchNeighbors(x, y)))
    }
  }
  return parts.join('')
}

export function eyeSwatch(frame: EyeFrame, ball: EyeBall): string {
  return framePath(frame, 0, 0) + ballPath(ball, 2, 2)
}
