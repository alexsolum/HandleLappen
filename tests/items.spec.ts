import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import { createTestList } from './helpers/lists'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

test.describe('items', () => {
  test('add item — user types a name and the item appears and persists on reload', async ({
    page,
  }) => {
    const { user, household } = await createHouseholdUser('items-add@test.example', 'password123')
    const list = await createTestList(household.id, 'Testliste')
    try {
      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', 'items-add@test.example')
      await page.fill('[type=password]', 'password123')
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

      await page.waitForSelector('input[placeholder="Legg til vare…"]')
      await page.fill('input[placeholder="Legg til vare…"]', 'Melk')
      await page.keyboard.press('Enter')

      await expect(page.locator('text=Melk')).toBeVisible()

      await page.reload({ waitUntil: 'networkidle' })
      await expect(page.locator('text=Melk')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('check off — user taps item and it moves to Handlet section', async ({ page }) => {
    const { user, household } = await createHouseholdUser(
      'items-check@test.example',
      'password123'
    )
    const list = await createTestList(household.id, 'Testliste')
    try {
      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', 'items-check@test.example')
      await page.fill('[type=password]', 'password123')
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

      await page.waitForSelector('input[placeholder="Legg til vare…"]')
      await page.fill('input[placeholder="Legg til vare…"]', 'Brød')
      await page.keyboard.press('Enter')
      await expect(page.locator('text=Brød')).toBeVisible()

      // Wait for add mutation to settle so item has real DB id before checking off
      await page.waitForLoadState('networkidle')

      // Tap item row to check off
      await page.getByRole('button', { name: 'Brød' }).click()

      // Item should appear in "Handlet" section header
      await expect(page.locator('text=Handlet (1)')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('history write — item_history row exists in DB after check-off', async ({ page }) => {
    const { user, household } = await createHouseholdUser('items-hist@test.example', 'password123')
    const list = await createTestList(household.id, 'Testliste')
    try {
      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', 'items-hist@test.example')
      await page.fill('[type=password]', 'password123')
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

      await page.waitForSelector('input[placeholder="Legg til vare…"]')
      await page.fill('input[placeholder="Legg til vare…"]', 'Ost')
      await page.keyboard.press('Enter')
      await expect(page.locator('text=Ost')).toBeVisible()

      // Wait for add mutation to settle so item has real DB id before checking off
      await page.waitForLoadState('networkidle')

      // Click and wait for item_history POST to complete before checking DB
      const historyWritePromise = page.waitForResponse(
        (res) => res.url().includes('item_history') && res.request().method() === 'POST'
      )
      await page.getByRole('button', { name: 'Ost' }).click()
      await historyWritePromise

      // Also confirm the UI shows the item as checked
      await expect(page.locator('text=Handlet (1)')).toBeVisible()

      // Verify item_history row via admin client
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: rows } = await admin
        .from('item_history')
        .select('item_name, checked_by, list_id')
        .eq('list_id', list.id)
        .eq('item_name', 'Ost')

      expect(rows?.length).toBeGreaterThan(0)
      expect(rows?.[0].checked_by).toBe(user.id)
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test.skip(
    'remove item — swipe-delete is manual-only on mobile (see VALIDATION.md)',
    async () => {
      // Swipe-to-delete verified manually on physical iOS/Android device.
    }
  )
})
