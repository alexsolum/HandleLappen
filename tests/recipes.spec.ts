import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createHouseholdUser, deleteTestUser, loginUser } from './helpers/auth'
import { createTestRecipe, addTestIngredient } from './helpers/recipes'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

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

  test('can search for and navigate to recipe detail', async ({ page }) => {
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

test.describe('Recipe Edit Flow', () => {
  let user: any
  let recipe: any

  test.beforeEach(async () => {
    user = await createHouseholdUser(`recipe-edit-${Date.now()}@test.com`, 'password123')
    recipe = await createTestRecipe(user.household.id, 'Original Oppskrift', 'Original beskrivelse')
    await addTestIngredient(recipe.id, 'Mel', 0)
    await addTestIngredient(recipe.id, 'Sukker', 1)
    await addTestIngredient(recipe.id, 'Salt', 2)
  })

  test.afterEach(async () => {
    if (user?.user?.id) {
      await deleteTestUser(user.user.id)
    }
  })

  test('edit page pre-fills name, description, and ingredients', async ({ page }) => {
    await loginUser(page, user.user.email, 'password123')
    await page.goto(`/oppskrifter/${recipe.id}/rediger`)

    await expect(page.getByTestId('edit-recipe-heading')).toBeVisible()
    await expect(page.getByTestId('recipe-name-input')).toHaveValue('Original Oppskrift')

    // All three ingredients should be pre-loaded in the builder
    await expect(page.getByText('Mel')).toBeVisible()
    await expect(page.getByText('Sukker')).toBeVisible()
    await expect(page.getByText('Salt')).toBeVisible()
  })

  test('can update recipe name and verify change on detail page', async ({ page }) => {
    await loginUser(page, user.user.email, 'password123')
    await page.goto(`/oppskrifter/${recipe.id}/rediger`)

    await expect(page.getByTestId('recipe-name-input')).toBeVisible()

    // Change the name
    await page.getByTestId('recipe-name-input').fill('Oppdatert Oppskrift')

    // Save
    await page.getByTestId('save-recipe-button').click()

    // Should redirect to detail page
    await page.waitForURL(`**/oppskrifter/${recipe.id}`)
    await expect(page.getByTestId('recipe-name')).toHaveText('Oppdatert Oppskrift')
  })

  test('can add and remove ingredients during edit', async ({ page }) => {
    await loginUser(page, user.user.email, 'password123')
    await page.goto(`/oppskrifter/${recipe.id}/rediger`)

    await expect(page.getByText('Mel')).toBeVisible()

    // Add a new ingredient
    const input = page.getByPlaceholder('Søk eller skriv inn ingrediens...')
    await input.fill('Vann')
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: 'Legg til' }).click()
    await expect(page.getByText('Vann')).toBeVisible()

    // Save and verify on detail page
    await page.getByTestId('save-recipe-button').click()
    await page.waitForURL(`**/oppskrifter/${recipe.id}`)

    // New ingredient should be visible
    await expect(page.getByText('Vann')).toBeVisible()
    // Existing ingredients should still be visible
    await expect(page.getByText('Mel')).toBeVisible()
  })

  test('edit page is reachable from detail page via Rediger button', async ({ page }) => {
    await loginUser(page, user.user.email, 'password123')
    await page.goto(`/oppskrifter/${recipe.id}`)

    await expect(page.getByTestId('edit-recipe-button')).toBeVisible()
    await page.getByTestId('edit-recipe-button').click()

    await page.waitForURL(`**/oppskrifter/${recipe.id}/rediger`)
    await expect(page.getByTestId('edit-recipe-heading')).toBeVisible()
  })
})

