import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { createHouseholdUser, deleteTestUser, loginUser } from './helpers/auth'
import { clearHistoryForList, countHistoryRowsForItem } from './helpers/history'
import { createTestItem, createTestList } from './helpers/lists'
import {
  clearHomeLocation,
  installGeolocationMock,
  mockCurrentHomePosition,
  seedLocatedStore,
  seedHomeLocation,
  setDocumentVisibility,
} from './helpers/location'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function createAdminClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for home location tests')
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function openSettings(page: Page, email: string, password: string) {
  await installGeolocationMock(page, 'nearby-success')
  await loginUser(page, email, password)
  await page.goto('/admin/brukerinnstillinger', { waitUntil: 'networkidle' })
}

async function openList(page: Page, email: string, password: string, listId: string) {
  await loginUser(page, email, password)
  await page.goto(`/lister/${listId}`, { waitUntil: 'networkidle' })
}

async function toggleItem(page: Page, name: string) {
  await page.getByTestId('item-checkbox').filter({ hasText: name }).click({ force: true })
}

async function startListLocation(page: Page) {
  await page.getByRole('button', { name: /Slå på automatisk butikkvalg/i }).click()
  await page.getByRole('button', { name: 'Fortsett' }).click()
}

async function listItemExists(listId: string, itemName: string) {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('list_items')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', listId)
    .eq('name', itemName)

  if (error) throw error
  return (count ?? 0) > 0
}

