import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { createHouseholdUser, loginUser } from './helpers/auth'
import { createTestList } from './helpers/lists'
import { clearHistoryForList } from './helpers/history'
import {
  installGeolocationMock,
  seedLocatedStore,
  setDocumentVisibility,
  switchGeolocationCoords,
  type GeolocationMockMode,
} from './helpers/location'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const STORE_COORDS = { latitude: 59.9139, longitude: 10.7522 }
const FAR_COORDS = { latitude: 60.3913, longitude: 5.3221 }

const EXPECTED_CHAIN_COLORS: Record<string, string> = {
  'Rema 1000': '#003087',
  Kiwi: '#00843D',
  Meny: '#E4002B',
  'Coop Extra': '#FFD100',
  'Coop Mega': '#003087',
  'Coop Prix': '#E4002B',
  Spar: '#007A3D',
  Joker: '#FFD100',
  Bunnpris: '#E85D04',
}

function createAdminClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for shopping mode tests')
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function rgbFromHex(hex: string) {
  const normalized = hex.replace('#', '')
  const [r, g, b] = normalized.match(/.{2}/g)?.map((part) => Number.parseInt(part, 16)) ?? []
  return `rgb(${r}, ${g}, ${b})`
}

function storeDisplayName(chain: string | null, locationName: string) {
  return !chain || chain === 'Annet' ? locationName : `${chain} ${locationName}`
}

async function fetchHistoryRow(listId: string, itemName: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('item_history')
    .select('store_id, store_name, item_name')
    .eq('list_id', listId)
    .eq('item_name', itemName)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as { store_id: string | null; store_name: string | null; item_name: string } | null
}

async function waitForHistoryRow(listId: string, itemName: string) {
  const deadline = Date.now() + 15_000
  let row: Awaited<ReturnType<typeof fetchHistoryRow>> = null

  while (Date.now() < deadline) {
    row = await fetchHistoryRow(listId, itemName)
    if (row !== null) return row
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return row
}

async function prepareShoppingModeList(
  page: Page,
  {
    chain,
    locationName,
    geolocationMode = 'in-store-dwell',
  }: {
    chain: string | null
    locationName: string
    geolocationMode?: GeolocationMockMode
  }
) {
  const emailSalt = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const seeded = await createHouseholdUser(`shopping-${emailSalt}@test.example`, 'password123')
  const list = await createTestList(seeded.household.id, `Shopping ${emailSalt}`)

  await seedLocatedStore(seeded.household.id, {
    chain,
    locationName,
    lat: STORE_COORDS.latitude,
    lng: STORE_COORDS.longitude,
  })

  await installGeolocationMock(page, geolocationMode)
  await loginUser(page, seeded.user.email!, 'password123')
  await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

  return { householdId: seeded.household.id, listId: list.id, userId: seeded.user.id }
}

async function activateShoppingMode(page: Page) {
  await page.getByRole('button', { name: /Slå på automatisk butikkvalg/i }).click()
  await page.getByRole('button', { name: 'Fortsett' }).click()
  await page.clock.fastForward(91_000)
  await setDocumentVisibility(page, 'hidden')
  await setDocumentVisibility(page, 'visible')
  await expect(page.getByRole('status')).toBeVisible({ timeout: 15_000 })
}

async function addItem(page: Page, name: string) {
  await page.getByLabel('Legg til vare').fill(name)
  await page.getByRole('button', { name: 'Legg til' }).click()
  await expect(page.getByTestId('item-checkbox').filter({ hasText: name })).toBeVisible()
  const dialog = page.locator('dialog[open]').first()
  await expect(dialog).toBeVisible()
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: 'Hopp over' }).click()
  }
}

async function toggleItem(page: Page, name: string) {
  const checkbox = page.getByTestId('item-checkbox').filter({ hasText: name })
  await checkbox.click({ force: true })
}

async function selectManualStore(page: Page, storeName: string) {
  await page.getByRole('button', { name: /Butikk:/i }).click()
  const dialog = page.locator('dialog[open]').first()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: storeName }).click()
  await expect(page.getByRole('button', { name: new RegExp(`^Butikk:\\s*${storeName}$`) })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.install()
})

