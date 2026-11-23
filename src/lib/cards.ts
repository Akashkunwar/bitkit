/** Quote cards and code cards drawn on a canvas. Layout maths is separate so it can be tested. */

export function wrapLines(text: string, maxChars: number): string[] {
  const limit = Math.max(8, maxChars)
  const lines: string[] = []
  for (const raw of text.replaceAll('\r\n', '\n').split('\n')) {
    if (!raw) {
      lines.push('')
      continue
    }
    const words = raw.split(/\s+/)
    let line = ''
    for (const word of words) {
      if (!line) {
        line = word
        continue
      }
      if (`${line} ${word}`.length <= limit) line = `${line} ${word}`
      else {
        lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

export type QuoteCard = { quote: string; author: string; accent: string; background: string }

export function drawQuoteCard(canvas: HTMLCanvasElement, card: QuoteCard): void {
  const width = 1080
  const height = 1080
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.fillStyle = card.background
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = card.accent
  ctx.fillRect(80, 120, 72, 10)
  ctx.fillStyle = '#1c1915'
  ctx.font = '600 54px ui-sans-serif, system-ui, sans-serif'
  const lines = wrapLines(card.quote, 28).slice(0, 8)
  lines.forEach((line, index) => {
    ctx.fillText(line, 80, 240 + index * 72, width - 160)
  })
  if (card.author.trim()) {
    ctx.fillStyle = '#5c564c'
    ctx.font = '500 32px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText(card.author.trim(), 80, height - 120, width - 160)
  }
}

export type CodeCard = { code: string; filename: string; theme: 'dark' | 'light' }

export function drawCodeCard(canvas: HTMLCanvasElement, card: CodeCard): void {
  const width = 1200
  const dark = card.theme === 'dark'
  const lines = card.code.replaceAll('\r\n', '\n').split('\n').slice(0, 24)
  const height = Math.max(420, 150 + lines.length * 36)
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.fillStyle = dark ? '#241f33' : '#efeae2'
  ctx.fillRect(0, 0, width, height)
  const panelX = 48
  const panelY = 48
  const panelW = width - 96
  const panelH = height - 96
  ctx.fillStyle = dark ? '#16141c' : '#fffdf8'
  ctx.beginPath()
  const r = 18
  ctx.moveTo(panelX + r, panelY)
  ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + panelH, r)
  ctx.arcTo(panelX + panelW, panelY + panelH, panelX, panelY + panelH, r)
  ctx.arcTo(panelX, panelY + panelH, panelX, panelY, r)
  ctx.arcTo(panelX, panelY, panelX + panelW, panelY, r)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = dark ? '#3a3544' : '#e4ddd2'
  ctx.beginPath()
  ctx.arc(panelX + 28, panelY + 28, 7, 0, Math.PI * 2)
  ctx.arc(panelX + 52, panelY + 28, 7, 0, Math.PI * 2)
  ctx.arc(panelX + 76, panelY + 28, 7, 0, Math.PI * 2)
  ctx.fill()
  if (card.filename.trim()) {
    ctx.fillStyle = dark ? '#b7b0c2' : '#6d675e'
    ctx.font = '500 18px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText(card.filename.trim(), panelX + 104, panelY + 34, panelW - 140)
  }
  ctx.font = '16px ui-monospace, monospace'
  ctx.fillStyle = dark ? '#f4efe6' : '#1c1915'
  lines.forEach((line, index) => {
    ctx.fillText(line || ' ', panelX + 28, panelY + 84 + index * 36, panelW - 56)
  })
}
