import { expect, test, type Page } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import { createTestCategory, deleteTestCategory } from './helpers/categories'
import { createTestItem, createTestList } from './helpers/lists'
import { createAuthenticatedTestClient, clearRememberedItems, seedRememberedItem } from './helpers/remembered-items'

async function searchRememberedItems(query: string, client: Awaited<ReturnType<typeof createAuthenticatedTestClient>>) {
  const { data, error } = await client.rpc('search_household_item_memory', {
    p_query: query,
    p_limit: 5,
  })

  if (error) {
    throw error
  }

  return data ?? []
}

async function loginAndOpenList(page: Page, email: string, password: string, listId: string) {
  await page.goto('/logg-inn', { waitUntil: 'networkidle' })
  await page.fill('[type=email]', email)
  await page.fill('[type=password]', password)
  await page.click('button:has-text("Logg inn")')
  await page.waitForURL('/')
  await page.waitForLoadState('networkidle')
  await page.goto(`/lister/${listId}`, { waitUntil: 'networkidle' })
  await expect(page.getByTestId('add-item-input')).toBeVisible()
}

test.describe('remembered item memory', () => {
  test('search is household-scoped, starts from one letter, and caps results at five', async () => {
    const password = 'password123'
    const primaryEmail = `remembered-items-a-${Date.now()}@test.example`
    const secondaryEmail = `remembered-items-b-${Date.now()}@test.example`
    const { user: primaryUser, household: primaryHousehold } = await createHouseholdUser(primaryEmail, password)
    const { user: secondaryUser, household: secondaryHousehold } = await createHouseholdUser(
      secondaryEmail,
      password
    )

    try {
      await Promise.all([
        seedRememberedItem({
          householdId: primaryHousehold.id,
          name: 'Melkesjokolade',
          useCount: 5,
          lastUsedAt: '2026-03-12T09:00:00.000Z',
        }),
        seedRememberedItem({
          householdId: primaryHousehold.id,
          name: 'Melk',
          useCount: 3,
          lastUsedAt: '2026-03-11T09:00:00.000Z',
        }),
        seedRememberedItem({
          householdId: primaryHousehold.id,
          name: 'Melon',
          useCount: 2,
          lastUsedAt: '2026-03-10T09:00:00.000Z',
        }),
        seedRememberedItem({
          householdId: primaryHousehold.id,
          name: 'Melis',
          useCount: 1,
          lastUsedAt: '2026-03-09T09:00:00.000Z',
        }),
        seedRememberedItem({
          householdId: primaryHousehold.id,
          name: 'Melboller',
          useCount: 4,
          lastUsedAt: '2026-03-08T09:00:00.000Z',
        }),
        seedRememberedItem({
          householdId: primaryHousehold.id,
          name: 'Soyamelk',
          useCount: 9,
          lastUsedAt: '2026-03-12T12:00:00.000Z',
        }),
        seedRememberedItem({
          householdId: secondaryHousehold.id,
          name: 'Melk',
          useCount: 99,
          lastUsedAt: '2026-03-12T12:00:00.000Z',
        }),
      ])

      const client = await createAuthenticatedTestClient(primaryEmail, password)
      const results = await searchRememberedItems('m', client)

      expect(results).toHaveLength(5)
      expect(results.map((row) => row.item_name)).toEqual([
        'Melkesjokolade',
        'Melboller',
        'Melk',
        'Melon',
        'Melis',
      ])
      expect(results.some((row) => row.use_count === 99)).toBe(false)
    } finally {
      await Promise.all([
        clearRememberedItems(primaryHousehold.id),
        clearRememberedItems(secondaryHousehold.id),
        deleteTestUser(primaryUser.id),
        deleteTestUser(secondaryUser.id),
      ])
    }
  })

  test('narrowing keeps the latest remembered category and deterministic ranking', async () => {
    const password = 'password123'
    const email = `remembered-items-category-${Date.now()}@test.example`
    const { user, household } = await createHouseholdUser(email, password)
    let categoryId: string | null = null

    try {
      categoryId = (await createTestCategory(household.id, 'Meieri', 10)).id

      await Promise.all([
        seedRememberedItem({
          householdId: household.id,
          name: 'Melk',
          categoryId,
          useCount: 4,
          lastUsedAt: '2026-03-12T07:00:00.000Z',
        }),
        seedRememberedItem({
          householdId: household.id,
          name: 'Soyamelk',
          useCount: 7,
          lastUsedAt: '2026-03-12T08:00:00.000Z',
        }),
      ])

      const client = await createAuthenticatedTestClient(email, password)
      const results = await searchRememberedItems('melk', client)

      expect(results.map((row) => row.item_name)).toEqual(['Melk', 'Soyamelk'])
      expect(results[0]?.last_category_id).toBe(categoryId)
      expect(results[0]?.normalized_name).toBe('melk')
    } finally {
      await clearRememberedItems(household.id)
      if (categoryId) {
        await deleteTestCategory(categoryId)
      }
      await deleteTestUser(user.id)
    }
  })

  test('typing shows remembered suggestions and narrows them as the query gets more specific', async ({
    page,
  }) => {
    const password = 'password123'
    const email = `remembered-items-ui-${Date.now()}@test.example`
    const { user, household } = await createHouseholdUser(email, password)

    try {
      const list = await createTestList(household.id, 'Forslagsliste')
      await Promise.all([
        seedRememberedItem({
          householdId: household.id,
          name: 'Melk',
          useCount: 4,
          lastUsedAt: '2026-03-12T07:00:00.000Z',
        }),
        seedRememberedItem({
          householdId: household.id,
          name: 'Melon',
          useCount: 3,
          lastUsedAt: '2026-03-11T07:00:00.000Z',
        }),
        seedRememberedItem({
          householdId: household.id,
          name: 'Soyamelk',
          useCount: 2,
          lastUsedAt: '2026-03-10T07:00:00.000Z',
        }),
      ])

      await loginAndOpenList(page, email, password, list.id)

      const input = page.getByTestId('add-item-input')
      await input.fill('m')

      const suggestionList = page.getByTestId('remembered-suggestions')
      await expect(suggestionList).toBeVisible()
      await expect(page.getByTestId('remembered-suggestion-row')).toHaveCount(3)

      await input.fill('melk')
      await expect(page.getByTestId('remembered-suggestion-row')).toHaveCount(2)
      await expect(page.getByTestId('remembered-suggestion-row').first()).toContainText('Melk')
    } finally {
      await clearRememberedItems(household.id)
      await deleteTestUser(user.id)
    }
  })

  test('selecting a remembered suggestion adds the item immediately under its remembered category', async ({
    page,
  }) => {
    const password = 'password123'
    const email = `remembered-items-add-${Date.now()}@test.example`
    const { user, household } = await createHouseholdUser(email, password)
    let categoryId: string | null = null

    try {
      const list = await createTestList(household.id, 'Hurtigliste')
      categoryId = (await createTestCategory(household.id, 'Meieri', 10)).id

      await seedRememberedItem({
        householdId: household.id,
        name: 'Melk',
        categoryId,
        useCount: 5,
        lastUsedAt: '2026-03-12T09:00:00.000Z',
      })

      await loginAndOpenList(page, email, password, list.id)

      await page.getByTestId('add-item-input').fill('m')
      await page.getByTestId('remembered-suggestion-row').first().click()

      await expect(page.getByRole('checkbox', { name: /Melk/ }).first()).toBeVisible()
      await expect(page.locator('dialog[open]')).toHaveCount(0)
      await expect(page.getByText('Meieri')).toBeVisible()
    } finally {
      await clearRememberedItems(household.id)
      if (categoryId) {
        await deleteTestCategory(categoryId)
      }
      await deleteTestUser(user.id)
    }
  })

  test('remembered add reuses the most recent category and keeps quantity at one', async ({ page }) => {
    const password = 'password123'
    const email = `remembered-items-latest-category-${Date.now()}@test.example`
    const { user, household } = await createHouseholdUser(email, password)
    let olderCategoryId: string | null = null
    let latestCategoryId: string | null = null

    try {
      const list = await createTestList(household.id, 'Kategoriliste')
      const olderList = await createTestList(household.id, 'Tidligere liste')
      olderCategoryId = (await createTestCategory(household.id, 'Meieri', 10)).id
      latestCategoryId = (await createTestCategory(household.id, 'Drikke', 20)).id

      await createTestItem(olderList.id, 'Melk', 1, olderCategoryId)
      await createTestItem(list.id, 'Melk', 1, latestCategoryId)

      await loginAndOpenList(page, email, password, list.id)
      await page.getByTestId('add-item-input').fill('m')
      await page.getByTestId('remembered-suggestion-row').first().click()

      const melkRows = page.getByRole('checkbox', { name: /Melk/ })
      await expect(melkRows).toHaveCount(2)
      await expect(page.getByText('Drikke')).toBeVisible()
      await expect(melkRows.last().getByTestId('item-quantity')).toHaveText('1')
      await expect(page.locator('dialog[open]')).toHaveCount(0)
    } finally {
      await clearRememberedItems(household.id)
      if (olderCategoryId) {
        await deleteTestCategory(olderCategoryId)
      }
      if (latestCategoryId) {
        await deleteTestCategory(latestCategoryId)
      }
      await deleteTestUser(user.id)
    }
  })

  test('stale remembered category falls back to the existing picker flow', async ({ page }) => {
    const password = 'password123'
    const primaryEmail = `remembered-items-stale-${Date.now()}@test.example`
    const secondaryEmail = `remembered-items-stale-other-${Date.now()}@test.example`
    const { user: primaryUser, household: primaryHousehold } = await createHouseholdUser(primaryEmail, password)
    const { user: secondaryUser, household: secondaryHousehold } = await createHouseholdUser(
      secondaryEmail,
      password
    )
    let foreignCategoryId: string | null = null
    let localCategoryId: string | null = null

    try {
      const list = await createTestList(primaryHousehold.id, 'Fallbackliste')
      localCategoryId = (await createTestCategory(primaryHousehold.id, 'Lokal kategori', 10)).id
      foreignCategoryId = (await createTestCategory(secondaryHousehold.id, 'Fremmed kategori', 10)).id

      await seedRememberedItem({
        householdId: primaryHousehold.id,
        name: 'Melk',
        categoryId: foreignCategoryId,
        useCount: 2,
        lastUsedAt: '2026-03-12T09:00:00.000Z',
      })

      await loginAndOpenList(page, primaryEmail, password, list.id)
      await page.getByTestId('add-item-input').fill('m')
      await page.getByTestId('remembered-suggestion-row').first().click()

      await expect(page.locator('dialog[open]')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Velg kategori' })).toBeVisible()
    } finally {
      await clearRememberedItems(primaryHousehold.id)
      if (localCategoryId) {
        await deleteTestCategory(localCategoryId)
      }
      if (foreignCategoryId) {
        await deleteTestCategory(foreignCategoryId)
      }
      await Promise.all([deleteTestUser(primaryUser.id), deleteTestUser(secondaryUser.id)])
    }
  })
})
