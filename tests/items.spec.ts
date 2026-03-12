import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import { createTestItem, createTestList } from './helpers/lists'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

async function loginAndOpenList(page: Page, email: string, password: string, listId: string) {
  await page.goto('/logg-inn', { waitUntil: 'networkidle' })
  await page.fill('[type=email]', email)
  await page.fill('[type=password]', password)
  await page.click('button:has-text("Logg inn")')
  await page.waitForURL('/')
  await page.waitForLoadState('networkidle')

  await page.goto(`/lister/${listId}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('input[placeholder="Legg til vare…"]')
}

async function dismissCategoryPicker(page: Page) {
  const dialog = page.locator('dialog[open]').first()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Hopp over' }).click()
}

test.describe('items', () => {
  test('add item defaults to quantity one and persists on reload', async ({ page }) => {
    const email = `items-add-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Testliste')

    try {
      await loginAndOpenList(page, email, password, list.id)
      await page.fill('input[placeholder="Legg til vare…"]', 'Melk')
      await page.keyboard.press('Enter')
      await dismissCategoryPicker(page)

      const row = page.getByRole('checkbox', { name: /Melk/ }).first()
      await expect(row).toBeVisible()
      await expect(row.getByTestId('item-quantity')).toHaveText('1')

      await page.reload({ waitUntil: 'networkidle' })
      await expect(page.getByRole('checkbox', { name: /Melk/ }).getByTestId('item-quantity')).toHaveText('1')
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('check off moves the row to the Handlet section', async ({ page }) => {
    const email = `items-check-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Testliste')

    try {
      await loginAndOpenList(page, email, password, list.id)
      await page.fill('input[placeholder="Legg til vare…"]', 'Brød')
      await page.keyboard.press('Enter')
      await dismissCategoryPicker(page)
      await expect(page.getByRole('checkbox', { name: /Brød/ })).toBeVisible()

      await page.waitForLoadState('networkidle')
      await page.getByRole('checkbox', { name: /Brød/ }).click()
      await expect(page.locator('text=Handlet (1)')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('history write creates an item_history row after check-off', async ({ page }) => {
    const email = `items-hist-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Testliste')

    try {
      await loginAndOpenList(page, email, password, list.id)
      await page.fill('input[placeholder="Legg til vare…"]', 'Ost')
      await page.keyboard.press('Enter')
      await dismissCategoryPicker(page)
      await expect(page.getByRole('checkbox', { name: /Ost/ })).toBeVisible()

      await page.waitForLoadState('networkidle')

      const historyWritePromise = page.waitForResponse(
        (res) => res.url().includes('item_history') && res.request().method() === 'POST'
      )
      await page.getByRole('checkbox', { name: /Ost/ }).click()
      await historyWritePromise

      await expect(page.locator('text=Handlet (1)')).toBeVisible()

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

  test('inline stepper increments and decrements without checking the row off', async ({ page }) => {
    const email = `items-stepper-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Stepperliste')

    try {
      await createTestItem(list.id, 'Agurk', 2, null)
      await loginAndOpenList(page, email, password, list.id)

      const row = page.getByRole('checkbox', { name: /Agurk/ }).first()
      await expect(row.getByTestId('item-quantity')).toHaveText('2')

      await row.getByTestId('item-increment').click()
      await expect(row.getByTestId('item-quantity')).toHaveText('3')
      await expect(page.locator('text=Handlet (1)')).toHaveCount(0)

      await row.getByTestId('item-decrement').click()
      await expect(row.getByTestId('item-quantity')).toHaveText('2')
      await expect(page.locator('text=Handlet (1)')).toHaveCount(0)
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('decrement at one removes the item while row tap still checks off', async ({ page }) => {
    const email = `items-remove-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Fjernliste')

    try {
      await createTestItem(list.id, 'Tomat', 1, null)
      await createTestItem(list.id, 'Brus', 2, null)
      await loginAndOpenList(page, email, password, list.id)

      const removeRow = page.getByRole('checkbox', { name: /Tomat/ }).first()
      await removeRow.getByTestId('item-decrement').click()
      await expect(page.getByRole('checkbox', { name: /Tomat/ })).toHaveCount(0)

      const checkRow = page.getByRole('checkbox', { name: /Brus/ }).first()
      await checkRow.click()
      await expect(page.locator('text=Handlet (1)')).toBeVisible()
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