test.describe('Recipe Detail View', () => {
  let user: any
  let recipe: any

  test.beforeEach(async () => {
    user = await createHouseholdUser(`recipe-detail-${Date.now()}@test.com`, 'password123')
    recipe = await createTestRecipe(user.household.id, 'Testoppskrift Carbonara', 'En deilig pasta')
    await addTestIngredient(recipe.id, 'Spaghetti', 0)
    await addTestIngredient(recipe.id, 'Bacon', 1)
    await addTestIngredient(recipe.id, 'Egg', 2)
  })

  test.afterEach(async () => {
    if (user?.user?.id) {
      await deleteTestUser(user.user.id)
    }
  })

  test('loads detail page with name, description, and ingredients', async ({ page }) => {
    await loginUser(page, user.user.email, 'password123')
    await page.goto(`/oppskrifter/${recipe.id}`)

    await expect(page.getByTestId('recipe-name')).toHaveText('Testoppskrift Carbonara')
    await expect(page.getByTestId('recipe-description')).toHaveText('En deilig pasta')
    await expect(page.getByTestId('ingredients-list')).toBeVisible()

    // All three ingredients should be visible
    await expect(page.getByText('Spaghetti')).toBeVisible()
    await expect(page.getByText('Bacon')).toBeVisible()
    await expect(page.getByText('Egg')).toBeVisible()
  })

  test('ingredients are all pre-selected and can be toggled', async ({ page }) => {
    await loginUser(page, user.user.email, 'password123')
    await page.goto(`/oppskrifter/${recipe.id}`)

    // Wait for ingredients to load
    await expect(page.getByTestId('ingredients-list')).toBeVisible()

    // All checkboxes should be checked initially
    const checkboxes = page.getByTestId('ingredient-checkbox')
    await expect(checkboxes).toHaveCount(3)
    for (let i = 0; i < 3; i++) {
      await expect(checkboxes.nth(i)).toBeChecked()
    }

    // Add to list button should show 3
    await expect(page.getByTestId('add-to-list-button')).toContainText('3 ingredienser')

    // Uncheck first ingredient
    await checkboxes.first().uncheck()
    await expect(checkboxes.first()).not.toBeChecked()
    await expect(page.getByTestId('add-to-list-button')).toContainText('2 ingredienser')
  })

  test('can add ingredients to a shopping list', async ({ page }) => {
    // Create a shopping list for the test
    const admin = getAdminClient()
    const { data: list, error: listError } = await admin
      .from('lists')
      .insert({ name: 'Testliste', household_id: user.household.id })
      .select('id, name')
      .single()
    if (listError) throw listError

    await loginUser(page, user.user.email, 'password123')
    await page.goto(`/oppskrifter/${recipe.id}`)

    // Wait for ingredients to load
    await expect(page.getByTestId('ingredients-list')).toBeVisible()

    // Click Add to List
    await page.getByTestId('add-to-list-button').click()

    // List picker sheet should appear
    await expect(page.getByTestId('list-picker-sheet')).toBeVisible()
    await expect(page.getByText('Testliste')).toBeVisible()

    // Select the list
    await page.getByTestId('list-picker-option').click()

    // Toast should confirm
    await expect(page.getByTestId('toast-message')).toBeVisible()
    await expect(page.getByTestId('toast-message')).toContainText('ingredienser')
    await expect(page.getByTestId('toast-message')).toContainText('Testliste')

    // Stay on recipe page
    await expect(page.url()).toContain(`/oppskrifter/${recipe.id}`)

    // Clean up list
    await admin.from('lists').delete().eq('id', list.id)
  })

  test('can delete a recipe', async ({ page }) => {
    await loginUser(page, user.user.email, 'password123')
    await page.goto(`/oppskrifter/${recipe.id}`)

    await expect(page.getByTestId('recipe-name')).toBeVisible()

    // Click delete
    await page.getByTestId('delete-recipe-button').click()

    // Confirmation dialog appears
    await expect(page.getByTestId('delete-confirm-dialog')).toBeVisible()

    // Confirm
    await page.getByTestId('confirm-delete-button').click()

    // Should redirect to list
    await page.waitForURL('**/oppskrifter')
    await expect(page.getByRole('heading', { name: 'Oppskrifter' })).toBeVisible()
  })
})
