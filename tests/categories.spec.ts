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
      const dairy = categories.find((category) => category.name === 'Meieriprodukter')

      if (!produce || !dairy) {
        throw new Error('Expected seeded default categories to include Frukt og grønt and Meieriprodukter')
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
      await expect(
        page.locator('div.bg-gray-50.text-xs.font-semibold.uppercase.tracking-wider.text-gray-500', {
          hasText: 'Frukt og grønt',
        })
      ).toBeVisible()
      await expect(
        page.locator('div.bg-gray-50.text-xs.font-semibold.uppercase.tracking-wider.text-gray-500', {
          hasText: 'Meieri og egg',
        })
      ).toHaveCount(0)
      await expect(
        page.locator('div.bg-gray-50.text-xs.font-semibold.uppercase.tracking-wider.text-gray-500', {
          hasText: 'Meieriprodukter',
        })
      ).toBeVisible()
      await expect(
        page.locator('div.bg-gray-50.text-xs.font-semibold.uppercase.tracking-wider.text-gray-500', {
          hasText: 'Andre varer',
        })
      ).toBeVisible()

      const activeCard = page.locator('div.rounded-xl.border.border-gray-200.bg-white')
      await expect(activeCard.locator('text=Bananer')).toBeVisible()
      await expect(activeCard.locator('text=Melk')).toBeVisible()
      await expect(activeCard.locator('text=Batterier')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('items stay visible after selecting a store layout', async ({ page }) => {
    const email = `categories-store-select-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      await seedDefaultCategories(household.id)
      const store = await createTestStore(household.id, 'Meny Test')
      const list = await createTestList(household.id, 'Butikkvalg')
      const categories = await listTestCategories(household.id)
      const produce = categories.find((category) => category.name === 'Frukt og grønt')

      if (!produce) {
        throw new Error('Expected seeded default categories to include Frukt og grønt')
      }

      await createTestItem(list.id, 'Paprika', 1, produce.id)

      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', password)
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

      await page.getByRole('button', { name: /Butikk:\s*Ingen/i }).click()
      await page.getByRole('button', { name: 'Meny Test' }).click()

      await expect(page.locator('text=Laster kategorier…')).toHaveCount(0)
      await expect(page.getByRole('button', { name: /Butikk:\s*Meny Test/i })).toBeVisible()
      await expect(page.locator('text=Paprika')).toBeVisible()
      await expect(
        page.locator('div.bg-gray-50.text-xs.font-semibold.uppercase.tracking-wider.text-gray-500', {
          hasText: 'Frukt og grønt',
        })
      ).toBeVisible()

      void store
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
      const dairy = categories.find((category) => category.name === 'Meieriprodukter')

      if (!produce || !dairy) {
        throw new Error('Expected seeded default categories to include Frukt og grønt and Meieriprodukter')
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
      expect(texts.indexOf('Meieriprodukter')).toBeGreaterThanOrEqual(0)
      expect(texts.indexOf('Frukt og grønt')).toBeLessThan(texts.indexOf('Meieriprodukter'))
    } finally {
      await deleteTestUser(user.id)
    }
  })
})

test.describe('store layout', () => {
  test('can create a named store and view its layout screen', async ({ page }) => {
    const email = `categories-store-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      await seedDefaultCategories(household.id)

      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', password)
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto('/butikker', { waitUntil: 'networkidle' })

      await expect(page.getByRole('link', { name: /Standard rekkefølge/i })).toBeVisible()
      await expect(page.locator('text=Legg til butikk')).toBeVisible()

      await page.getByRole('button', { name: /Legg til butikk/i }).click()
      await page.fill('#new-store-name', 'Rema 1000 Test')
      await page.getByRole('button', { name: 'Lagre' }).click()

      const storeLink = page.locator('a[href^="/butikker/"]:has-text("Rema 1000 Test")')
      await expect(storeLink).toBeVisible()
      await storeLink.click()

      await page.waitForURL(/\/butikker\/[0-9a-f-]+$/)
      await expect(page.locator('text=Frukt og grønt')).toBeVisible()
      await expect(page.locator('text=Frysevarer')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })
})

test.describe('category crud', () => {
  test('can add a new category on the standard layout screen', async ({ page }) => {
    const email = `categories-add-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      await seedDefaultCategories(household.id)

      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', password)
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto('/butikker/standard', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /Legg til kategori/i }).click()
      await page.fill('#new-category-name', 'Testkategori')
      await page.getByRole('button', { name: 'Lagre kategori' }).click()

      await expect(page.locator('text=Testkategori')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('can rename a category', async ({ page }) => {
    const email = `categories-rename-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      await seedDefaultCategories(household.id)

      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', password)
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto('/butikker/standard', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /Gi nytt navn til Frukt og grønt/i }).click()
      const renameInput = page.locator('input').first()
      await expect(renameInput).toBeVisible()
      await renameInput.fill('Frukt og bær')
      await page.getByRole('button', { name: 'Lagre' }).click()

      await expect(page.locator('text=Frukt og bær')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('can delete a category', async ({ page }) => {
    const email = `categories-delete-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      await seedDefaultCategories(household.id)
      await createTestCategory(household.id, 'Slett meg', 400)

      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', password)
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto('/butikker/standard', { waitUntil: 'networkidle' })
      await expect(page.locator('text=Slett meg')).toBeVisible()
      await page.getByRole('button', { name: /Slett Slett meg/i }).click()
      await expect(page.locator('text=Slett meg')).toHaveCount(0)
    } finally {
      await deleteTestUser(user.id)
    }
  })
})

test.describe('assign category', () => {
  test('category picker modal appears after adding uncategorized item', async ({ page }) => {
    const email = `categories-picker-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      await seedDefaultCategories(household.id)
      const list = await createTestList(household.id, 'Kategori etter legg til')

      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', password)
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

      await page.getByPlaceholder('Legg til vare…').fill('Kaffe')
      await page.getByRole('button', { name: 'Legg til' }).click()

      const dialog = page.locator('dialog[open]')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('Velg kategori')).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Hopp over' })).toBeVisible()

      await dialog.getByRole('button', { name: 'Hopp over' }).click()
      await expect(dialog).toHaveCount(0)

      const uncategorizedSection = page.locator('div', { hasText: 'Andre varer' }).first()
      await expect(uncategorizedSection).toBeVisible()
      await expect(page.locator('text=Kaffe')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('assigning category moves item to correct group immediately', async ({ page }) => {
    const email = `categories-assign-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      await seedDefaultCategories(household.id)
      const list = await createTestList(household.id, 'Direkte kategori')

      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', password)
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

      await page.getByPlaceholder('Legg til vare…').fill('Tomater')
      await page.getByRole('button', { name: 'Legg til' }).click()

      const dialog = page.locator('dialog[open]')
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: 'Frukt og grønt' }).click()
      await expect(dialog).toHaveCount(0)

      const produceSection = page.locator('div.bg-gray-50.text-xs.font-semibold.uppercase.tracking-wider.text-gray-500', {
        hasText: 'Frukt og grønt',
      })
      await expect(produceSection).toBeVisible()
      await expect(page.locator('text=Tomater')).toBeVisible()
      await expect(page.locator('div.bg-gray-50.text-xs.font-semibold.uppercase.tracking-wider.text-gray-500', { hasText: 'Andre varer' })).toHaveCount(0)
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('long-press on item row opens detail sheet', async ({ page }) => {
    const email = `categories-detail-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)

    try {
      await seedDefaultCategories(household.id)
      const list = await createTestList(household.id, 'Langtrykk')
      await createTestItem(list.id, 'Agurk', 2, null)

      await page.goto('/logg-inn', { waitUntil: 'networkidle' })
      await page.fill('[type=email]', email)
      await page.fill('[type=password]', password)
      await page.click('button:has-text("Logg inn")')
      await page.waitForURL('/')
      await page.waitForLoadState('networkidle')

      await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

      const itemRow = page.getByRole('button', { name: /Agurk/ }).first()
      const box = await itemRow.boundingBox()

      if (!box) {
        throw new Error('Expected Agurk item row to have a bounding box')
      }

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(600)
      await page.mouse.up()

      const dialog = page.locator('dialog[open]')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('Rediger vare')).toBeVisible()
      await expect(dialog.locator('input[type=\"text\"]')).toHaveValue('Agurk')
      await expect(dialog.locator('input[type=\"number\"]')).toHaveValue('2')
      await expect(dialog.getByText('Frukt og grønt')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })
})