test.describe('Shopping Mode', () => {
  test('activates after 90s dwell', async ({ page }) => {
    await prepareShoppingModeList(page, { chain: 'Rema 1000', locationName: 'Majorstua' })

    await expect(page.getByRole('status')).toHaveCount(0)

    await activateShoppingMode(page)

    const banner = page.getByRole('status')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('Rema 1000 Majorstua')
  })

  test('banner shows branded store name and chain color', async ({ page }) => {
    await prepareShoppingModeList(page, { chain: 'Kiwi', locationName: 'Skøyen' })
    await activateShoppingMode(page)

    const banner = page.getByRole('status')
    await expect(banner).toContainText('Kiwi Skøyen')
    await expect(banner).toHaveCSS('background-color', rgbFromHex(EXPECTED_CHAIN_COLORS.Kiwi))
  })

  test('dark text for yellow chains', async ({ page }) => {
    await prepareShoppingModeList(page, { chain: 'Joker', locationName: 'Sentrum' })
    await activateShoppingMode(page)

    const banner = page.getByRole('status')
    await expect(banner).toContainText('Joker Sentrum')
    await expect(banner).toHaveCSS('color', 'rgb(0, 0, 0)')
  })

  test('picker hidden when shopping mode active', async ({ page }) => {
    await prepareShoppingModeList(page, { chain: 'Rema 1000', locationName: 'Majorstua' })
    await activateShoppingMode(page)

    await expect(page.getByRole('button', { name: /Butikk:/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Slå på automatisk butikkvalg/i })).toHaveCount(0)
    await expect(page.getByRole('status')).toBeVisible()
  })

  test('dismiss restores picker', async ({ page }) => {
    await prepareShoppingModeList(page, { chain: 'Rema 1000', locationName: 'Majorstua' })
    await activateShoppingMode(page)

    const banner = page.getByRole('status')
    await expect(banner).toBeVisible()
    await banner.getByRole('button', { name: 'Avslutt handletur' }).click()

    await expect(page.getByRole('status')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Butikk:/i })).toBeVisible()
  })

  test('dismissed stays off after re-entering range', async ({ page }) => {
    await prepareShoppingModeList(page, { chain: 'Rema 1000', locationName: 'Majorstua' })
    await activateShoppingMode(page)
    await page.getByRole('status').getByRole('button', { name: 'Avslutt handletur' }).click()

    await page.clock.fastForward(91_000)
    await setDocumentVisibility(page, 'hidden')
    await setDocumentVisibility(page, 'visible')

    await expect(page.getByRole('status')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Butikk:/i })).toBeVisible()
  })

  test('auto-exit after 2 min outside', async ({ page }) => {
    await prepareShoppingModeList(page, { chain: 'Rema 1000', locationName: 'Majorstua' })
    await activateShoppingMode(page)

    await switchGeolocationCoords(page, FAR_COORDS)
    await page.clock.fastForward(121_000)

    await expect(page.getByRole('status')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Butikk:/i })).toBeVisible()
  })

  test('history records store when shopping mode active', async ({ page }) => {
    const { listId } = await prepareShoppingModeList(page, {
      chain: 'Rema 1000',
      locationName: 'Majorstua',
    })
    await clearHistoryForList(listId)

    const itemName = 'Mango'
    await addItem(page, itemName)
    await activateShoppingMode(page)
    await toggleItem(page, itemName)

    const historyRow = await waitForHistoryRow(listId, itemName)
    expect(historyRow).not.toBeNull()
    expect(historyRow?.store_id).not.toBeNull()
    expect(historyRow?.store_name).toBe(storeDisplayName('Rema 1000', 'Majorstua'))
  })

  test('no store attribution without shopping mode', async ({ page }) => {
    const { listId } = await prepareShoppingModeList(page, {
      chain: 'Rema 1000',
      locationName: 'Majorstua',
      geolocationMode: 'nearby-success',
    })
    await clearHistoryForList(listId)

    const itemName = 'Paprika'
    await addItem(page, itemName)
    await toggleItem(page, itemName)

    const historyRow = await waitForHistoryRow(listId, itemName)
    expect(historyRow).not.toBeNull()
    expect(historyRow?.store_id).toBeNull()
    expect(historyRow?.store_name).toBeNull()
  })

  test('manual picker selection keeps store attribution', async ({ page }) => {
    const { listId } = await prepareShoppingModeList(page, {
      chain: 'Rema 1000',
      locationName: 'Majorstua',
      geolocationMode: 'no-nearby-store',
    })
    await clearHistoryForList(listId)

    await selectManualStore(page, 'Rema 1000 Majorstua')

    const itemName = 'Sitron'
    await addItem(page, itemName)
    await toggleItem(page, itemName)

    const historyRow = await waitForHistoryRow(listId, itemName)
    expect(historyRow).not.toBeNull()
    expect(historyRow?.store_id).not.toBeNull()
    expect(historyRow?.store_name).toBe('Rema 1000 Majorstua')
  })

})