test.describe('Home location settings', () => {
  test('saves a map-pin home location only after explicit save', async ({ page }) => {
    const email = `home-save-${Date.now()}@test.example`
    const password = 'password123'
    const { user } = await createHouseholdUser(email, password)

    try {
      await openSettings(page, email, password)

      await expect(page.getByRole('heading', { name: 'Brukerinnstillinger' })).toBeVisible()
      await expect(page.getByText('Hjemmeposisjonen din er kun knyttet til din konto.')).toBeVisible()
      await expect(page.getByText('Ikke lagret ennå')).toBeVisible()

      await page.locator('[data-testid="home-location-map"]').click({ position: { x: 120, y: 120 } })
      await expect(page.getByTestId('pending-lat')).not.toHaveText('—')
      await expect(page.getByTestId('pending-lng')).not.toHaveText('—')
      await expect(page.getByRole('button', { name: 'Lagre hjemmeposisjon' })).toBeEnabled()

      await page.getByRole('button', { name: 'Lagre hjemmeposisjon' }).click()
      await expect(page.getByText('Hjemmeposisjon lagret')).toBeVisible()
      await expect(page.getByText('Lagret hjemmeposisjon')).toBeVisible()
    } finally {
      await clearHomeLocation(user.id).catch(() => undefined)
      await deleteTestUser(user.id)
    }
  })

  test('Bruk min posisjon updates pending coordinates without auto-saving', async ({ page }) => {
    const email = `home-current-${Date.now()}@test.example`
    const password = 'password123'
    const { user } = await createHouseholdUser(email, password)

    try {
      await openSettings(page, email, password)
      await mockCurrentHomePosition(page, {
        latitude: 60.3913,
        longitude: 5.3221,
        accuracy: 12,
      })

      await page.getByRole('button', { name: 'Bruk min posisjon' }).click()

      await expect(page.getByText('Klar til lagring')).toBeVisible()
      await expect(page.getByTestId('pending-lat')).toHaveText('60.3913')
      await expect(page.getByTestId('pending-lng')).toHaveText('5.3221')
      await expect(page.getByText('Lagret hjemmeposisjon')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Lagre hjemmeposisjon' })).toBeEnabled()
    } finally {
      await clearHomeLocation(user.id).catch(() => undefined)
      await deleteTestUser(user.id)
    }
  })

  test('removes an already saved home location from the same screen', async ({ page }) => {
    const email = `home-remove-${Date.now()}@test.example`
    const password = 'password123'
    const { user } = await createHouseholdUser(email, password)

    try {
      await seedHomeLocation({
        userId: user.id,
        lat: 59.9139,
        lng: 10.7522,
      })

      await openSettings(page, email, password)

      await expect(page.getByText('Lagret hjemmeposisjon')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Fjern hjemmeposisjon' })).toBeVisible()

      await page.getByRole('button', { name: 'Fjern hjemmeposisjon' }).click()

      await expect(page.getByText('Hjemmeposisjon fjernet')).toBeVisible()
      await expect(page.getByText('Ingen hjemmeposisjon lagret')).toBeVisible()
    } finally {
      await clearHomeLocation(user.id).catch(() => undefined)
      await deleteTestUser(user.id)
    }
  })

  test('saved home within 100m at-home cleanup does not create history and shows toast', async ({ page }) => {
    const email = `saved-home-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, `Saved home ${Date.now()}`)
    const itemName = 'saved home does not create history'
    await createTestItem(list.id, itemName)

    try {
      await seedHomeLocation({
        userId: user.id,
        lat: 59.9139,
        lng: 10.7522,
      })
      await clearHistoryForList(list.id)
      await installGeolocationMock(page, 'nearby-success')
      await openList(page, email, password, list.id)
      await startListLocation(page)

      await toggleItem(page, itemName)

      await expect(page.getByText(/rydde opp hjemme|hjemme/i)).toBeVisible()
      await expect(page.getByTestId('item-checkbox').filter({ hasText: itemName })).toHaveCount(0)
      await expect.poll(() => countHistoryRowsForItem(list.id, itemName)).toBe(0)
      await expect.poll(() => listItemExists(list.id, itemName)).toBe(false)
    } finally {
      await clearHomeLocation(user.id).catch(() => undefined)
      await deleteTestUser(user.id)
    }
  })

  test('shopping mode wins over saved home cleanup and still creates history', async ({ page }) => {
    const email = `shopping-mode-wins-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, `Shopping mode ${Date.now()}`)
    const itemName = 'shopping mode wins'
    await createTestItem(list.id, itemName)

    try {
      await page.clock.install()
      await seedHomeLocation({
        userId: user.id,
        lat: 59.9139,
        lng: 10.7522,
      })
      await seedLocatedStore(household.id, {
        chain: 'Rema 1000',
        locationName: 'Majorstua',
        lat: 59.9139,
        lng: 10.7522,
      })
      await clearHistoryForList(list.id)
      await installGeolocationMock(page, 'in-store-dwell')
      await openList(page, email, password, list.id)
      await startListLocation(page)
      await page.clock.fastForward(91_000)
      await setDocumentVisibility(page, 'hidden')
      await setDocumentVisibility(page, 'visible')

      await toggleItem(page, itemName)

      await expect(page.getByText(/rydde opp hjemme|hjemme/i)).toHaveCount(0)
      await expect.poll(() => countHistoryRowsForItem(list.id, itemName)).toBe(1)
      await expect.poll(() => listItemExists(list.id, itemName)).toBe(true)
    } finally {
      await clearHomeLocation(user.id).catch(() => undefined)
      await deleteTestUser(user.id)
    }
  })

  test('delete home location makes former home within 100m fall back to normal history', async ({ page }) => {
    const email = `delete-home-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, `Former home ${Date.now()}`)
    const homeCleanupItem = 'delete home cleanup'
    const normalHistoryItem = 'former home normal history'
    await createTestItem(list.id, homeCleanupItem)
    await createTestItem(list.id, normalHistoryItem)

    try {
      await seedHomeLocation({
        userId: user.id,
        lat: 59.9139,
        lng: 10.7522,
      })
      await clearHistoryForList(list.id)
      await installGeolocationMock(page, 'nearby-success')
      await openList(page, email, password, list.id)
      await startListLocation(page)

      await toggleItem(page, homeCleanupItem)
      await expect.poll(() => countHistoryRowsForItem(list.id, homeCleanupItem)).toBe(0)
      await expect.poll(() => listItemExists(list.id, homeCleanupItem)).toBe(false)

      await page.goto('/admin/brukerinnstillinger', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'Fjern hjemmeposisjon' }).click()
      await expect(page.getByText('Hjemmeposisjon fjernet')).toBeVisible()

      await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })
      await toggleItem(page, normalHistoryItem)

      await expect(page.getByText(/rydde opp hjemme|hjemme/i)).toHaveCount(0)
      await expect.poll(() => countHistoryRowsForItem(list.id, normalHistoryItem)).toBe(1)
      await expect.poll(() => listItemExists(list.id, normalHistoryItem)).toBe(true)
    } finally {
      await clearHomeLocation(user.id).catch(() => undefined)
      await deleteTestUser(user.id)
    }
  })
})
