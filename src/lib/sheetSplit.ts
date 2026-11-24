export function rowsToCsv(rows: string[][]): string {
  const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value)
  return rows.map((row) => row.map(cell).join(',')).join('\n')
}

/** Each chunk has at most `perFile` data rows. The header is repeated when asked. */
export function splitRows(rows: string[][], perFile: number, keepHeader: boolean): string[][][] {
  const size = Math.floor(perFile)
  if (!(size >= 1)) throw new Error('Rows per file must be at least 1.')
  if (!rows.length) return []
  const header = keepHeader ? rows[0] : null
  const body = keepHeader ? rows.slice(1) : rows
  if (!body.length) return header ? [[header]] : []
  const chunks: string[][][] = []
  for (let index = 0; index < body.length; index += size) {
    const slice = body.slice(index, index + size)
    chunks.push(header ? [header, ...slice] : slice)
  }
  return chunks
}
