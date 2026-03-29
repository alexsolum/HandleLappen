import { expect, test, type BrowserContext } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'

let userId: string
let authContext: BrowserContext

test.describe('Admin Hub Activation', () => {
  test.beforeAll(async ({ browser }) => {
    const email = `admin-test-${Date.now()}@test.example`
    const password = 'password123'
    const { user } = await createHouseholdUser(email, password)
    userId = user.id

    // Sign in once and capture storage state for reuse across tests
    const setupContext = await browser.newContext()
    const setupPage = await setupContext.newPage()
    await setupPage.goto('/logg-inn', { waitUntil: 'networkidle' })
    await setupPage.fill('[type=email]', email)
    await setupPage.fill('[type=password]', password)
    await setupPage.click('button:has-text("Logg inn")')
    await setupPage.waitForURL('/')
    await setupPage.waitForLoadState('networkidle')

    const storageState = await setupContext.storageState()
    await setupContext.close()

    authContext = await browser.newContext({ storageState })
  })

  test.afterAll(async () => {
    if (authContext) await authContext.close()
    if (userId) await deleteTestUser(userId)
  })

  test('Admin hub shows links for Butikker, Husstand, and Historikk', async () => {
    const page = await authContext.newPage()
    try {
      await page.goto('/admin', { waitUntil: 'networkidle' })
      
      const butikkerLink = page.getByRole('link', { name: 'Butikker' })
      await expect(butikkerLink).toBeVisible()
      await expect(butikkerLink).toHaveAttribute('href', '/admin/butikker')

      const husstandLink = page.getByRole('link', { name: 'Husstand' })
      await expect(husstandLink).toBeVisible()
      await expect(husstandLink).toHaveAttribute('href', '/admin/husstand')

      const historikkLink = page.getByRole('link', { name: 'Historikk' })
      await expect(historikkLink).toBeVisible()
      await expect(historikkLink).toHaveAttribute('href', '/admin/historikk')

      const varekatalogLink = page.getByRole('link', { name: 'Varekatalog' })
      await expect(varekatalogLink).toBeVisible()
      await expect(varekatalogLink).toHaveAttribute('href', '/admin/items')
    } finally {
      await page.close()
    }
  })

  test('Admin hub shows Brukerinnstillinger link and opens settings page', async () => {
    const page = await authContext.newPage()
    try {
      await page.goto('/admin', { waitUntil: 'networkidle' })

      const settingsLink = page.getByRole('link', { name: 'Brukerinnstillinger' })
      await expect(settingsLink).toBeVisible()
      await expect(settingsLink).toHaveAttribute('href', '/admin/brukerinnstillinger')

      await settingsLink.click()
      await page.waitForURL('**/admin/brukerinnstillinger')
      await expect(page.getByRole('heading', { name: 'Brukerinnstillinger' })).toBeVisible()
    } finally {
      await page.close()
    }
  })

  test('Clicking Butikker navigates to /admin/butikker', async () => {
    const page = await authContext.newPage()
    try {
      await page.goto('/admin', { waitUntil: 'networkidle' })
      await page.click('a:has-text("Butikker")')
      await page.waitForURL('**/admin/butikker')
      expect(page.url()).toContain('/admin/butikker')
    } finally {
      await page.close()
    }
  })
})
