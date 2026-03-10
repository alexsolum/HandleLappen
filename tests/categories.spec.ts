import { expect, test } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import {
  createTestCategory,
  createTestStore,
  deleteTestCategory,
  deleteTestStore,
  listTestCategories,
  seedDefaultCategories,
} from './helpers/categories'
import { createTestItem, createTestList } from './helpers/lists'

void expect
void [
  createHouseholdUser,
  deleteTestUser,
  createTestCategory,
  seedDefaultCategories,
  deleteTestCategory,
  createTestStore,
  deleteTestStore,
  listTestCategories,
  createTestItem,
  createTestList,
]

test.describe('category grouping', () => {
  test('items in a list are grouped under category section headers', async ({ page }) => {
    const email = `categories-group-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      await seedDefaultCategories(household.id)
      const list = await createTestList(household.id, 'Kategoriliste')
      const categories = await listTestCategories(household.id)
      const produce = categories.find((category) => category.name === 'Frukt og grønt')
      const dairy = categories.find((category) => category.name === 'Meieri og egg')

      if (!produce || !dairy) {
        throw new Error('Expected seeded default categories to include Frukt og grønt and Meieri og egg')
      }

      await createTestItem(list.id, 'Bananer', 2, produce.id)
      await createTestItem(list.id, 'Melk', 1, dairy.id)
      await createTestItem(list.id, 'Batterier', 4, null)

      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', password)
      await page.click('button:has-text(\"Logg inn\")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

      await expect(page.getByRole('button', { name: /Butikk:\s*Ingen/i })).toBeVisible()
      await expect(page.locator('text=Frukt og grønt')).toBeVisible()
      await expect(page.locator('text=Meieri og egg')).toBeVisible()
      await expect(page.locator('text=Andre varer')).toBeVisible()

      const activeCard = page.locator('div.rounded-xl.border.border-gray-200.bg-white')
      await expect(activeCard.locator('text=Bananer')).toBeVisible()
      await expect(activeCard.locator('text=Melk')).toBeVisible()
      await expect(activeCard.locator('text=Batterier')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })
})

test.describe('default order', () => {
  test('categories appear in Norwegian store layout order (Frukt og grønt first)', async ({ page }) => {
    const email = `categories-order-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      await seedDefaultCategories(household.id)
      const list = await createTestList(household.id, 'Rekkefolge')
      const categories = await listTestCategories(household.id)
      const produce = categories.find((category) => category.name === 'Frukt og grønt')
      const dairy = categories.find((category) => category.name === 'Meieri og egg')

      if (!produce || !dairy) {
        throw new Error('Expected seeded default categories to include Frukt og grønt and Meieri og egg')
      }

      await createTestItem(list.id, 'Epler', 1, produce.id)
      await createTestItem(list.id, 'Yoghurt', 1, dairy.id)

      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', password)
      await page.click('button:has-text(\"Logg inn\")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

      const headers = page.locator('div.bg-gray-50.text-xs.font-semibold.uppercase.tracking-wider.text-gray-500')
      const texts = await headers.allTextContents()

      expect(texts.indexOf('Frukt og grønt')).toBeGreaterThanOrEqual(0)
      expect(texts.indexOf('Meieri og egg')).toBeGreaterThanOrEqual(0)
      expect(texts.indexOf('Frukt og grønt')).toBeLessThan(texts.indexOf('Meieri og egg'))
    } finally {
      await deleteTestUser(user.id)
    }
  })
})

test.describe('store layout', () => {
  test('can create a named store and view its layout screen', async ({ page }) => {
    test.skip()
    await page.goto('/')
  })
})

test.describe('category crud', () => {
  test('can add a new category on the standard layout screen', async ({ page }) => {
    test.skip()
    await page.goto('/')
  })

  test('can rename a category; change appears on all devices via realtime', async ({ page }) => {
    test.skip()
    await page.goto('/')
  })

  test('can delete a category', async ({ page }) => {
    test.skip()
    await page.goto('/')
  })
})

test.describe('assign category', () => {
  test('category picker modal appears after adding uncategorized item', async ({ page }) => {
    test.skip()
    await page.goto('/')
  })

  test('assigning category moves item to correct group immediately', async ({ page }) => {
    test.skip()
    await page.goto('/')
  })

  test('long-press on item row opens detail sheet', async ({ page }) => {
    test.skip()
    await page.goto('/')
  })
})
