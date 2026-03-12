import { expect, test, type Page } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import { createTestItem, createTestList } from './helpers/lists'
import { clearRememberedItems, seedRememberedItem } from './helpers/remembered-items'

test.use({
  viewport: { width: 390, height: 844 },
})

async function loginAndOpenList(page: Page, email: string, password: string, listId: string) {
  await page.goto('/logg-inn', { waitUntil: 'networkidle' })
  await page.fill('[type=email]', email)
  await page.fill('[type=password]', password)
  await page.click('button:has-text("Logg inn")')
  await page.waitForURL('/')
  await page.waitForLoadState('networkidle')
  await page.goto(`/lister/${listId}`, { waitUntil: 'networkidle' })
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(metrics.scrollWidth).toBeLessThanOrEqual(Math.max(metrics.innerWidth, metrics.clientWidth))
}

test.describe('mobile layout hardening', () => {
  test('list screen keeps the bottom dock pinned without horizontal overflow', async ({ page }) => {
    const email = `mobile-layout-dock-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      const list = await createTestList(household.id, 'Mobiltest')
      await loginAndOpenList(page, email, password, list.id)

      const dock = page.getByTestId('bottom-dock')
      await expect(dock).toBeVisible()
      await expectNoHorizontalOverflow(page)

      const box = await dock.boundingBox()
      if (!box) throw new Error('Expected bottom dock bounding box')

      expect(box.y + box.height).toBeLessThanOrEqual(844)
      expect(box.height).toBeGreaterThanOrEqual(72)
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('item detail sheet keeps actions visible on a phone viewport', async ({ page }) => {
    const email = `mobile-layout-sheet-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      const list = await createTestList(household.id, 'Mobilark')
      await createTestItem(list.id, 'Agurk', 2, null)

      await loginAndOpenList(page, email, password, list.id)

      const itemRow = page.getByRole('checkbox', { name: /Agurk/ }).first()
      const rowBox = await itemRow.boundingBox()

      if (!rowBox) throw new Error('Expected Agurk item row to have a bounding box')

      await page.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(650)
      await page.mouse.up()

      const openDialog = page.locator('dialog[open]').first()
      const actions = openDialog.getByTestId('sheet-actions')
      await expect(actions).toBeVisible()
      await expect(openDialog.getByRole('button', { name: 'Lagre' })).toBeVisible()
      await expect(openDialog.getByRole('button', { name: 'Lukk', exact: true })).toBeVisible()
      await expectNoHorizontalOverflow(page)

      const actionBox = await actions.boundingBox()
      if (!actionBox) throw new Error('Expected sheet action area bounding box')

      expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(844)
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('visible row stepper stays inside the phone viewport without horizontal overflow', async ({ page }) => {
    const email = `mobile-layout-stepper-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      const list = await createTestList(household.id, 'Mobilsteg')
      await createTestItem(list.id, 'Ekstra lang vare for smal skjerm', 3, null)

      await loginAndOpenList(page, email, password, list.id)

      const row = page.getByRole('checkbox', { name: /Ekstra lang vare/ }).first()
      const stepper = row.getByTestId('item-stepper')
      await expect(stepper).toBeVisible()
      await expect(stepper.getByTestId('item-quantity')).toHaveText('3')
      await expectNoHorizontalOverflow(page)

      const box = await stepper.boundingBox()
      if (!box) throw new Error('Expected item stepper bounding box')

      expect(box.x + box.width).toBeLessThanOrEqual(390)
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('remembered suggestions stay inside the add-bar shell on a phone viewport', async ({ page }) => {
    const email = `mobile-layout-remembered-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      const list = await createTestList(household.id, 'Mobilforslag')
      await Promise.all([
        seedRememberedItem({
          householdId: household.id,
          name: 'Melk',
          useCount: 4,
          lastUsedAt: '2026-03-12T09:00:00.000Z',
        }),
        seedRememberedItem({
          householdId: household.id,
          name: 'Melon',
          useCount: 3,
          lastUsedAt: '2026-03-11T09:00:00.000Z',
        }),
        seedRememberedItem({
          householdId: household.id,
          name: 'Melkesjokolade',
          useCount: 2,
          lastUsedAt: '2026-03-10T09:00:00.000Z',
        }),
      ])

      await loginAndOpenList(page, email, password, list.id)
      await page.getByTestId('add-item-input').fill('m')

      const shell = page.getByTestId('add-bar-shell')
      const dropdown = page.getByTestId('remembered-suggestions')
      await expect(dropdown).toBeVisible()
      await expectNoHorizontalOverflow(page)

      const shellBox = await shell.boundingBox()
      const dropdownBox = await dropdown.boundingBox()

      if (!shellBox || !dropdownBox) {
        throw new Error('Expected add-bar shell and remembered dropdown bounding boxes')
      }

      expect(dropdownBox.x).toBeGreaterThanOrEqual(shellBox.x)
      expect(dropdownBox.x + dropdownBox.width).toBeLessThanOrEqual(shellBox.x + shellBox.width)
      expect(dropdownBox.y + dropdownBox.height).toBeLessThanOrEqual(844)
    } finally {
      await clearRememberedItems(household.id)
      await deleteTestUser(user.id)
    }
  })
})
