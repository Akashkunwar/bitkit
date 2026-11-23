function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexColor(input: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(input)) throw new Error('Use a hex color like #c45b2d.')
  return input
}

export function blobSvg(seed: number, fill = '#c45b2d'): string {
  const color = hexColor(fill)
  const rand = mulberry32(seed)
  const n = 8
  const points = Array.from({ length: n }, (_, index) => {
    const angle = (index / n) * Math.PI * 2
    const radius = 42 + rand() * 38
    return [100 + Math.cos(angle) * radius, 100 + Math.sin(angle) * radius]
  })
  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  let d = `M ${mid(points[0], points[1])
    .map((n) => n.toFixed(1))
    .join(' ')}`
  for (let i = 0; i < n; i += 1) {
    const point = points[(i + 1) % n]
    const next = mid(point, points[(i + 2) % n])
    d += ` Q ${point[0].toFixed(1)} ${point[1].toFixed(1)} ${next[0].toFixed(1)} ${next[1].toFixed(1)}`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="${d} Z" fill="${color}"/></svg>`
}

export function patternSvg(kind: 'dots' | 'grid' | 'stripes', fill = '#c45b2d'): string {
  const color = hexColor(fill)
  const tile =
    kind === 'grid'
      ? `<path d="M16 0 V16 M0 16 H16" fill="none" stroke="${color}" stroke-width="1"/>`
      : kind === 'stripes'
        ? `<path d="M0 16 L16 0" fill="none" stroke="${color}" stroke-width="2"/>`
        : `<circle cx="4" cy="4" r="2" fill="${color}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><pattern id="p" width="16" height="16" patternUnits="userSpaceOnUse">${tile}</pattern></defs><rect width="160" height="160" fill="url(#p)"/></svg>`
}
