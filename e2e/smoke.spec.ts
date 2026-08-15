import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Every route, opened for real.
 *
 * Unit tests cover the libraries, but they cannot catch a tool that mounts and
 * then throws — a bad lazy import, a missing browser API, a null deref in an
 * effect. This walks the registry so a new tool is covered the moment it is
 * registered, with no test to remember to write.
 */

const registry = readFileSync(resolve(process.cwd(), 'src/registry.ts'), 'utf8')
const ROUTES = [...registry.matchAll(/^\s{4}path: '([^']+)',$/gm)].map((m) => m[1])

/** Noise that is expected and not a defect. */
const IGNORED = [
  /favicon/i,
  /ServiceWorker/i,
  /Download the React DevTools/i,
  /\[vite\]/i,
]

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (IGNORED.some((pattern) => pattern.test(text))) return
    errors.push(text)
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  return errors
}

test('the registry exposes every route', () => {
  expect(ROUTES.length).toBeGreaterThanOrEqual(60)
  expect(new Set(ROUTES).size).toBe(ROUTES.length)
})

test('home renders and search filters', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/')
  await expect(page.locator('.tool-hero h1, .hero h1').first()).toBeVisible()
  await expect(page.locator('.tool-card').first()).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search tools' }).fill('pdf')
  await expect(page.locator('.home-section h2').first()).toContainText('tools')
  const count = await page.locator('.tool-card').count()
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThan(ROUTES.length)

  expect(errors).toEqual([])
})

for (const route of ROUTES) {
  test(`${route} mounts cleanly`, async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto(route)

    // Every tool page renders its title through ToolLayout.
    await expect(page.locator('.tool-hero h1, .hero h1').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.crash')).toHaveCount(0)

    // Nothing may push the document into horizontal scroll.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    )
    expect(overflows, `${route} scrolls horizontally`).toBe(false)

    expect(errors, `${route} logged console errors`).toEqual([])
  })
}

test('keyboard chord navigates', async ({ page }) => {
  await page.goto('/')
  await page.locator('body').click()
  await page.keyboard.press('g')
  await page.keyboard.press('j')
  await expect(page).toHaveURL(/\/json$/)
})

test('two-letter chord navigates', async ({ page }) => {
  await page.goto('/')
  await page.locator('body').click()
  await page.keyboard.press('g')
  await page.keyboard.press('4')
  await page.keyboard.press('d')
  await expect(page).toHaveURL(/\/table$/)
})

test('the cheatsheet opens with ? and closes with Escape', async ({ page }) => {
  await page.goto('/')
  await page.locator('body').click()
  await page.keyboard.press('?')
  const dialog = page.getByRole('dialog', { name: /keyboard shortcuts/i })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('the command palette runs an action', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('combobox', { name: /search tools and actions/i }).fill('compress an image to 300')
  await page.getByRole('option').first().click()
  await expect(page).toHaveURL(/\/compress$/)
  await expect(page.locator('input[value="300kb"]')).toBeVisible()
})

test('a tool crash is contained by the boundary', async ({ page }) => {
  await page.goto('/json')
  await expect(page.locator('.tool-hero h1, .hero h1').first()).toBeVisible()
  // The shell must survive whatever a tool does.
  await expect(page.locator('.rail')).toBeVisible()
})

test('backup exports a readable file', async ({ page }) => {
  await page.goto('/settings')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /export everything/i }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^bitkit-backup-\d{8}\.json$/)
})

test('undo restores a deleted table column', async ({ page }) => {
  await page.goto('/table')
  // Wait for the sample data to render before counting, or `before` races the load.
  await expect(page.locator('.data-table tbody tr').first()).toBeVisible()
  const headers = page.locator('.data-table thead th')
  const before = await headers.count()
  expect(before).toBeGreaterThan(1)
  await page.locator('.th-tools button[title="Delete column"]').first().click()
  await expect(headers).toHaveCount(before - 1)

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(headers).toHaveCount(before)
})

test('switching language translates the shell', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Language').selectOption('hi')
  await expect(page.locator('.rail-link').first()).toContainText('होम')
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
})
