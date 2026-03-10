import { expect, test, type Page } from '@playwright/test'
import { createHouseholdUser, deleteTestUser } from './helpers/auth'
import { createTestList } from './helpers/lists'

type ScannerMockMode = 'active' | 'permission-denied'

async function installScannerMock(page: Page, mode: ScannerMockMode) {
  await page.addInitScript(
    ({ currentMode }) => {
      const state = {
        starts: 0,
        stops: 0,
        clears: 0,
        mode: currentMode,
      }

      window.__HANDLEAPPEN_BARCODE_SCANNER_MOCK__ = {
        start: async () => {
          state.starts += 1

          if (state.mode === 'permission-denied') {
            const error = new Error('NotAllowedError')
            error.name = 'NotAllowedError'
            throw error
          }

          return {
            stop: async () => {
              state.stops += 1
            },
            clear: async () => {
              state.clears += 1
            },
          }
        },
      }

      ;(window as Window & { __HANDLEAPPEN_BARCODE_SCANNER_MOCK_STATE__?: typeof state }).__HANDLEAPPEN_BARCODE_SCANNER_MOCK_STATE__ =
        state
    },
    { currentMode: mode }
  )
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
  await page.getByRole('button', { name: 'Scan' }).evaluate((button) => {
    ;(button as HTMLButtonElement).click()
  })
}

test.describe('barcode scanner entry', () => {
  test('scan entry opens the sheet with live preview shell', async ({ page }) => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not set')
      return
    }

    await installScannerMock(page, 'permission-denied')

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

    await installScannerMock(page, 'permission-denied')

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

    await installScannerMock(page, 'permission-denied')

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

    await installScannerMock(page, 'permission-denied')

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
            __HANDLEAPPEN_BARCODE_SCANNER_MOCK_STATE__?: {
              starts: number
              stops: number
              clears: number
            }
          }
        ).__HANDLEAPPEN_BARCODE_SCANNER_MOCK_STATE__
      })

      expect(scannerState?.starts).toBe(2)
    } finally {
      await deleteTestUser(user.id)
    }
  })
})
