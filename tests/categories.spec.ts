import { expect, test } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import {
  createTestCategory,
  createTestStore,
  deleteTestCategory,
  deleteTestStore,
  seedDefaultCategories,
} from './helpers/categories'

void expect
void [
  createHouseholdUser,
  deleteTestUser,
  createTestCategory,
  seedDefaultCategories,
  deleteTestCategory,
  createTestStore,
  deleteTestStore,
]

test.describe('category grouping', () => {
  test('items in a list are grouped under category section headers', async ({ page }) => {
    test.skip()
    await page.goto('/')
  })
})

test.describe('default order', () => {
  test('categories appear in Norwegian store layout order (Frukt og grønt first)', async ({ page }) => {
    test.skip()
    await page.goto('/')
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
