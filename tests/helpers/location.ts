import type { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export type LocatedStoreInput = {
  chain: string | null
  locationName: string
  lat: number
  lng: number
}

export type GeolocationMockMode =
  | 'nearby-success'
  | 'no-nearby-store'
  | 'permission-denied'
  | 'position-unavailable'
  | 'in-store-dwell'

type SeededStoreRow = {
  id: string
  chain: string | null
  location_name: string
  lat: number | null
  lng: number | null
  created_at: string | null
}

function getAdminClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for location test helpers')
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function seedLocatedStore(householdId: string, input: LocatedStoreInput) {
  const admin = getAdminClient()
  const { data: store, error: storeError } = await admin
    .from('stores')
    .insert({
      household_id: householdId,
      chain: input.chain,
      location_name: input.locationName,
      lat: input.lat,
      lng: input.lng,
    })
    .select('id, chain, location_name, lat, lng, created_at')
    .single()

  if (storeError) throw storeError

  const { data: categories, error: categoriesError } = await admin
    .from('categories')
    .select('id, position')
    .eq('household_id', householdId)
    .order('position', { ascending: true })

  if (categoriesError) throw categoriesError

  if ((categories ?? []).length > 0) {
    const rows = categories.map((category, index) => ({
      store_id: store.id,
      category_id: category.id,
      position: (index + 1) * 10,
    }))

    const { error: layoutError } = await admin.from('store_layouts').insert(rows)
    if (layoutError) throw layoutError
  }

  return store as SeededStoreRow
}

export async function installGeolocationMock(page: Page, mode: GeolocationMockMode) {
  await page.addInitScript((selectedMode: GeolocationMockMode) => {
    type MockWindow = Window & {
      __HANDLEAPPEN_LOCATION_REQUESTS__?: number
      __HANDLEAPPEN_GEOLOCATION_OVERRIDE__?: {
        latitude: number
        longitude: number
        accuracy: number
      }
    }

    const mockWindow = window as MockWindow
    mockWindow.__HANDLEAPPEN_LOCATION_REQUESTS__ = 0

    const responses = {
      'nearby-success': {
        kind: 'success',
        coords: { latitude: 59.9139, longitude: 10.7522, accuracy: 25 },
      },
      'in-store-dwell': {
        kind: 'success',
        coords: { latitude: 59.9139, longitude: 10.7522, accuracy: 25 },
      },
      'no-nearby-store': {
        kind: 'success',
        coords: { latitude: 60.3913, longitude: 5.3221, accuracy: 25 },
      },
      'permission-denied': {
        kind: 'error',
        error: {
          code: 1,
          message: 'User denied Geolocation',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        },
      },
      'position-unavailable': {
        kind: 'error',
        error: {
          code: 2,
          message: 'Position unavailable',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        },
      },
    } as const

    const geolocation = {
      getCurrentPosition(
        success: PositionCallback,
        error?: PositionErrorCallback | null,
        _options?: PositionOptions
      ) {
        mockWindow.__HANDLEAPPEN_LOCATION_REQUESTS__ =
          (mockWindow.__HANDLEAPPEN_LOCATION_REQUESTS__ ?? 0) + 1

        const overrideCoords = mockWindow.__HANDLEAPPEN_GEOLOCATION_OVERRIDE__
        if (overrideCoords) {
          setTimeout(() => {
            success({
              coords: {
                latitude: overrideCoords.latitude,
                longitude: overrideCoords.longitude,
                accuracy: overrideCoords.accuracy ?? 25,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
                toJSON() {
                  return this
                },
              },
              timestamp: Date.now(),
              toJSON() {
                return this
              },
            } as GeolocationPosition)
          }, 0)
          return
        }

        const response = responses[selectedMode]
        setTimeout(() => {
          if (response.kind === 'success') {
            success({
              coords: {
                latitude: response.coords.latitude,
                longitude: response.coords.longitude,
                accuracy: response.coords.accuracy,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
                toJSON() {
                  return this
                },
              },
              timestamp: Date.now(),
              toJSON() {
                return this
              },
            } as GeolocationPosition)
            return
          }

          error?.(response.error as GeolocationPositionError)
        }, 0)
      },
      watchPosition(
        success: PositionCallback,
        error?: PositionErrorCallback | null,
        options?: PositionOptions
      ) {
        this.getCurrentPosition(success, error, options)
        return 1
      },
      clearWatch() {},
    }

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: geolocation,
    })
  }, mode)
}

export async function switchGeolocationCoords(
  page: Page,
  coords: { latitude: number; longitude: number; accuracy?: number }
) {
  await page.evaluate((newCoords) => {
    type MockWindow = Window & {
      __HANDLEAPPEN_GEOLOCATION_OVERRIDE__?: {
        latitude: number
        longitude: number
        accuracy: number
      }
    }

    const w = window as MockWindow
    w.__HANDLEAPPEN_GEOLOCATION_OVERRIDE__ = {
      latitude: newCoords.latitude,
      longitude: newCoords.longitude,
      accuracy: newCoords.accuracy ?? 25,
    }
  }, coords)
}

export async function setDocumentVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((nextState: 'hidden' | 'visible') => {
    type VisibilityWindow = Window & {
      __HANDLEAPPEN_DOCUMENT_VISIBILITY_STATE__?: 'hidden' | 'visible'
    }

    const visibilityWindow = window as VisibilityWindow

    if (!visibilityWindow.__HANDLEAPPEN_DOCUMENT_VISIBILITY_STATE__) {
      visibilityWindow.__HANDLEAPPEN_DOCUMENT_VISIBILITY_STATE__ =
        document.visibilityState === 'visible' ? 'visible' : 'hidden'

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => visibilityWindow.__HANDLEAPPEN_DOCUMENT_VISIBILITY_STATE__,
      })

      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => visibilityWindow.__HANDLEAPPEN_DOCUMENT_VISIBILITY_STATE__ !== 'visible',
      })
    }

    visibilityWindow.__HANDLEAPPEN_DOCUMENT_VISIBILITY_STATE__ = nextState
    document.dispatchEvent(new Event('visibilitychange'))
  }, state)
}
