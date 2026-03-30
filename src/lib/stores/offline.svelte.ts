import { getAll } from '$lib/offline/queue'

export const offlineStore = $state({
	isOnline: true,
	pendingCount: 0
})

let initialized = false
let currentIsOnline = true

function setPendingDebugCount(count: number) {
	if (typeof window === 'undefined') return
	;(window as Window & { __pendingQueueCount?: number }).__pendingQueueCount = count
}

function syncOnlineState() {
	if (typeof window === 'undefined') return true

	currentIsOnline = navigator.onLine
	offlineStore.isOnline = currentIsOnline
	return currentIsOnline
}

export function isOfflineMode(): boolean {
	if (typeof window === 'undefined') return false
	if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
	return !offlineStore.isOnline
}

export function initOfflineStore(): void {
	if (typeof window === 'undefined' || initialized) return

	initialized = true
	syncOnlineState()
	void refreshPendingCount()

	const handleConnectivityChange = () => {
		syncOnlineState()

		if (!offlineStore.isOnline) {
			void refreshPendingCount()
		}
	}

	window.addEventListener('online', handleConnectivityChange)
	window.addEventListener('offline', handleConnectivityChange)
	window.addEventListener('focus', handleConnectivityChange)
	document.addEventListener('visibilitychange', handleConnectivityChange)
}

export async function refreshPendingCount(): Promise<void> {
	if (typeof window === 'undefined') return

	const entries = await getAll()
	offlineStore.pendingCount = entries.length
	setPendingDebugCount(entries.length)
}

if (typeof window !== 'undefined') {
	initOfflineStore()
}
