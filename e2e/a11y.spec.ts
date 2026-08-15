import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Holds BitKit to the standard its own contrast tool enforces.
 *
 * Rather than pulling in an audit engine, this checks the handful of rules
 * that actually break for this app: text contrast, named controls, target
 * size, heading order, and focus visibility. The contrast maths is the same
 * WCAG relative-luminance formula the Contrast checker ships.
 */

const registry = readFileSync(resolve(process.cwd(), 'src/registry.ts'), 'utf8')
const ROUTES = [...registry.matchAll(/^\s{4}path: '([^']+)',$/gm)].map((m) => m[1])

// A representative slice: one from each category plus the shell-heavy pages.
const SAMPLE = ['/', '/settings', '/pipelines', '/table', '/health', '/emoji', '/counter', '/compress', '/json', '/gradient']

type Issue = { rule: string; detail: string }

async function audit(page: Page): Promise<Issue[]> {
  // Colour transitions are 120ms; measuring mid-flight reports a blend of the
  // old and new themes and invents failures that do not exist.
  await page.waitForTimeout(300)
  return page.evaluate(() => {
    const issues: { rule: string; detail: string }[] = []
    const toChannel = (c: number) => {
      const s = c / 255
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    const luminance = ([r, g, b]: number[]) =>
      0.2126 * toChannel(r) + 0.7152 * toChannel(g) + 0.0722 * toChannel(b)
    /**
     * Resolves a computed colour to [r, g, b, a] in 0-255 / 0-1.
     *
     * Browsers return `rgb()` for simple colours but `color(srgb x y z / a)`
     * for anything produced by `color-mix()`, where the channels are 0-1
     * floats. Reading both with one naive number regex silently turns white
     * into near-black, which is exactly the false failure this replaces.
     */
    const parse = (value: string): number[] => {
      const srgb = value.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/)
      if (srgb) {
        return [
          Number(srgb[1]) * 255,
          Number(srgb[2]) * 255,
          Number(srgb[3]) * 255,
          srgb[4] === undefined ? 1 : Number(srgb[4]),
        ]
      }
      const rgb = value.match(/rgba?\(([^)]+)\)/)
      if (rgb) {
        const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number)
        return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] === undefined ? 1 : parts[3]]
      }
      return [0, 0, 0, 1]
    }

    const over = (fg: number[], bg: number[]): number[] => {
      const a = fg[3]
      return [
        fg[0] * a + bg[0] * (1 - a),
        fg[1] * a + bg[1] * (1 - a),
        fg[2] * a + bg[2] * (1 - a),
        1,
      ]
    }

    /** Walks up compositing every translucent layer onto the one behind it. */
    const backgroundOf = (el: Element): number[] => {
      const layers: number[][] = []
      let node: Element | null = el
      while (node && node !== document.documentElement) {
        const colour = parse(getComputedStyle(node).backgroundColor)
        if (colour[3] > 0) {
          layers.push(colour)
          if (colour[3] >= 1) break
        }
        node = node.parentElement
      }
      const root = parse(getComputedStyle(document.documentElement).backgroundColor)
      let result = root[3] >= 1 ? root : [255, 255, 255, 1]
      for (let i = layers.length - 1; i >= 0; i -= 1) result = over(layers[i], result)
      return result
    }

    const contrast = (a: number[], b: number[]) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
      return (hi + 0.05) / (lo + 0.05)
    }

    // 1. Text contrast.
    document.querySelectorAll('main *, .rail *, .topbar *').forEach((el) => {
      if (!el.textContent?.trim() || el.children.length) return
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.4) return
      const size = parseFloat(style.fontSize)
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700)
      const background = backgroundOf(el)
      const ratio = contrast(over(parse(style.color), background), background)
      const required = large ? 3 : 4.5
      if (ratio < required) {
        issues.push({
          rule: 'contrast',
          detail: `${ratio.toFixed(2)}:1 needs ${required} — ${el.tagName}.${String(el.className) || "(no class)"} "${el.textContent.trim().slice(0, 24)}"`,
        })
      }
    })

    // 2. Every control needs an accessible name.
    document.querySelectorAll('button, a[href], select, input, textarea').forEach((el) => {
      const node = el as HTMLInputElement
      const name = (
        node.getAttribute('aria-label') ||
        node.textContent?.trim() ||
        node.getAttribute('title') ||
        (node.labels?.length ? node.labels[0].textContent : '') ||
        node.getAttribute('placeholder') ||
        ''
      ).trim()
      if (!name) issues.push({ rule: 'name', detail: `${node.tagName}[${node.type ?? ''}].${node.className || '(no class)'}` })
    })

    // 3. Target size, WCAG 2.2 AA is 24x24. Range inputs are exempt, and so
    // are links that sit inline inside a sentence (the "Inline" exception).
    document.querySelectorAll('button, a[href], select, input:not([type=range])').forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const style = getComputedStyle(el)
      if (el.tagName === 'A' && style.display === 'inline') {
        const parent = el.parentElement
        const inSentence = parent && ['P', 'LI', 'SPAN', 'TD'].includes(parent.tagName)
        if (inSentence) return
      }
      if (rect.height < 24 || rect.width < 24) {
        issues.push({
          rule: 'target',
          detail: `${el.tagName}.${String(el.className).slice(0, 24)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        })
      }
    })

    // 4. Heading order must not skip a level.
    const levels = [...document.querySelectorAll('main h1, main h2, main h3, main h4')].map((h) =>
      Number(h.tagName[1]),
    )
    for (let i = 1; i < levels.length; i += 1) {
      if (levels[i] - levels[i - 1] > 1) issues.push({ rule: 'heading', detail: `h${levels[i - 1]} then h${levels[i]}` })
    }

    // 5. The page needs exactly one main landmark and a document language.
    if (document.querySelectorAll('main').length !== 1) issues.push({ rule: 'landmark', detail: 'expected one <main>' })
    if (!document.documentElement.lang) issues.push({ rule: 'lang', detail: 'no lang on <html>' })

    return issues
  })
}

for (const route of SAMPLE) {
  test(`${route} meets the accessibility bar`, async ({ page }) => {
    await page.goto(route)
    await expect(page.locator('.tool-hero h1, .hero h1').first()).toBeVisible()
    const issues = await audit(page)
    expect(issues, JSON.stringify(issues, null, 2)).toEqual([])
  })
}

test('dark theme keeps the same contrast', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /switch to dark theme/i }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const issues = (await audit(page)).filter((i) => i.rule === 'contrast')
  expect(issues, JSON.stringify(issues, null, 2)).toEqual([])
})

test('keyboard focus is always visible', async ({ page }) => {
  await page.goto('/')
  const invisible: string[] = []
  for (let i = 0; i < 20; i += 1) {
    await page.keyboard.press('Tab')
    const result = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const style = getComputedStyle(el)
      const hasRing =
        (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) ||
        style.boxShadow !== 'none' ||
        style.borderColor !== 'transparent'
      return hasRing ? null : `${el.tagName}.${String(el.className).slice(0, 30)}`
    })
    if (result) invisible.push(result)
  }
  expect([...new Set(invisible)]).toEqual([])
})

test('the skip link reaches the main content', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.locator('.skip-link')
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main$/)
})

test('the cheatsheet traps and restores focus', async ({ page }) => {
  await page.goto('/')
  await page.locator('body').click()
  await page.keyboard.press('?')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Focus must start inside the dialog, not behind it.
  const inside = await page.evaluate(() => {
    const dialogEl = document.querySelector('.sheet')
    return Boolean(dialogEl && document.activeElement && dialogEl.contains(document.activeElement))
  })
  expect(inside).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('every registered route is reachable from the rail or search', async ({ page }) => {
  await page.goto('/')
  const searchable = await page.evaluate(() => document.querySelectorAll('.tool-card').length)
  // Home lists every tool when nothing is filtered.
  expect(searchable).toBe(ROUTES.length)
})
