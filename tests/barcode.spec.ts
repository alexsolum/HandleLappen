import { expect, test, type Page } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import { seedDefaultCategories } from './helpers/categories'
import { createTestList } from './helpers/lists'
import {
  buildGeminiNormalizedResponse,
  buildNotFoundLookup,
  buildOffFallbackNormalizedResponse,
  type BarcodeLookupDto,
} from './helpers/barcode'

type ScannerMockMode = 'active' | 'permission-denied'

async function installScannerMock(
  page: Page,
  options: { mode: ScannerMockMode; detectedEan?: string } = { mode: 'permission-denied' }
) {
  await page.addInitScript(
    ({ currentMode, currentEan }) => {
      const state = {
        starts: 0,
        stops: 0,
        clears: 0,
        mode: currentMode,
      }

      window.__HANDLEAPPEN_BARCODE_SCANNER_MOCK__ = state
    },
    { currentMode: options.mode, currentEan: options.detectedEan ?? null }
  )
}

async function emitScannerDetection(page: Page, ean: string) {
  await page.evaluate(async (barcode) => {
    window.dispatchEvent(new CustomEvent('handleappen:barcode-detected', { detail: barcode }))
  }, ean)
}

async function mockBarcodeLookup(
  page: Page,
  responseByEan: Record<string, BarcodeLookupDto>,
  requestLog: Array<{ url: string; authHeader: string | null }> = []
) {
  await page.route('**/functions/v1/barcode-lookup', async (route) => {
    const request = route.request()
    requestLog.push({
      url: request.url(),
      authHeader: request.headers()['authorization'] ?? null,
    })

    const postData = request.postDataJSON() as { ean?: string }
    const body = postData?.ean ? responseByEan[postData.ean] : null

    if (!body) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'not mocked' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

async function loginAndOpenList(page: Page, email: string, password: string, listId: string) {
  await page.goto('/logg-inn', { waitUntil: 'networkidle' })
  await page.fill('[type=email]', email)
  await page.fill('[type=password]', password)
  await page.click('button:has-text("Logg inn")')
  await page.waitForURL('/')
  await page.waitForLoadState('networkidle')

  await page.goto(`/lister/${listId}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('input[placeholder="Legg til vare…"]')
}

async function openScanner(page: Page) {
  const scanButton = page.getByRole('button', { name: 'Scan' })
  await expect(scanButton).toBeVisible()
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Scan'
    )

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Scan button not found')
    }

    button.click()
  })
}

test.describe('barcode scanner entry', () => {
  test('scan entry opens the sheet with live preview shell', async ({ page }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    await installScannerMock(page, { mode: 'permission-denied' })

    const email = `barcode-open-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Strekkodeliste')

    try {
      await loginAndOpenList(page, email, password, list.id)

      await openScanner(page)

      const dialog = page.locator('dialog[open]')
      await expect(dialog.getByText('Scan strekkode')).toBeVisible()
      await expect(page.getByTestId('barcode-preview-shell')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Skriv EAN manuelt' })).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('permission denied shows recovery state and manual fallback', async ({ page }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    await installScannerMock(page, { mode: 'permission-denied' })

    const email = `barcode-denied-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Strekkodeliste')

    try {
      await loginAndOpenList(page, email, password, list.id)

      await openScanner(page)

      await expect(page.getByText('Kameratilgang mangler')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Prøv igjen' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Skriv EAN manuelt' })).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('manual ean form validation works', async ({ page }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    await installScannerMock(page, { mode: 'permission-denied' })

    const email = `barcode-manual-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Strekkodeliste')

    try {
      await loginAndOpenList(page, email, password, list.id)

      await openScanner(page)
      await page.getByRole('button', { name: 'Skriv EAN manuelt' }).click()

      await expect(page.getByRole('heading', { name: 'Skriv EAN manuelt' })).toBeVisible()

      await page.getByRole('button', { name: 'Fortsett' }).click()
      await expect(page.getByText('Skriv inn EAN-koden før du fortsetter.')).toBeVisible()

      await page.getByPlaceholder('F.eks. 7044610878304').fill('12345')
      await page.getByRole('button', { name: 'Fortsett' }).click()
      await expect(page.getByText('EAN må være 8, 12 eller 13 sifre.')).toBeVisible()

      await page.getByPlaceholder('F.eks. 7044610878304').fill('7044610878304')
      await page.getByRole('button', { name: 'Fortsett' }).click()

      await expect(page.getByRole('heading', { name: 'Skriv EAN manuelt' })).toHaveCount(0)
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('scan entry closes and reopens without duplicate preview state', async ({ page }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    await installScannerMock(page, { mode: 'permission-denied' })

    const email = `barcode-reopen-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Strekkodeliste')

    try {
      await loginAndOpenList(page, email, password, list.id)

      await openScanner(page)
      await expect(page.getByTestId('barcode-preview')).toHaveCount(1)

      await page.getByRole('button', { name: 'Avbryt' }).click()
      await expect(page.locator('dialog[open]')).toHaveCount(0)

      await openScanner(page)
      await expect(page.getByTestId('barcode-preview')).toHaveCount(1)

      const scannerState = await page.evaluate(() => {
        return (
          window as Window & {
            __HANDLEAPPEN_BARCODE_SCANNER_MOCK__?: {
              starts: number
              stops: number
              clears: number
            }
          }
        ).__HANDLEAPPEN_BARCODE_SCANNER_MOCK__
      })

      expect(scannerState?.starts).toBe(2)
    } finally {
      await deleteTestUser(user.id)
    }
  })
})

test.describe('barcode lookup flow', () => {
  test('mocked scan lookup success pre-fills and adds the item to the list', async ({ page }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    const requestLog: Array<{ url: string; authHeader: string | null }> = []
    await installScannerMock(page, { mode: 'permission-denied' })
    await mockBarcodeLookup(page, { '7044610878304': buildGeminiNormalizedResponse() }, requestLog)

    const email = `barcode-success-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Strekkodeliste')

    try {
      await seedDefaultCategories(household.id)
      await loginAndOpenList(page, email, password, list.id)

      await openScanner(page)
      await expect(page.locator('dialog[open]')).toBeVisible()
      await emitScannerDetection(page, '7044610878304')

      const dialog = page.getByTestId('barcode-lookup-sheet')
      await expect(dialog.getByRole('heading', { name: 'Bekreft vare' })).toBeVisible()
      await expect(dialog.locator('input[type="text"]')).toHaveValue('Pepsi Max 1,5 L')
      await expect(dialog.locator('select')).toHaveValue(/.+/)

      await dialog.getByRole('button', { name: 'Legg til vare' }).click()

      await expect(page.locator('dialog[open]')).toHaveCount(0)
      await expect(page.locator('text=Pepsi Max 1,5 L')).toBeVisible()

      expect(requestLog).toHaveLength(1)
      expect(requestLog[0].url).toContain('/functions/v1/barcode-lookup')
      expect(requestLog[0].authHeader?.startsWith('Bearer ')).toBeTruthy()
      expect(requestLog[0].authHeader).not.toContain('KASSAL')
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('fallback success still shows one found state and adds item in mapped category', async ({ page }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    await installScannerMock(page, { mode: 'permission-denied' })
    await mockBarcodeLookup(page, { '7044610878304': buildOffFallbackNormalizedResponse() })

    const email = `barcode-fallback-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Fallbackliste')

    try {
      await seedDefaultCategories(household.id)
      await loginAndOpenList(page, email, password, list.id)

      await openScanner(page)
      await expect(page.locator('dialog[open]')).toBeVisible()
      await emitScannerDetection(page, '7044610878304')

      const dialog = page.getByTestId('barcode-lookup-sheet')
      await expect(dialog.getByRole('heading', { name: 'Bekreft vare' })).toBeVisible()
      await expect(dialog.locator('input[type="text"]')).toHaveValue('Pepsi Max')
      await expect(dialog.getByText(/Open Food Facts/i)).toHaveCount(0)
      await expect(dialog.getByText(/Kassal/i)).toHaveCount(0)

      await dialog.getByRole('button', { name: 'Legg til vare' }).click()

      await expect(page.locator('text=Pepsi Max')).toBeVisible()
      await expect(
        page.locator('div.bg-gray-50.text-xs.font-semibold.uppercase.tracking-wider.text-gray-500', {
          hasText: 'Drikke',
        })
      ).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('gemini normalization reaches the confirmation sheet and final inserted item', async ({ page }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    await installScannerMock(page, { mode: 'permission-denied' })
    await mockBarcodeLookup(page, {
      '7044610878304': buildGeminiNormalizedResponse({
        itemName: 'Pepsi Max uten sukker 1,5 L',
        canonicalCategory: 'drikke',
      }),
    })

    const email = `barcode-gemini-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Gemini')

    try {
      await seedDefaultCategories(household.id)
      await loginAndOpenList(page, email, password, list.id)

      await openScanner(page)
      await expect(page.locator('dialog[open]')).toBeVisible()
      await emitScannerDetection(page, '7044610878304')

      const dialog = page.getByTestId('barcode-lookup-sheet')
      await expect(dialog.locator('input[type="text"]')).toHaveValue('Pepsi Max uten sukker 1,5 L')

      await dialog.getByRole('button', { name: 'Legg til vare' }).click()

      await expect(page.locator('text=Pepsi Max uten sukker 1,5 L')).toBeVisible()
      await expect(
        page.locator('div.bg-gray-50.text-xs.font-semibold.uppercase.tracking-wider.text-gray-500', {
          hasText: 'Drikke',
        })
      ).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('unknown barcode shows one clear not-found state with manual recovery', async ({ page }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    await installScannerMock(page, { mode: 'permission-denied' })
    await mockBarcodeLookup(page, { '12345678': buildNotFoundLookup({ ean: '12345678' }) })

    const email = `barcode-not-found-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Fant ikke')

    try {
      await seedDefaultCategories(household.id)
      await loginAndOpenList(page, email, password, list.id)

      await openScanner(page)
      await expect(page.locator('dialog[open]')).toBeVisible()
      await emitScannerDetection(page, '12345678')

      const dialog = page.getByTestId('barcode-lookup-sheet')
      await expect(dialog.getByRole('heading', { name: 'Finner ikke varen' })).toBeVisible()
      await expect(dialog.getByText(/Open Food Facts/i)).toHaveCount(0)
      await expect(dialog.getByText(/Kassal/i)).toHaveCount(0)

      await dialog.locator('input[type="text"]').fill('Mystery Soda')
      await dialog.getByRole('button', { name: 'Legg til manuelt' }).click()

      await expect(page.locator('text=Mystery Soda')).toBeVisible()
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('manual ean path blocks invalid input and looks up successfully when valid', async ({ page }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    await installScannerMock(page, { mode: 'permission-denied' })
    await mockBarcodeLookup(page, { '7044610878304': buildGeminiNormalizedResponse() })

    const email = `barcode-manual-success-${Date.now()}@test.example`
    const password = 'password123'
    const { user, household } = await createHouseholdUser(email, password)
    const list = await createTestList(household.id, 'Manuell EAN')

    try {
      await seedDefaultCategories(household.id)
      await loginAndOpenList(page, email, password, list.id)

      await openScanner(page)
      await page.getByRole('button', { name: 'Skriv EAN manuelt' }).click()

      await page.getByPlaceholder('F.eks. 7044610878304').fill('12345')
      await page.getByRole('button', { name: 'Fortsett' }).click()
      await expect(page.getByText('EAN må være 8, 12 eller 13 sifre.')).toBeVisible()

      await page.getByPlaceholder('F.eks. 7044610878304').fill('7044610878304')
      await page.getByRole('button', { name: 'Fortsett' }).click()

      const dialog = page.getByTestId('barcode-lookup-sheet')
      await expect(dialog.getByRole('heading', { name: 'Bekreft vare' })).toBeVisible()
      await expect(dialog.locator('input[type="text"]')).toHaveValue('Pepsi Max 1,5 L')
    } finally {
      await deleteTestUser(user.id)
    }
  })
})
