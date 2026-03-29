import type { LocationSample } from './geolocation'

export const STORE_DETECTION_RADIUS_METERS = 150

export type DetectableStore = {
  id: string
  chain: string | null
  location_name: string
  lat: number | null
  lng: number | null
}

export function haversineDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const earthRadiusMeters = 6_371_000
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function findNearestDetectedStore(
  stores: DetectableStore[],
  sample: LocationSample,
  maxDistanceMeters = STORE_DETECTION_RADIUS_METERS
): { store: DetectableStore; distanceMeters: number } | null {
  let closestMatch: { store: DetectableStore; distanceMeters: number } | null = null

  for (const store of stores) {
    if (store.lat == null || store.lng == null) continue

    const distanceMeters = haversineDistanceMeters(sample, {
      latitude: store.lat,
      longitude: store.lng,
    })

    if (distanceMeters > maxDistanceMeters) continue
    if (!closestMatch || distanceMeters < closestMatch.distanceMeters) {
      closestMatch = { store, distanceMeters }
    }
  }

  return closestMatch
}
