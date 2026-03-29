export const LOCATION_TIMEOUT_MS = 10_000
export const LOCATION_MAX_AGE_MS = 30_000

export type LocationFailureKind =
  | 'permission-denied'
  | 'position-unavailable'
  | 'timeout'
  | 'unsupported'

export type LocationSample = {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

function isPermissionDeniedMessage(value: string): boolean {
  const normalized = value.toLowerCase()
  return (
    normalized.includes('notallowederror') ||
    normalized.includes('permission denied') ||
    normalized.includes('denied')
  )
}

export async function getCurrentLocation(
  overrides: Partial<PositionOptions> = {}
): Promise<LocationSample> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unsupported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        })
      },
      (error) => reject(error),
      {
        enableHighAccuracy: false,
        maximumAge: LOCATION_MAX_AGE_MS,
        timeout: LOCATION_TIMEOUT_MS,
        ...overrides,
      }
    )
  })
}

export function classifyLocationError(error: unknown): LocationFailureKind {
  const candidate = error as
    | { code?: number; message?: string; name?: string }
    | undefined

  if (candidate?.code === 1) return 'permission-denied'
  if (candidate?.code === 2) return 'position-unavailable'
  if (candidate?.code === 3) return 'timeout'

  if (error instanceof Error) {
    const errorText = `${error.name} ${error.message}`.toLowerCase()
    if (isPermissionDeniedMessage(errorText)) return 'permission-denied'
    if (errorText.includes('unsupported')) return 'unsupported'
  }

  const message = `${candidate?.name ?? ''} ${candidate?.message ?? ''}`.trim().toLowerCase()
  if (isPermissionDeniedMessage(message)) return 'permission-denied'
  if (message.includes('unsupported')) return 'unsupported'

  return 'unsupported'
}
