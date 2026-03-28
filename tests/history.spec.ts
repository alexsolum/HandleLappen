import { expect, test, type Page } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import { clearHistoryForList, createHistoryEntry } from './helpers/history'
import { createTestItem, createTestList, deleteTestList } from './helpers/lists'

type Fixture = {
  email: string
  householdId: string
  password: string
  userId: string
  listId: string
}

async function login(page: Page, fixture: Fixture) {
  await page.goto('/logg-inn', { waitUntil: 'networkidle' })
  await page.fill('[type=email]', fixture.email)
  await page.fill('[type=password]', fixture.password)
  await page.click('button:has-text("Logg inn")')
  await page.waitForURL('/')
  await page.goto('/admin/historikk', { waitUntil: 'networkidle' })
}

test.describe('history', () => {
  let fixture: Fixture | null = null

  test.beforeEach(async ({ page }) => {
    const email = `history-${Date.now()}-${Math.round(Math.random() * 1000)}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Ukeshandel')

    fixture = {
      email,
      householdId: household.id,
      password,
      userId: user.id,
      listId: list.id,
    }

    await createHistoryEntry({
      listId: list.id,
      itemName: 'Melk',
      checkedBy: user.id,
      checkedAt: '2026-03-11T12:00:00.000Z',
      listName: 'Ukeshandel',
      storeName: 'Rema 1000 Storo',
    })
    await createHistoryEntry({
      listId: list.id,
      itemName: 'Brød',
      checkedBy: user.id,
      checkedAt: '2026-03-10T12:00:00.000Z',
      listName: 'Ukeshandel',
    })

    await login(page, fixture)
  })

  test.afterEach(async () => {
    if (fixture) {
      await clearHistoryForList(fixture.listId)
      await deleteTestList(fixture.listId)
      await deleteTestUser(fixture.userId)
      fixture = null
    }
  })

  test('groups history by date and keeps sessions collapsed by default', async ({ page }) => {
    await expect(page.getByRole('link', { name: '← Admin' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Historikk' })).toBeVisible()
    await expect(page.getByTestId('history-date-group')).toHaveCount(2)
    await expect(page.getByTestId('history-session').first()).not.toHaveAttribute('open', '')
  })

  test('shows compact item rows with member attribution after expanding a session', async ({ page }) => {
    await page.getByTestId('history-session').first().click()
    const historyItems = page.getByTestId('history-items').first()
    await expect(historyItems.getByText('Melk')).toBeVisible()
    await expect(historyItems.getByText(/history-.*@test\.example/).first()).toBeVisible()
  })

  test('shows store-first headers when available and list-only fallback for legacy rows', async ({ page }) => {
    await expect(page.getByText('Rema 1000 Storo')).toBeVisible()
    await expect(page.getByTestId('history-session').getByText('Ukeshandel')).toHaveCount(2)
  })

  test('history add-back opens chooser and restores an unchecked row when the chosen list only has a checked copy', async ({
    page,
  }) => {
    const extraList = await createTestList(fixture!.householdId, 'Helgehandel')

    try {
      await createTestItem(extraList.id, 'Melk', 1)
      await page.goto(`/lister/${extraList.id}`, { waitUntil: 'networkidle' })
      await page.getByRole('checkbox', { name: /Melk/ }).click()
      await expect(page.getByText('Handlet (1)')).toBeVisible()

      await page.goto('/admin/historikk', { waitUntil: 'networkidle' })

      await page.getByTestId('history-session').first().click()
      await page.getByTestId('history-add-back').first().click()

      await expect(page.getByTestId('list-target-sheet')).toBeVisible()
      await page.getByRole('button', { name: 'Helgehandel' }).click()
      await expect(page.getByTestId('add-back-toast')).toContainText('Melk lagt til')

      await page.goto(`/lister/${extraList.id}`, { waitUntil: 'networkidle' })
      await expect(page.getByRole('checkbox', { name: /Melk/ })).toHaveCount(2)
      await expect(page.getByText('Handlet (1)')).toBeVisible()
    } finally {
      await clearHistoryForList(extraList.id)
      await deleteTestList(extraList.id)
    }
  })
})
