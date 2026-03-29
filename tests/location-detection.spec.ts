import { expect, test, type Page } from '@playwright/test'
import { createHouseholdUser, loginUser } from './helpers/auth'
import { createTestList } from './helpers/lists'
import {
  installGeolocationMock,
  seedLocatedStore,
  setDocumentVisibility,
  type GeolocationMockMode,
} from './helpers/location'

async function prepareLocationFlow(page: Page, mode: GeolocationMockMode) {
  const seeded = await createHouseholdUser(`location-${mode}-${Date.now()}@test.example`, 'password123')
  const list = await createTestList(seeded.household.id, `Location ${mode} ${Date.now()}`)

  await seedLocatedStore(seeded.household.id, {
    chain: 'Rema 1000',
    locationName: 'Majorstua',
    lat: 59.9139,
    lng: 10.7522,
  })

  await installGeolocationMock(page, mode)
  await loginUser(page, seeded.user.email!, 'password123')
  await page.goto(`/lister/${list.id}`, { waitUntil: 'networkidle' })

  return {
    householdId: seeded.household.id,
    listId: list.id,
    userId: seeded.user.id,
  }
}

async function locationRequestCount(page: Page) {
  return page.evaluate(() => (window as Window & { __HANDLEAPPEN_LOCATION_REQUESTS__?: number }).__HANDLEAPPEN_LOCATION_REQUESTS__ ?? 0)
}

test.describe('Phase 24 location detection scaffolding', () => {
  test('permission flow waits for explicit confirm tap before first geolocation request', async ({
    page,
  }) => {
    await prepareLocationFlow(page, 'nearby-success')

    await expect(page.getByRole('button', { name: /Slå på automatisk butikkvalg/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Butikk:\s*Velg butikk manuelt/i })).toBeVisible()
    await expect.poll(() => locationRequestCount(page)).toBe(0)

    await page.getByRole('button', { name: /Slå på automatisk butikkvalg/i }).click()

    await expect(page.getByRole('heading', { name: 'Velg butikk automatisk' })).toBeVisible()
    await expect(
      page.getByText(
        'HandleAppen bruker posisjonen din bare mens appen er åpen for å finne nærmeste lagrede butikk.'
      )
    ).toBeVisible()
    await expect.poll(() => locationRequestCount(page)).toBe(0)

    await page.getByRole('button', { name: 'Fortsett' }).click()

    await expect.poll(() => locationRequestCount(page)).toBe(1)
    await expect(page.getByText('Automatisk valgt butikk: Rema 1000 Majorstua')).toBeVisible()
    await expect(page.getByRole('button', { name: /Butikk:\s*Rema 1000 Majorstua/i })).toBeVisible()
  })

  test('foreground poller auto-selects nearby store and resumes after visibility restore', async ({
    page,
  }) => {
    await prepareLocationFlow(page, 'nearby-success')

    await page.getByRole('button', { name: /Slå på automatisk butikkvalg/i }).click()
    await page.getByRole('button', { name: 'Fortsett' }).click()

    await expect.poll(() => locationRequestCount(page)).toBe(1)
    await expect(page.getByText('Automatisk valgt butikk: Rema 1000 Majorstua')).toBeVisible()

    await setDocumentVisibility(page, 'hidden')
    await page.waitForTimeout(100)
    await expect.poll(() => locationRequestCount(page)).toBe(1)

    await setDocumentVisibility(page, 'visible')
    await expect.poll(() => locationRequestCount(page)).toBe(2)
    await expect(page.getByText('Automatisk valgt butikk: Rema 1000 Majorstua')).toBeVisible()
    await expect(page.getByRole('button', { name: /Butikk:\s*Rema 1000 Majorstua/i })).toBeVisible()
  })

  test('manual picker fallback stays available when location is denied or unavailable', async ({
    page,
  }) => {
    const prepared = await prepareLocationFlow(page, 'permission-denied')

    await expect(page.getByRole('button', { name: /Butikk:\s*Velg butikk manuelt/i })).toBeVisible()

    await page.getByRole('button', { name: /Slå på automatisk butikkvalg/i }).click()
    await page.getByRole('button', { name: 'Fortsett' }).click()

    await expect(
      page.getByText('Stedstilgang er avslått. Du kan prøve igjen eller velge butikk manuelt.')
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Prøv igjen' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Butikk:\s*Velg butikk manuelt/i })).toBeVisible()

    await page.getByRole('button', { name: 'Prøv igjen' }).click()
    await expect(
      page.getByText('Hvis Safari ikke spør igjen, åpne Innstillinger og gi HandleAppen stedstilgang.')
    ).toBeVisible()

    await installGeolocationMock(page, 'position-unavailable')
    await page.goto(`/lister/${prepared.listId}`, { waitUntil: 'networkidle' })

    await expect(page.getByRole('button', { name: /Butikk:\s*Velg butikk manuelt/i })).toBeVisible()
    await page.getByRole('button', { name: /Slå på automatisk butikkvalg/i }).click()
    await page.getByRole('button', { name: 'Fortsett' }).click()

    await expect(
      page.getByText('Vi fant ikke posisjonen din akkurat nå. Velg butikk manuelt eller prøv igjen.')
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Prøv igjen' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Butikk:\s*Velg butikk manuelt/i })).toBeVisible()
  })
})
