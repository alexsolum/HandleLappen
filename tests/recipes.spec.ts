import { expect, test } from '@playwright/test'
import { createHouseholdUser, deleteTestUser, loginUser } from './helpers/auth'

test.describe('Recipe Creation Flow', () => {
  let user: any

  test.beforeEach(async () => {
    user = await createHouseholdUser(`recipe-test-${Date.now()}@test.com`, 'password123')
  })

  test.afterEach(async () => {
    if (user?.user?.id) {
      await deleteTestUser(user.user.id)
    }
  })

  test('can create a new recipe with ingredients', async ({ page }) => {
    await loginUser(page, user.user.email, 'password123')
    
    // Navigate to recipes
    await page.goto('/oppskrifter')
    await expect(page.getByRole('heading', { name: 'Oppskrifter' })).toBeVisible()

    // Click "Ny oppskrift"
    await page.getByRole('link', { name: 'Ny oppskrift' }).click()
    await expect(page.getByRole('heading', { name: 'Ny oppskrift' })).toBeVisible()

    // Fill in recipe details
    const recipeName = `Min Test-Oppskrift ${Date.now()}`
    await page.getByLabel('Navn på oppskrift').fill(recipeName)
    await page.getByPlaceholder('Hvordan lager man denne?').fill('Dette er en test-beskrivelse.')

    // Add ingredients
    const ingredients = ['Melk', 'Brød', 'Egg']
    for (const ingredient of ingredients) {
      const input = page.getByPlaceholder('Søk eller skriv inn ingrediens...')
      await input.fill(ingredient)
      // Small wait to ensure state update
      await page.waitForTimeout(100)
      await page.getByRole('button', { name: 'Legg til' }).click()
      await expect(page.getByText(ingredient)).toBeVisible()
    }

    // Submit recipe
    await page.getByRole('button', { name: 'Lagre oppskrift' }).click()

    // Should redirect back to list and show the new recipe
    await page.waitForURL('**/oppskrifter')
    await expect(page.getByRole('heading', { name: 'Oppskrifter' })).toBeVisible()
    await expect(page.getByText(recipeName)).toBeVisible()
  })

  test('can search for recipes', async ({ page }) => {
    await loginUser(page, user.user.email, 'password123')
    
    // Navigate to recipes/ny to create two recipes
    const recipes = ['Pasta', 'Pizza']
    for (const name of recipes) {
      await page.goto('/oppskrifter/ny')
      await page.getByLabel('Navn på oppskrift').fill(name)
      await page.getByPlaceholder('Søk eller skriv inn ingrediens...').fill('Vann')
      await page.waitForTimeout(100)
      await page.getByRole('button', { name: 'Legg til' }).click()
      await page.getByRole('button', { name: 'Lagre oppskrift' }).click()
      await page.waitForURL('**/oppskrifter')
    }

    // Go to list
    await page.goto('/oppskrifter')
    await expect(page.getByText('Pasta')).toBeVisible()
    await expect(page.getByText('Pizza')).toBeVisible()

    // Search for Pasta
    await page.getByPlaceholder('Søk i oppskrifter...').fill('Pasta')
    await expect(page.getByText('Pasta')).toBeVisible()
    await expect(page.getByText('Pizza')).toBeHidden()

    // Clear search
    await page.getByPlaceholder('Søk i oppskrifter...').fill('')
    await expect(page.getByText('Pasta')).toBeVisible()
    await expect(page.getByText('Pizza')).toBeVisible()
  })
})
