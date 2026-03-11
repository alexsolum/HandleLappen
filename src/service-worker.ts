/// <reference lib="WebWorker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare let self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<{
		revision: string | null
		url: string
	}>
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(new NavigationRoute(new CacheFirst({ cacheName: 'app-shell' })))

registerRoute(
	({ url }: { url: URL }) =>
		url.hostname.endsWith('.supabase.co') &&
		url.pathname.startsWith('/rest/v1/') &&
		!url.pathname.startsWith('/auth/'),
	new NetworkFirst({
		cacheName: 'supabase-rest',
		networkTimeoutSeconds: 5,
		plugins: [
			new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }),
			new CacheableResponsePlugin({ statuses: [0, 200] })
		]
	}),
	'GET'
)

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') {
		void self.skipWaiting()
	}
})
