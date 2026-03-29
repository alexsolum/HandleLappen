import {
  classifyLocationError,
  getCurrentLocation,
  type LocationFailureKind,
  type LocationSample,
} from './geolocation'
import { findNearestDetectedStore, type DetectableStore } from './proximity'

export const LOCATION_NORMAL_POLL_MS = 60_000
export const LOCATION_RETRY_POLL_MS = 12_000

export type LocationSessionStatus =
  | 'idle'
  | 'explaining'
  | 'locating'
  | 'active'
  | 'permission-denied'
  | 'unavailable'

export const locationSession = $state({
  status: 'idle' as LocationSessionStatus,
  detectedStoreId: null as string | null,
  lastFailure: null as LocationFailureKind | null,
  showSettingsHint: false,
  lastSample: null as LocationSample | null,
})

let activeStores: DetectableStore[] = []
let pollTimer: ReturnType<typeof setTimeout> | null = null
let visibilityListenerBound = false
let pollingEnabled = false
let inFlight = false
let deniedCount = 0

function clearPollTimer() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

function applyDetectedStore(sample: LocationSample) {
  locationSession.lastSample = sample
  locationSession.lastFailure = null

  const nearestStore = findNearestDetectedStore(activeStores, sample)
  locationSession.detectedStoreId = nearestStore?.store.id ?? null
}

function ensureVisibilityListener() {
  if (typeof document === 'undefined' || visibilityListenerBound) return

  document.addEventListener('visibilitychange', handleVisibilityChange)
  visibilityListenerBound = true
}

function removeVisibilityListener() {
  if (typeof document === 'undefined' || !visibilityListenerBound) return

  document.removeEventListener('visibilitychange', handleVisibilityChange)
  visibilityListenerBound = false
}

function schedulePoll(delayMs: number, allowQuickRetry: boolean) {
  clearPollTimer()
  if (!pollingEnabled || typeof window === 'undefined') return

  pollTimer = setTimeout(() => {
    void runLocationRequest({ allowQuickRetry })
  }, delayMs)
}

function handleVisibilityChange() {
  if (!pollingEnabled) return

  if (document.visibilityState === 'hidden') {
    clearPollTimer()
    return
  }

  schedulePoll(0, true)
}

function handleSuccessfulSample(sample: LocationSample) {
  deniedCount = 0
  applyDetectedStore(sample)
  locationSession.status = 'active'
  locationSession.showSettingsHint = false
  schedulePoll(LOCATION_NORMAL_POLL_MS, true)
}

function handleFailure(kind: LocationFailureKind, allowQuickRetry: boolean) {
  locationSession.lastFailure = kind

  if (kind === 'permission-denied') {
    deniedCount += 1
    pollingEnabled = false
    locationSession.status = 'permission-denied'
    locationSession.showSettingsHint = deniedCount >= 2
    clearPollTimer()
    removeVisibilityListener()
    return
  }

  locationSession.status = 'unavailable'

  if (kind === 'unsupported') {
    pollingEnabled = false
    clearPollTimer()
    removeVisibilityListener()
    return
  }

  if (allowQuickRetry) {
    schedulePoll(LOCATION_RETRY_POLL_MS, false)
    return
  }

  schedulePoll(LOCATION_NORMAL_POLL_MS, true)
}

async function runLocationRequest({
  allowQuickRetry,
}: {
  allowQuickRetry: boolean
}): Promise<void> {
  if (!pollingEnabled || inFlight) return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return

  inFlight = true

  try {
    const sample = await getCurrentLocation()
    handleSuccessfulSample(sample)
  } catch (error) {
    handleFailure(classifyLocationError(error), allowQuickRetry)
  } finally {
    inFlight = false
  }
}

function startPolling(stores: DetectableStore[]) {
  activeStores = stores
  pollingEnabled = true
  ensureVisibilityListener()
  clearPollTimer()
}

export function beginLocationExplanation(): void {
  if (pollingEnabled) return

  deniedCount = 0
  locationSession.status = 'explaining'
  locationSession.lastFailure = null
  locationSession.showSettingsHint = false
}

export async function confirmAutomaticStore(stores: DetectableStore[]): Promise<void> {
  if (inFlight) return

  startPolling(stores)
  locationSession.status = 'locating'
  locationSession.lastFailure = null
  locationSession.showSettingsHint = false
  inFlight = true

  try {
    const sample = await getCurrentLocation()
    handleSuccessfulSample(sample)
  } catch (error) {
    handleFailure(classifyLocationError(error), true)
  } finally {
    inFlight = false
  }
}

export async function retryLocationDetection(stores: DetectableStore[]): Promise<void> {
  if (inFlight) return

  startPolling(stores)
  locationSession.status = 'locating'
  locationSession.lastFailure = null
  inFlight = true

  try {
    const sample = await getCurrentLocation()
    handleSuccessfulSample(sample)
  } catch (error) {
    handleFailure(classifyLocationError(error), true)
  } finally {
    inFlight = false
  }
}

export function cancelLocationExplanation(): void {
  if (pollingEnabled) {
    locationSession.status = 'active'
    return
  }

  locationSession.status = 'idle'
  locationSession.lastFailure = null
  locationSession.showSettingsHint = false
}

export function refreshLocationStores(stores: DetectableStore[]): void {
  activeStores = stores

  if (locationSession.lastSample) {
    locationSession.detectedStoreId =
      findNearestDetectedStore(activeStores, locationSession.lastSample)?.store.id ?? null
  }
}

export function stopLocationSession(): void {
  pollingEnabled = false
  clearPollTimer()
  removeVisibilityListener()
  inFlight = false
  deniedCount = 0
  activeStores = []
  locationSession.status = 'idle'
  locationSession.lastFailure = null
  locationSession.showSettingsHint = false
}
