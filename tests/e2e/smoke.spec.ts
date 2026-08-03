import { expect, test } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { access } from 'node:fs/promises'
import path from 'node:path'

const mainEntry = path.resolve(process.cwd(), 'out/main/index.js')

test('launches the desktop application and renders its first window', async () => {
  await access(mainEntry)

  const electronApp = await electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PIZZA_SOCIAL_HUB_E2E: 'true'
    }
  })

  try {
    const window = await electronApp.firstWindow()

    await window.waitForLoadState('domcontentloaded')
    await expect(window.locator('body')).toBeVisible()
    await expect.poll(() => window.title()).not.toBe('')
    const bridge = await window.evaluate(() => ({ available: typeof (globalThis as unknown as { pizzaSocial?: { invoke?: unknown } }).pizzaSocial?.invoke === 'function' }))
    expect(bridge.available).toBe(true)
    await expect(window.getByText('Desktop connection unavailable')).toHaveCount(0)
    await window.getByRole('button',{name:'Settings'}).click()
    await expect(window.getByRole('heading',{name:'Higgsfield account'})).toBeVisible()
    await expect(window.getByRole('button',{name:'Sign in with Higgsfield'})).toBeVisible()

    const appPath = await electronApp.evaluate(({ app }) => app.getAppPath())
    expect(appPath).toBeTruthy()
  } finally {
    await electronApp.close()
  }
})
