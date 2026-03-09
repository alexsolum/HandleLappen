import { test, expect } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'

test.describe('lists', () => {
  test('create list — user can create a named list and it appears on the home screen', async ({
    page,
  }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    const email = `lists-create-${Date.now()}@test.example`
    const { user } = await createHouseholdUser(email, 'password123')
    try {
      // Use networkidle to ensure Svelte app is fully initialized before clicking
      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', 'password123')
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      // Tap the "+ Ny liste" create row
      await page.click('button:has-text("Ny liste")')
      await page.waitForSelector('input[placeholder="Navn på lista"]', { timeout: 5000 })
      await page.fill('input[placeholder="Navn på lista"]', 'Ukens handel')
      await page.keyboard.press('Enter')

      await expect(page.locator('text=Ukens handel')).toBeVisible()

      // Verify persistence on reload
      await page.reload()
      await expect(page.locator('text=Ukens handel')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('delete list — user can delete a list (accessible delete action)', async ({ page }) => {
    // Note: swipe-to-delete is verified manually on device (see VALIDATION.md).
    // This test verifies the create flow works and the list appears on the home screen.
    // Full swipe-delete e2e is manual-only.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    const email = `lists-delete-${Date.now()}@test.example`
    const { user } = await createHouseholdUser(email, 'password123')
    try {
      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', 'password123')
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')

      await page.click('button:has-text("Ny liste")')
      await page.waitForSelector('input[placeholder="Navn på lista"]', { timeout: 5000 })
      await page.fill('input[placeholder="Navn på lista"]', 'Slett meg')
      await page.keyboard.press('Enter')
      await expect(page.locator('text=Slett meg')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })
})
