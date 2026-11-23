export type SortFrame = { values: number[]; i: number; j: number }

export function bubbleFrames(input: number[]): SortFrame[] {
  const values = input.slice()
  const frames: SortFrame[] = []
  for (let end = values.length - 1; end > 0; end -= 1) {
    for (let i = 0; i < end; i += 1) {
      frames.push({ values: values.slice(), i, j: i + 1 })
      if (values[i] > values[i + 1]) {
        const swap = values[i]
        values[i] = values[i + 1]
        values[i + 1] = swap
        frames.push({ values: values.slice(), i, j: i + 1 })
      }
    }
  }
  frames.push({ values: values.slice(), i: -1, j: -1 })
  return frames
}

export function parseNumbers(text: string): number[] {
  const values = text
    .split(/[\s,]+/)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n))
  if (values.length < 2) throw new Error('Enter at least two numbers.')
  if (values.length > 40) throw new Error('Keep it to 40 numbers so the steps stay readable.')
  return values
}
