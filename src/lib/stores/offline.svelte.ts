import { getAll } from '$lib/offline/queue'

export const offlineStore = $state({
	isOnline: true,
	pendingCount: 0
})

let initialized = false

export function initOfflineStore(): void {
	if (typeof window === 'undefined' || initialized) return

	initialized = true
	offlineStore.isOnline = navigator.onLine
	void refreshPendingCount()

	window.addEventListener('online', () => {
		offlineStore.isOnline = true
	})

	window.addEventListener('offline', () => {
		offlineStore.isOnline = false
		void refreshPendingCount()
	})
}

export async function refreshPendingCount(): Promise<void> {
	if (typeof window === 'undefined') return

	const entries = await getAll()
	offlineStore.pendingCount = entries.length
}

if (typeof window !== 'undefined') {
	initOfflineStore()
}
