import { expect, test } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const mainEntry = path.resolve(process.cwd(), 'out/main/index.js')

test('launches the desktop application and renders its first window', async () => {
  await access(mainEntry)
  const userData=await mkdtemp(path.join(tmpdir(),'pizza-promo-pro-e2e-'))

  const electronApp = await electron.launch({
    args: [mainEntry,`--user-data-dir=${userData}`],
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

    await window.getByRole('button',{name:'Business profile'}).click()
    await window.getByRole('button',{name:'Add business profile'}).click()
    await window.getByLabel('Business name').fill('E2E Pizza Shop')
    await window.getByRole('button',{name:'Create record'}).click()
    await expect(window.getByText('E2E Pizza Shop')).toBeVisible()

    const draft=await window.evaluate(async()=>{
      const api=(globalThis as unknown as {pizzaSocial:{invoke:(channel:string,request:unknown)=>Promise<{ok:boolean;data?:{id:string};error?:{message:string}}>} }).pizzaSocial
      const result=await api.invoke('content:createDraft',{title:'Visible media proof',brief:'Create a reviewable image for the saved pizza promotion.',platforms:['instagram']})
      if(!result.ok||!result.data)throw new Error(result.error?.message??'Draft setup failed')
      return result.data
    })
    await window.evaluate(async(contentItemId)=>{
      const api=(globalThis as unknown as {pizzaSocial:{invoke:(channel:string,request:unknown)=>Promise<{ok:boolean;error?:{message:string}}>} }).pizzaSocial
      const result=await api.invoke('media:generateForContent',{contentItemId,prompt:'A clearly labeled mock pizza image for inline review.'})
      if(!result.ok)throw new Error(result.error?.message??'Mock media setup failed')
    },draft.id)
    await window.getByRole('button',{name:'Content'}).click()
    await expect(window.getByRole('img',{name:/Generated visual for Visible media proof/})).toBeVisible()
    await expect(window.getByText('Review this image before approval or publishing.')).toBeVisible()
    await window.getByRole('button',{name:'Media library'}).click()
    await expect(window.getByRole('img',{name:/Media library preview for Visible media proof/})).toBeVisible()

    await window.getByRole('button',{name:'Locations'}).click()
    await window.getByRole('button',{name:'Add location'}).click()
    await window.getByLabel('Location name').fill('Panorama Plaza')
    await window.getByLabel('Street address').fill('1601 Penfield Rd')
    await window.getByLabel('City').fill('Rochester')
    await window.getByLabel('State or region').fill('New York')
    await window.getByLabel('Postal code').fill('14625')
    await window.getByLabel('Time zone').fill('America/New_York')
    await window.getByRole('button',{name:'Create record'}).click()
    await expect(window.getByText('Panorama Plaza')).toBeVisible()
    await expect(window.getByText(/NOT NULL constraint failed/i)).toHaveCount(0)

    await window.getByRole('button',{name:'Brand profile'}).click()
    await window.getByRole('button',{name:'Add brand profile'}).click()
    await window.getByLabel('Voice').fill('Friendly and direct')
    await window.getByLabel('Primary audience').fill('Families')
    await window.getByLabel('Visual style').fill('Photorealistic')
    await window.getByRole('button',{name:'Create record'}).click()
    await expect(window.getByRole('button',{name:'Edit brand profile'})).toBeVisible()
    await window.getByRole('button',{name:'Edit brand profile'}).click()
    await window.getByLabel('Voice').fill('Warm and direct')
    await window.getByRole('button',{name:'Save changes'}).click()
    await expect(window.getByText('Warm and direct')).toBeVisible()
    await expect(window.getByText(/UNIQUE constraint failed/i)).toHaveCount(0)

    await window.getByRole('button',{name:'Menu'}).click()
    await window.getByRole('button',{name:'Add menu'}).click()
    await window.getByLabel('Item name').fill('Classic Cheese Pizza')
    await window.getByLabel('Description').fill('House sauce and mozzarella')
    await window.getByLabel('Price in cents').fill('1950')
    await window.getByRole('button',{name:'Create record'}).click()
    await expect(window.getByText('Classic Cheese Pizza')).toBeVisible()

    await window.getByRole('button',{name:'Promotions'}).click()
    await window.getByRole('button',{name:'Add promotion'}).click()
    await window.getByPlaceholder(/Bring families in/).fill('Bring families in on a slow Tuesday night')
    await window.getByRole('button',{name:'Suggest promotion'}).click()
    await expect(window.getByText('Classic Cheese Pizza night')).toBeVisible()
    await window.getByRole('button',{name:'Use this idea'}).click()
    await expect(window.getByLabel('Promotion name')).toHaveValue('Classic Cheese Pizza night')
    await expect(window.getByLabel('Customer terms')).not.toHaveValue('')

    const appPath = await electronApp.evaluate(({ app }) => app.getAppPath())
    expect(appPath).toBeTruthy()
  } finally {
    await electronApp.close()
    await rm(userData,{recursive:true,force:true})
  }
})
