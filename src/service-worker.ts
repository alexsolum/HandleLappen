/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST || []);

// Bound every runtime cache so iOS Safari (which enforces a ~50 MB per-origin
// budget) doesn't silently flush the precache on next launch.

// Cache images with CacheFirst strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 7 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Cache API responses with NetworkFirst strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Cache SvelteKit data payloads (`__data.json`) with stale-while-revalidate so
// back-navigation paints from cache while a fresh fetch warms it.
registerRoute(
  ({ url }) => url.pathname.endsWith('/__data.json'),
  new StaleWhileRevalidate({
    cacheName: 'data',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
