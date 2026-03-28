import { expect, test, type Page, type Route } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import {
  clearHistoryForList,
  countHistoryRowsByListAndItem,
  createHistorySessions,
} from './helpers/history'
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
  await page.waitForLoadState('networkidle')
}

async function expectPendingQueueCount(page: Page, expected: number) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          return (window as Window & { __pendingQueueCount?: number }).__pendingQueueCount ?? 0
        }),
      { timeout: 45_000 }
    )
    .toBe(expected)
}

test.describe('recommendations', () => {
  let fixture: Fixture | null = null

  test.beforeEach(async ({ page }) => {
    const email = `recommendations-${Date.now()}-${Math.round(Math.random() * 1000)}@test.example`
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

  test('cold-start shows the direct 10-session message', async ({ page }) => {
    await createHistorySessions(fixture!.listId, [
      {
        checkedAt: '2026-03-01T12:00:00.000Z',
        items: [{ itemName: 'Melk', checkedBy: fixture!.userId, listName: 'Ukeshandel' }],
      },
    ])

    await page.goto('/anbefalinger', { waitUntil: 'networkidle' })

    await expect(page.getByText('Anbefalinger vises etter 10 handleøkter.')).toBeVisible()
    await expect(page.getByText('Dere har 1 av 10 økter så langt.')).toBeVisible()
  })

  test('shows the open-list prompt when there is enough history but no active list context', async ({ page }) => {
    const sessions = Array.from({ length: 10 }, (_, index) => ({
      checkedAt: `2026-02-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
      items: [{ itemName: 'Melk', checkedBy: fixture!.userId, listName: 'Ukeshandel' }],
    }))

    await createHistorySessions(fixture!.listId, sessions)
    await page.goto('/anbefalinger', { waitUntil: 'networkidle' })

    await expect(page.getByText('Åpne en liste for å se forslag som passer det dere handler nå.')).toBeVisible()
  })

  test('blends co-purchase and frequency suggestions when an active list is provided', async ({ page }) => {
    const sessions = Array.from({ length: 10 }, (_, index) => ({
      checkedAt: `2026-02-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
      items: [
        { itemName: 'Melk', checkedBy: fixture!.userId, listName: 'Ukeshandel', storeName: 'Rema 1000' },
        { itemName: 'Bananer', checkedBy: fixture!.userId, listName: 'Ukeshandel', storeName: 'Rema 1000' },
      ],
    }))

    await createHistorySessions(fixture!.listId, sessions)
    await createTestItem(fixture!.listId, 'Melk', 1)

    await page.goto(`/anbefalinger?list=${fixture!.listId}`, { waitUntil: 'networkidle' })

    await expect(page.getByTestId('recommendation-list')).toBeVisible()
    await expect(page.getByTestId('recommendation-row').first()).toContainText('Bananer')
    await expect(page.getByText('Kjøpes med Melk')).toBeVisible()
  })

  test('BottomNav carries active list context into the Anbefalinger tab', async ({ page }) => {
    await page.goto(`/lister/${fixture!.listId}`, { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Anbefalinger' }).click()

    await expect(page).toHaveURL(new RegExp(`/anbefalinger\\?list=${fixture!.listId}$`))
  })

  test('recommendation add-back goes straight to the active list and restores an active row', async ({ page }) => {
    const sessions = Array.from({ length: 10 }, (_, index) => ({
      checkedAt: `2026-02-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
      items: [
        { itemName: 'Melk', checkedBy: fixture!.userId, listName: 'Ukeshandel', storeName: 'Rema 1000' },
        { itemName: 'Bananer', checkedBy: fixture!.userId, listName: 'Ukeshandel', storeName: 'Rema 1000' },
      ],
    }))

    await createHistorySessions(fixture!.listId, sessions)
    await createTestItem(fixture!.listId, 'Melk', 1)
    await createTestItem(fixture!.listId, 'Bananer', 1)

    await page.goto(`/lister/${fixture!.listId}`, { waitUntil: 'networkidle' })
    await page.getByRole('checkbox', { name: /Bananer/ }).click()
    await expect(page.getByText('Handlet (1)')).toBeVisible()
    await page.getByRole('link', { name: 'Anbefalinger' }).click()

    await page.getByTestId('recommendation-row').first().click()
    await expect(page.getByTestId('add-back-toast')).toContainText('Bananer lagt til')

    await page.goto(`/lister/${fixture!.listId}`, { waitUntil: 'networkidle' })
    await expect(page.getByText('Bananer · 1')).toBeVisible()
    await expect(page.getByText('Handlet (1)')).toBeVisible()
  })

  test('falls back to frequency suggestions when co-purchase is not available', async ({ page }) => {
    const sessions = Array.from({ length: 10 }, (_, index) => ({
      checkedAt: `2026-01-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
      items: [{ itemName: 'Kaffe', checkedBy: fixture!.userId, listName: 'Ukeshandel' }],
    }))

    await createHistorySessions(fixture!.listId, sessions)
    await createTestItem(fixture!.listId, 'Melk', 1)

    await page.goto(`/anbefalinger?list=${fixture!.listId}`, { waitUntil: 'networkidle' })

    const recommendationList = page.getByTestId('recommendation-list')
    await expect(recommendationList.getByText('Kaffe')).toBeVisible()
    await expect(recommendationList.getByText('Ofte kjøpt')).toBeVisible()
  })

  test('stable after replay retry does not inflate recommendation source counts', async ({
    page,
    context,
  }) => {
    const sessions = Array.from({ length: 10 }, (_, index) => ({
      checkedAt: `2026-01-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
      items: [
        { itemName: 'Melk', checkedBy: fixture!.userId, listName: 'Ukeshandel', storeName: 'Rema 1000' },
        { itemName: 'Bananer', checkedBy: fixture!.userId, listName: 'Ukeshandel', storeName: 'Rema 1000' },
      ],
    }))

    await createHistorySessions(fixture!.listId, sessions)
    await createTestItem(fixture!.listId, 'Melk', 1)
    await createTestItem(fixture!.listId, 'Brød', 1)

    const initialMelkCount = await countHistoryRowsByListAndItem(fixture!.listId, 'Melk')
    const initialBrodCount = await countHistoryRowsByListAndItem(fixture!.listId, 'Brød')

    await page.goto(`/lister/${fixture!.listId}`, { waitUntil: 'networkidle' })
    await context.setOffline(true)
    await expect(page.getByTestId('offline-indicator')).toBeVisible()

    await page.getByRole('checkbox', { name: /Melk/ }).click()
    await page.getByRole('checkbox', { name: /Brød/ }).click()
    await expectPendingQueueCount(page, 2)

    let failedBrodPost = false
    const historyRoutePattern = '**/rest/v1/item_history*'
    const historyRouteHandler = async (route: Route) => {
      const request = route.request()
      if (request.method() !== 'POST') {
        await route.continue()
        return
      }

      const body = request.postDataJSON() as Record<string, unknown> | Array<Record<string, unknown>> | null
      const payload = Array.isArray(body) ? body[0] : body
      const itemName = typeof payload?.item_name === 'string' ? payload.item_name : ''

      if (!failedBrodPost && itemName === 'Brød') {
        failedBrodPost = true
        await route.fulfill({ status: 500, body: '{"message":"forced failure"}' })
        return
      }

      await route.continue()
    }

    await page.route(historyRoutePattern, historyRouteHandler)

    await context.setOffline(false)
    await expectPendingQueueCount(page, 1)
    await expect.poll(() => countHistoryRowsByListAndItem(fixture!.listId, 'Melk')).toBe(initialMelkCount + 1)
    await expect.poll(() => countHistoryRowsByListAndItem(fixture!.listId, 'Brød')).toBe(initialBrodCount)

    await page.unroute(historyRoutePattern, historyRouteHandler)

    await context.setOffline(true)
    await expect(page.getByTestId('offline-indicator')).toBeVisible()
    await context.setOffline(false)

    await expectPendingQueueCount(page, 0)
    await expect.poll(() => countHistoryRowsByListAndItem(fixture!.listId, 'Melk')).toBe(initialMelkCount + 1)
    await expect.poll(() => countHistoryRowsByListAndItem(fixture!.listId, 'Brød')).toBe(initialBrodCount + 1)

    await page.goto(`/anbefalinger?list=${fixture!.listId}`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('recommendation-list')).toBeVisible()
    await expect(page.getByTestId('recommendation-row').first()).toBeVisible()
  })
})
