import { expect, test, type Page } from '@playwright/test'
import { createHouseholdUser, deleteTestUser, loginUser } from './helpers/auth'
import {
  clearHomeLocation,
  installGeolocationMock,
  mockCurrentHomePosition,
  seedHomeLocation,
} from './helpers/location'

async function openSettings(page: Page, email: string, password: string) {
  await installGeolocationMock(page, 'nearby-success')
  await loginUser(page, email, password)
  await page.goto('/admin/brukerinnstillinger', { waitUntil: 'networkidle' })
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
})
