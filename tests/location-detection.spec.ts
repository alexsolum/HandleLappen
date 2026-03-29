import { test, type Page } from '@playwright/test'
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

test.describe('Phase 24 location detection scaffolding', () => {
  void prepareLocationFlow
  void setDocumentVisibility

  test('permission flow waits for explicit confirm tap before first geolocation request', async () => {
    test.skip(true, 'Phase 24 scaffolding only: keep exact title/filter stable before implementation lands')
  })

  test('foreground poller auto-selects nearby store and resumes after visibility restore', async () => {
    test.skip(true, 'Phase 24 scaffolding only: keep exact title/filter stable before implementation lands')
  })

  test('manual picker fallback stays available when location is denied or unavailable', async () => {
    test.skip(true, 'Phase 24 scaffolding only: keep exact title/filter stable before implementation lands')
  })
})
