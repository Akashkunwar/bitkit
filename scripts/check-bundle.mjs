/**
 * Fails the build when the code every visitor downloads grows past budget.
 *
 * Only the entry chunk and CSS are checked: the lazy per-tool chunks are the
 * point of the architecture, and a big Mermaid bundle is fine precisely
 * because it never loads unless you open that tool. What must not creep is the
 * cost of opening the front page.
 *
 * Run: npm run check:bundle
 */
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve, join } from 'node:path'

const DIST = resolve(process.cwd(), 'dist')
const ASSETS = join(DIST, 'assets')

/** Gzipped kilobytes. Raise these deliberately, with a reason in the commit. */
const BUDGETS = {
  entryJs: 165,
  css: 30,
  /** Anything not lazy-loaded, together. */
  totalEager: 200,
}

function gzipKb(path) {
  return gzipSync(readFileSync(path)).length / 1024
}

function findEntry() {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8')
  const match = html.match(/<script[^>]+src="\/assets\/([^"]+\.js)"/)
  if (!match) throw new Error('Could not find the entry script in dist/index.html.')
  return match[1]
}

function findStylesheets() {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8')
  return [...html.matchAll(/<link[^>]+href="\/assets\/([^"]+\.css)"/g)].map((m) => m[1])
}

try {
  statSync(DIST)
} catch {
  console.error('No dist/ directory. Run `npm run build` first.')
  process.exit(1)
}

const entry = findEntry()
const stylesheets = findStylesheets()

const entryKb = gzipKb(join(ASSETS, entry))
const cssKb = stylesheets.reduce((sum, file) => sum + gzipKb(join(ASSETS, file)), 0)
const totalEager = entryKb + cssKb

const rows = [
  ['Entry JS', entryKb, BUDGETS.entryJs],
  ['CSS', cssKb, BUDGETS.css],
  ['Total eager', totalEager, BUDGETS.totalEager],
]

let failed = false
console.log('\nBundle budget (gzipped)\n')
for (const [label, actual, budget] of rows) {
  const pct = Math.round((actual / budget) * 100)
  const over = actual > budget
  if (over) failed = true
  console.log(
    `  ${over ? 'FAIL' : 'ok  '}  ${label.padEnd(12)} ${actual.toFixed(1).padStart(7)} KB  /  ${String(budget).padStart(4)} KB  (${pct}%)`,
  )
}

// Report the biggest lazy chunks too — informational, never a failure.
const lazy = readdirSync(ASSETS)
  .filter((file) => file.endsWith('.js') && file !== entry)
  .map((file) => ({ file, kb: gzipKb(join(ASSETS, file)) }))
  .sort((a, b) => b.kb - a.kb)
  .slice(0, 5)

if (lazy.length) {
  console.log('\n  Largest lazy chunks (not budgeted — they load on demand):')
  for (const chunk of lazy) console.log(`    ${chunk.kb.toFixed(1).padStart(7)} KB  ${chunk.file}`)
}

if (failed) {
  console.error(
    '\nThe eager bundle is over budget. Either lazy-load the new dependency, or raise the budget in scripts/check-bundle.mjs with a note explaining why.\n',
  )
  process.exit(1)
}
console.log('\nWithin budget.\n')
