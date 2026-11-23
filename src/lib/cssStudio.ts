/**
 * CSS snippets for the studio. Each function returns the declaration or
 * rule a person copies. Previews use the same string.
 */

export type ClipShape = 'circle' | 'ellipse' | 'triangle' | 'diamond' | 'hexagon' | 'blob'
export type PatternKind = 'dots' | 'grid' | 'stripes' | 'checker'
export type TrianglePoint = 'up' | 'down' | 'left' | 'right'

export function boxShadowCss(
  x: number,
  y: number,
  blur: number,
  spread: number,
  color: string,
  inset: boolean,
): string {
  return `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px ${color}`
}

export function radiusCss(topLeft: number, topRight: number, bottomRight: number, bottomLeft: number): string {
  return `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`
}

export function clipCss(shape: ClipShape): string {
  switch (shape) {
    case 'circle':
      return 'circle(50% at 50% 50%)'
    case 'ellipse':
      return 'ellipse(40% 50% at 50% 50%)'
    case 'triangle':
      return 'polygon(50% 0%, 100% 100%, 0% 100%)'
    case 'diamond':
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
    case 'hexagon':
      return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
    case 'blob':
      return 'polygon(40% 0%, 80% 10%, 100% 45%, 85% 90%, 40% 100%, 5% 70%, 0% 30%)'
  }
}

export function bezierCss(x1: number, y1: number, x2: number, y2: number): string {
  const n = (value: number) => Math.round(value * 100) / 100
  return `cubic-bezier(${n(x1)}, ${n(y1)}, ${n(x2)}, ${n(y2)})`
}

export function glassCss(blur: number, alpha: number): string {
  const a = Math.round(alpha * 100) / 100
  return `background: rgba(255, 255, 255, ${a});\nbackdrop-filter: blur(${blur}px);\n-webkit-backdrop-filter: blur(${blur}px);\nborder: 1px solid rgba(255, 255, 255, 0.35);`
}

export function patternCss(kind: PatternKind, color: string, gap: number): string {
  if (kind === 'dots') {
    return `background-image: radial-gradient(${color} 1.2px, transparent 1.2px);\nbackground-size: ${gap}px ${gap}px;`
  }
  if (kind === 'grid') {
    return `background-image: linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px);\nbackground-size: ${gap}px ${gap}px;`
  }
  if (kind === 'stripes') {
    return `background-image: repeating-linear-gradient(45deg, ${color} 0 8px, transparent 8px ${gap}px);`
  }
  return `background-image: linear-gradient(45deg, ${color} 25%, transparent 25%), linear-gradient(-45deg, ${color} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${color} 75%), linear-gradient(-45deg, transparent 75%, ${color} 75%);\nbackground-size: ${gap}px ${gap}px;\nbackground-position: 0 0, 0 ${gap / 2}px, ${gap / 2}px -${gap / 2}px, -${gap / 2}px 0;`
}

export function triangleCss(size: number, color: string, point: TrianglePoint): string {
  const base = `width: 0;\nheight: 0;`
  if (point === 'up') {
    return `${base}\nborder-left: ${size}px solid transparent;\nborder-right: ${size}px solid transparent;\nborder-bottom: ${size}px solid ${color};`
  }
  if (point === 'down') {
    return `${base}\nborder-left: ${size}px solid transparent;\nborder-right: ${size}px solid transparent;\nborder-top: ${size}px solid ${color};`
  }
  if (point === 'left') {
    return `${base}\nborder-top: ${size}px solid transparent;\nborder-bottom: ${size}px solid transparent;\nborder-right: ${size}px solid ${color};`
  }
  return `${base}\nborder-top: ${size}px solid transparent;\nborder-bottom: ${size}px solid transparent;\nborder-left: ${size}px solid ${color};`
}

export function loaderCss(color: string, size: number): string {
  return `@keyframes kit-spin {\n  to { transform: rotate(360deg); }\n}\n\n.loader {\n  width: ${size}px;\n  height: ${size}px;\n  border: 3px solid color-mix(in srgb, ${color} 25%, transparent);\n  border-top-color: ${color};\n  border-radius: 50%;\n  animation: kit-spin 0.8s linear infinite;\n}`
}

export function switchCss(on: string, off: string): string {
  return `.switch {\n  width: 44px;\n  height: 26px;\n  border-radius: 999px;\n  background: ${off};\n  position: relative;\n}\n\n.switch[aria-checked="true"] {\n  background: ${on};\n}\n\n.switch::after {\n  content: "";\n  position: absolute;\n  top: 3px;\n  left: 3px;\n  width: 20px;\n  height: 20px;\n  border-radius: 50%;\n  background: white;\n  transition: transform 0.15s ease;\n}\n\n.switch[aria-checked="true"]::after {\n  transform: translateX(18px);\n}`
}

export function glitchCss(color: string): string {
  return `@keyframes kit-glitch {\n  0% { transform: translate(0); }\n  20% { transform: translate(-2px, 1px); }\n  40% { transform: translate(2px, -1px); }\n  60% { transform: translate(-1px, -1px); }\n  100% { transform: translate(0); }\n}\n\n.glitch {\n  position: relative;\n  animation: kit-glitch 0.6s infinite;\n}\n\n.glitch::before,\n.glitch::after {\n  content: attr(data-text);\n  position: absolute;\n  inset: 0;\n}\n\n.glitch::before {\n  color: ${color};\n  transform: translate(-2px, 0);\n  mix-blend-mode: screen;\n}\n\n.glitch::after {\n  color: #5ec8ff;\n  transform: translate(2px, 0);\n  mix-blend-mode: screen;\n}`
}

export function nativeShadow(x: number, y: number, blur: number, color: string, opacity: number): string {
  const alpha = Math.round(opacity * 100) / 100
  return `shadowColor: '${color}',\nshadowOffset: { width: ${x}, height: ${y} },\nshadowOpacity: ${alpha},\nshadowRadius: ${blur},\nelevation: ${Math.max(0, Math.round(blur / 2))},`
}

export function checkboxCss(color: string): string {
  return `.check {\n  width: 20px;\n  height: 20px;\n  border: 2px solid ${color};\n  border-radius: 4px;\n  display: grid;\n  place-items: center;\n}\n\n.check[aria-checked="true"] {\n  background: ${color};\n}\n\n.check[aria-checked="true"]::after {\n  content: "";\n  width: 5px;\n  height: 9px;\n  border: solid white;\n  border-width: 0 2px 2px 0;\n  transform: rotate(45deg) translate(-1px, -1px);\n}`
}
