# Phase 5: PWA and Offline Support - Research

**Researched:** 2026-03-11
**Domain:** Progressive Web App, Service Workers, Workbox, IndexedDB offline mutation queue
**Confidence:** HIGH (core stack verified), MEDIUM (BackgroundSync Safari fallback details)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Offline status indicator:**
- When the device goes offline, a subtle signal appears immediately in the BottomNav — a dot or badge on the Lister tab. The list screens do not require the user to attempt an action to discover they're offline.
- The offline signal collapses into the pending-sync count badge when items are queued: one combined badge number (e.g. "3") replaces the dot — it implies both offline and pending state.
- Individual queued items do NOT look different in the list — they display as normal items (optimistic UI). No per-item pending marks.
- When back online and the queue has been flushed, a brief toast appears: "Endringer synkronisert" (~2 seconds). Then disappears.

**Pending-sync badge:**
- The pending-sync count lives in the BottomNav on the Lister tab — visible from all tabs (Butikker, Husstand), not only when Lister is active.
- On Android (BackgroundSync): badge count drops when background sync succeeds, followed by the success toast on next foreground.
- On Safari (next-open replay): badge count is shown on every app open while there are unsynced items; clears after replay completes, then shows the success toast.
- No separate "sync status" screen or dedicated UI for this — BottomNav badge + toast covers it.

**Install prompt:**
- Browser-native install prompt only — no custom "Add to Home Screen" banner. Let Android Chrome/Samsung Internet trigger the native prompt when criteria are met.
- No iOS Safari install instructions shown in the UI. No tooltip, no footer hint. iOS users who want to install will use the Share sheet themselves.

**Offline write scope:**
- What works offline: Check off an item, uncheck an item (same queue entry, both end in is_checked state that resolves correctly via monotone OR).
- What does NOT work offline: Add new items, remove items, create new lists.
- When the user attempts to add or remove an item while offline, the action is visually disabled — the add-item input and swipe-to-remove are non-interactive, with a tooltip or label ("Legg til krever nett" or similar). No failed mutation, no toast.
- New list creation offline: not supported. Existing lists remain readable and check-off-able.

**Conflict resolution:**
- Monotone OR for `is_checked`: if two devices both check off the same item while offline, the item stays checked on sync — no conflict error (both devices intended the item to be done).
- Soft-delete semantics for the mutation queue to handle edge cases cleanly.

### Claude's Discretion
- Exact dot size, color, and positioning within the BottomNav component
- Exact wording of the disabled-state tooltip for add/remove while offline
- PWA manifest color scheme and icon set
- Service worker caching strategy details (NetworkFirst TTL, stale-while-revalidate thresholds)
- Whether the offline dot and count badge are visually combined or sequentially shown

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PWAF-01 | App is installable on mobile home screen via browser "Add to Home Screen" | PWA manifest with required fields + service worker with fetch handler satisfies Chrome/Android installability criteria. iOS requires no extra UI — user uses Share sheet. |
| PWAF-02 | App displays the last cached shopping list when the device is offline or has poor signal | Workbox NetworkFirst strategy caches Supabase REST responses; app shell precached CacheFirst; IndexedDB mutation queue with monotone OR conflict resolution enables offline check-off. |
</phase_requirements>

---

## Summary

Phase 5 adds two capabilities: PWA installability (PWAF-01) and offline shopping (PWAF-02). The installability requirement is satisfied by adding `@vite-pwa/sveltekit` with a compliant manifest. The offline requirement requires a layered approach: the app shell and Supabase REST responses are cached by a Workbox service worker, while a custom IndexedDB mutation queue intercepts the `createCheckOffMutation` to queue `is_checked` changes when offline, replaying them on reconnection.

The most complex part is the offline mutation queue (Plan 05-02/05-03). The existing TanStack Query mutations in `src/lib/queries/items.ts` already handle optimistic updates — the offline layer wraps the `mutationFn` for check-off: if the network is unavailable, the mutation is enqueued in IndexedDB rather than submitted to Supabase. On reconnection (or next app open on Safari), the queue is drained with idempotent PATCH calls. Conflict resolution uses monotone OR: `is_checked` is sent as PATCH with no precondition check — if two devices both checked the same item, the final state is `true` regardless of order, which is the correct intent.

The Safari BackgroundSync gap is a known architectural constraint. Workbox's `BackgroundSyncPlugin` automatically falls back to `replayRequests` on service worker startup for browsers that do not support the BackgroundSync API (Safari/WebKit). This means Safari users will have their queue replayed on next app open, not in the background. The pending-sync badge in BottomNav makes this visible.

**Primary recommendation:** Use `@vite-pwa/sveltekit` v1.1.0 with `strategies: 'injectManifest'` and a custom `src/service-worker.ts`. This gives full control over BackgroundSync and NetworkFirst routing without the constraints of `generateSW`. Store the mutation queue in IndexedDB via `idb-keyval`. Expose offline/queue state via a Svelte 5 `.svelte.ts` global store that BottomNav reads reactively.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vite-pwa/sveltekit` | ^0.3.0 (latest v1.1.0) | SvelteKit PWA integration, manifest, SW registration | Official SvelteKit PWA plugin — handles globbing `.svelte-kit/output`, precache manifest injection, and dev-mode SW |
| `workbox-precaching` | bundled via plugin | Precache app shell assets | Included automatically when plugin generates SW |
| `workbox-routing` | bundled via plugin | Route-based caching strategies | Required for registerRoute / NavigationRoute |
| `workbox-strategies` | bundled via plugin | NetworkFirst, CacheFirst, StaleWhileRevalidate | Standard Workbox strategies |
| `workbox-background-sync` | bundled via plugin | Queue failed mutations, replay with BackgroundSync | Native BackgroundSync on Android + replay fallback for Safari |
| `idb-keyval` | ^6.x | Lightweight IndexedDB key-value store | 573 bytes brotli'd, promise-based, used by TanStack Query community for offline persistence |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `workbox-expiration` | bundled | Cache size/TTL limits | Pair with NetworkFirst for Supabase responses |
| `workbox-cacheable-response` | bundled | Limit what gets cached (status 200 only) | Prevent caching Supabase 4xx errors |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `idb-keyval` | `idb` (jakearchibald) | `idb` gives more control (versioned object stores, transactions), but `idb-keyval` is sufficient for a simple queue array |
| Custom mutation queue | TanStack Query `persistQueryClient` | `persistQueryClient` persists all query cache + mutations but writes the entire object to IndexedDB on every mutation — too heavy; a hand-built queue per operation is simpler and correct for this scope |
| `injectManifest` | `generateSW` | `generateSW` cannot co-locate BackgroundSync logic in the service worker source; `injectManifest` gives full SW authorship while the plugin handles precache manifest injection |

**Installation:**
```bash
npm install -D @vite-pwa/sveltekit
npm install idb-keyval
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── service-worker.ts          # Custom SW: precache, NetworkFirst, BackgroundSync
├── lib/
│   ├── stores/
│   │   └── offline.svelte.ts  # Global $state: isOnline, pendingCount — Svelte 5 runes
│   ├── offline/
│   │   └── queue.ts           # IndexedDB queue: enqueue, dequeue, getAll, clear
│   └── queries/
│       └── items.ts           # MODIFIED: checkOff mutationFn checks isOnline, enqueues if offline
└── routes/
    ├── +layout.svelte         # SW registration, inject pwaInfo webManifestLink
    └── (protected)/
        └── +layout.svelte     # Sync replay trigger on reconnect, success toast
```

### Pattern 1: SvelteKit PWA Plugin Configuration

**What:** `@vite-pwa/sveltekit` with `injectManifest` strategy so the custom `src/service-worker.ts` is compiled by Vite and receives the Workbox precache manifest injected at build time.
**When to use:** Always when you need BackgroundSync or any custom SW logic beyond simple caching.

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { SvelteKitPWA } from '@vite-pwa/sveltekit'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      registerType: 'autoUpdate',
      injectRegister: false, // manual registration in +layout.svelte
      manifest: {
        name: 'HandleAppen',
        short_name: 'HandleAppen',
        description: 'Din digitale handleliste',
        theme_color: '#16a34a', // green-600
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      kit: {
        includeVersionFile: true,
      }
    })
  ]
})
```

### Pattern 2: Custom Service Worker (injectManifest)

**What:** A TypeScript service worker that uses Workbox modules directly.
**When to use:** Whenever BackgroundSync or custom routing logic is needed.

```typescript
// src/service-worker.ts
/// <reference lib="WebWorker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { BackgroundSyncPlugin } from 'workbox-background-sync'

declare let self: ServiceWorkerGlobalScope

// Injected by vite-pwa at build time
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// App shell: CacheFirst (already precached above, this handles navigations)
registerRoute(
  new NavigationRoute(
    new CacheFirst({ cacheName: 'app-shell' })
  )
)

// Supabase REST: NetworkFirst — returns cached data when offline
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && url.pathname.startsWith('/rest/v1/'),
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

// BackgroundSync for check-off mutations (PATCH is_checked)
const checkOffQueue = new BackgroundSyncPlugin('checkoff-queue', {
  maxRetentionTime: 24 * 60 // 24 hours in minutes
})

registerRoute(
  ({ url, request }) =>
    url.hostname.includes('supabase.co') &&
    url.pathname.startsWith('/rest/v1/list_items') &&
    request.method === 'PATCH',
  new NetworkFirst({
    plugins: [checkOffQueue]
  }),
  'PATCH'
)

// Activate immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
```

### Pattern 3: Svelte 5 Global Offline Store

**What:** A `.svelte.ts` reactive module using `$state` rune, safe for SSR (guards with `typeof window`).
**When to use:** Single source of truth for online status and pending queue count, readable from any component.

```typescript
// src/lib/stores/offline.svelte.ts
import { getAll } from '$lib/offline/queue'

export const offlineStore = $state({
  isOnline: true,
  pendingCount: 0
})

export function initOfflineStore() {
  if (typeof window === 'undefined') return

  offlineStore.isOnline = navigator.onLine
  refreshPendingCount()

  window.addEventListener('online', () => {
    offlineStore.isOnline = true
  })
  window.addEventListener('offline', () => {
    offlineStore.isOnline = false
  })
}

export async function refreshPendingCount() {
  const entries = await getAll()
  offlineStore.pendingCount = entries.length
}
```

### Pattern 4: IndexedDB Mutation Queue

**What:** Simple key-value list persisted in IndexedDB via `idb-keyval`. Each queue entry carries an idempotency key (the item's `id`), operation type, and payload.
**When to use:** When `mutationFn` detects no network, enqueue instead of sending.

```typescript
// src/lib/offline/queue.ts
import { get, set } from 'idb-keyval'

export type QueuedMutation = {
  id: string              // idempotency key = list_item.id
  type: 'toggle'
  payload: {
    itemId: string
    listId: string
    isChecked: boolean
    itemName: string
    userId: string
    timestamp: string     // client timestamp for soft-delete ordering
  }
  enqueuedAt: string
}

const QUEUE_KEY = 'offline-mutation-queue'

export async function enqueue(mutation: QueuedMutation): Promise<void> {
  const existing: QueuedMutation[] = (await get(QUEUE_KEY)) ?? []
  // Deduplicate by id: later toggle replaces earlier
  const filtered = existing.filter(m => m.id !== mutation.id)
  await set(QUEUE_KEY, [...filtered, mutation])
}

export async function getAll(): Promise<QueuedMutation[]> {
  return (await get(QUEUE_KEY)) ?? []
}

export async function clear(): Promise<void> {
  await set(QUEUE_KEY, [])
}
```

### Pattern 5: Check-Off Mutation with Offline Intercept

**What:** Modified `createCheckOffMutation` that checks `navigator.onLine` and branches to enqueue or send.
**When to use:** This is the core integration point between TanStack Query optimistic updates and the offline queue.

```typescript
// In createCheckOffMutation mutationFn (conceptual):
mutationFn: async ({ itemId, isChecked, itemName }) => {
  if (!navigator.onLine) {
    await enqueue({
      id: itemId,
      type: 'toggle',
      payload: { itemId, listId, isChecked, itemName, userId, timestamp: new Date().toISOString() },
      enqueuedAt: new Date().toISOString()
    })
    await refreshPendingCount()
    return  // optimistic update already applied by onMutate
  }
  // ... existing Supabase PATCH + item_history INSERT ...
}
```

### Pattern 6: Queue Drain on Reconnect

**What:** Listen to `online` event in the protected layout, drain the queue sequentially, show toast on completion.
**When to use:** The primary sync path for both platforms. On Android, Workbox BackgroundSync may drain the queue before this fires — the drain function should be idempotent.

```typescript
// src/routes/(protected)/+layout.svelte (onMount addition)
window.addEventListener('online', async () => {
  offlineStore.isOnline = true
  const queued = await getAll()
  if (queued.length === 0) return

  let allSucceeded = true
  for (const entry of queued) {
    try {
      await replayMutation(supabase, entry)  // PATCH + item_history INSERT
    } catch {
      allSucceeded = false
    }
  }

  if (allSucceeded) {
    await clear()
    await refreshPendingCount()
    showToast('Endringer synkronisert')  // ~2 second toast
  }
})
```

### Pattern 7: SW Registration in Root Layout

**What:** Lazily import `virtual:pwa-register` in `onMount` to avoid SSR issues.
**When to use:** Always — service workers cannot be registered server-side.

```svelte
<!-- src/routes/+layout.svelte addition -->
<script lang="ts">
  import { pwaInfo } from 'virtual:pwa-info'
  import { onMount } from 'svelte'
  import { initOfflineStore } from '$lib/stores/offline.svelte.ts'

  let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '')

  onMount(async () => {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
    initOfflineStore()
  })
</script>

<svelte:head>
  {@html webManifestLink}
</svelte:head>
```

### Pattern 8: BottomNav Offline Badge

**What:** BottomNav reads `offlineStore` reactively. Shows dot when offline + no pending items, shows count badge when items are queued.

```svelte
<!-- BottomNav badge logic (Lister tab) -->
{#if offlineStore.pendingCount > 0}
  <span class="badge">{offlineStore.pendingCount}</span>
{:else if !offlineStore.isOnline}
  <span class="offline-dot"></span>
{/if}
```

### Anti-Patterns to Avoid

- **Using `generateSW` strategy:** Does not support custom service worker code; BackgroundSync requires `injectManifest`.
- **Registering SW in `svelte.config.js` default mode alongside `@vite-pwa/sveltekit`:** Will conflict; disable SvelteKit's built-in SW registration with `serviceWorker: { register: false }` in `svelte.config.js`.
- **Queuing all mutation types:** Only `toggle` (check-off/uncheck) is offline-capable per the locked decisions. Add/remove/create remain disabled offline.
- **Blocking the `mutationFn` return when offline:** The optimistic update has already been applied by `onMutate`; the `mutationFn` should resolve (not reject) after enqueuing, so TanStack Query marks the mutation as succeeded optimistically.
- **Using `persistQueryClient` for the mutation queue:** Writes the entire query cache to IndexedDB on every mutation; use a dedicated queue store instead.
- **Direct `$state` mutation from service worker messages:** Use `postMessage` → `message` event → update the store in the main thread.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker generation + precache manifest | Custom SW build pipeline | `@vite-pwa/sveltekit` with `injectManifest` | Handles `.svelte-kit/output` glob, asset hash versioning, cleanup of old caches |
| Background sync registration | Custom sync registration logic | `workbox-background-sync` `BackgroundSyncPlugin` | Handles IndexedDB-backed queue, retry scheduling, Safari fallback automatically |
| Cache strategy routing | Custom `fetch` event handler with if/else | `workbox-routing` + `workbox-strategies` | Handles race conditions, cache expiration, opaque responses (status 0) |
| PWA manifest link injection | Hardcoded `<link rel="manifest">` | `virtual:pwa-info` → `pwaInfo.webManifest.linkTag` | Plugin controls manifest URL hash for cache busting |
| IndexedDB raw API | `indexedDB.open().createObjectStore()...` | `idb-keyval` | 573 bytes, handles version management, promise-based; raw IDB API is 200+ lines for simple key-value use |

**Key insight:** The PWA plugin ecosystem handles the entire precache pipeline. The custom work is only the application-layer logic: the offline store, the queue module, and wiring them into TanStack Query mutations.

---

## Common Pitfalls

### Pitfall 1: SvelteKit Registers Its Own Service Worker by Default

**What goes wrong:** SvelteKit has a built-in `src/service-worker.js` convention that registers automatically. When `@vite-pwa/sveltekit` is added, two SW registrations collide, causing unpredictable caching behavior.
**Why it happens:** `@vite-pwa/sveltekit` expects to own SW registration; SvelteKit's default does too.
**How to avoid:** Add `serviceWorker: { register: false }` to `svelte.config.js` kit options when using the PWA plugin.
**Warning signs:** Two service workers visible in DevTools → Application tab, or stale assets after deploy.

### Pitfall 2: Service Worker Not Updating in Dev Mode

**What goes wrong:** Workbox precache hashes are computed at build time; in dev mode the hashes are absent and the SW behaves differently.
**Why it happens:** `@vite-pwa/sveltekit` provides a dev-mode SW that simulates behavior but does not hash assets.
**How to avoid:** Use `npm run build && npm run preview` to test actual SW behavior. Test offline scenarios against preview, not dev server.
**Warning signs:** Offline works in preview but not in dev (expected); errors in dev about missing manifest entries.

### Pitfall 3: Supabase Auth Tokens Not Cached

**What goes wrong:** The Supabase `Authorization: Bearer` header changes per session refresh. If NetworkFirst caches responses keyed only by URL, a token refresh produces a cache miss for no reason, and stale cached responses may be served with wrong auth context.
**Why it happens:** Workbox cache keys include headers by default only if configured with `CacheableResponsePlugin`.
**How to avoid:** Cache only GET responses from Supabase REST (not auth endpoints). Exclude `supabase.co/auth` from the NetworkFirst rule. Use URL-only cache keys for REST data.
**Warning signs:** Cached list data from another user's session visible after logout (critical security issue).

### Pitfall 4: Optimistic Update Reverts After Offline Enqueue

**What goes wrong:** When `mutationFn` is modified to enqueue and return without error, TanStack Query's `onSettled` calls `invalidateQueries`, which triggers a refetch that fails because the device is offline — causing the optimistic update to revert.
**Why it happens:** TanStack Query's `onSettled` invalidates regardless of whether it succeeded online or was enqueued offline.
**How to avoid:** In the modified `mutationFn`, after enqueuing, do NOT call `queryClient.invalidateQueries` in `onSettled` when offline. Conditionally skip invalidation: check `navigator.onLine` in `onSettled` and skip if offline.
**Warning signs:** Item flickers checked → unchecked immediately after check-off while offline.

### Pitfall 5: Safari BackgroundSync Fallback Timing

**What goes wrong:** On Safari, Workbox's BackgroundSync fallback replays on every SW startup, not on the `online` event. If the queue drain in the main thread (pattern 6) fires on reconnect AND the SW also replays via `replayRequests`, the same PATCH is sent twice.
**Why it happens:** Two replay triggers run concurrently — main thread `online` handler and SW `replayRequests` on activate.
**How to avoid:** Use idempotency key deduplication in the queue (`enqueue` replaces older entry for same `itemId`). The Supabase PATCH is also naturally idempotent for `is_checked` (monotone OR — setting `true` twice = `true`). Do not worry about double-send producing wrong state. Do clear the IndexedDB queue after successful drain from the main thread.
**Warning signs:** `item_history` table has duplicate rows for the same check-off event.

### Pitfall 6: `virtual:pwa-info` Import in SSR Context

**What goes wrong:** `import { pwaInfo } from 'virtual:pwa-info'` works client-side but may be `undefined` during SSR, causing `pwaInfo.webManifest.linkTag` to throw.
**Why it happens:** The virtual module is undefined during SSR builds.
**How to avoid:** Guard with `pwaInfo ? pwaInfo.webManifest.linkTag : ''` (as shown in official docs and Pattern 7 above).
**Warning signs:** Build-time error or blank manifest link in production HTML.

### Pitfall 7: Icon Files Missing — App Not Installable

**What goes wrong:** The PWA manifest references icon files that do not exist in `static/`, causing the install criteria to fail silently. Android Chrome will not show the install prompt.
**Why it happens:** PWA plugin generates the manifest but does not generate the icons.
**How to avoid:** Icons must be placed in `static/icons/` before building. Minimum requirement: `icon-192.png` and `icon-512.png`. Use a maskable icon (`icon-512-maskable.png`) for Android adaptive icons. Generate all sizes from one source SVG using a tool like PWA Asset Generator or Squoosh.
**Warning signs:** Lighthouse PWA audit fails with "Icons do not specify sizes."

---

## Code Examples

Verified patterns from official sources:

### PWA Info Web Manifest Link (official @vite-pwa/sveltekit docs)
```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { pwaInfo } from 'virtual:pwa-info'
  let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '')
</script>

<svelte:head>
  {@html webManifestLink}
</svelte:head>
```
Source: https://vite-pwa-org.netlify.app/frameworks/sveltekit

### SW Auto-Register (official vite-pwa docs)
```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  onMount(async () => {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
  })
</script>
```
Source: https://vite-pwa-org.netlify.app/frameworks/sveltekit

### Workbox BackgroundSync Plugin (official workbox-background-sync docs)
```typescript
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { NetworkOnly } from 'workbox-strategies'
import { registerRoute } from 'workbox-routing'

const bgSyncPlugin = new BackgroundSyncPlugin('myQueueName', {
  maxRetentionTime: 24 * 60 // Retry for max of 24 Hours (specified in minutes)
})

registerRoute(
  /\/api\/.*\/*.json/,
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'POST'
)
```
Source: https://developer.chrome.com/docs/workbox/modules/workbox-background-sync

### idb-keyval Update (atomic queue append)
```typescript
import { update } from 'idb-keyval'

// Atomic append — update() serializes concurrent calls automatically
await update('my-queue', (existing = []) => [...existing, newEntry])
```
Source: https://github.com/jakearchibald/idb-keyval

### Svelte 5 Global $state in .svelte.ts (from Mainmatter 2025 guide)
```typescript
// src/lib/stores/offline.svelte.ts
export const offlineStore = $state({ isOnline: true, pendingCount: 0 })
// Use as: offlineStore.isOnline, offlineStore.pendingCount
// Mutate as: offlineStore.isOnline = false
```
Source: https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte stores (`writable`) for global state | Svelte 5 `$state` in `.svelte.ts` | Svelte 5 (2024) | Works in `.svelte.ts` files, not just components; simpler syntax |
| `generateSW` with `runtimeCaching` config | `injectManifest` + custom SW TypeScript | Workbox 7 era | Full type-safety and co-location of all SW logic |
| `persistQueryClient` for offline queries | Dedicated IndexedDB queue module | 2024 | Avoids writing entire query cache on every mutation; lighter and correct |
| `@vite-pwa/sveltekit` v0.x | v1.1.0 (Nov 2025) | v1.0.0 March 2025 | Breaking: updated `vite-plugin-pwa` to v1.0.0 |

**Deprecated/outdated:**
- `vite-plugin-pwa` directly in SvelteKit projects: use `@vite-pwa/sveltekit` wrapper instead — it handles SvelteKit-specific glob patterns for `.svelte-kit/output`.
- `registerType: 'prompt'` pattern for shopping apps: use `autoUpdate` — users should not need to confirm SW updates during shopping.

---

## Open Questions

1. **Vite 7 peer dependency compatibility**
   - What we know: Project uses Vite 7.3.1. `@vite-pwa/sveltekit` v1.1.0 released November 2025. Search confirmed `@sveltejs/vite-plugin-svelte` had Vite 7 peer issues in other contexts.
   - What's unclear: Whether `@vite-pwa/sveltekit` v1.1.0 explicitly supports Vite 7 (could not verify peer deps without npm access).
   - Recommendation: Run `npm install -D @vite-pwa/sveltekit` and check for peer dependency warnings at install time. If peer conflict, use `--legacy-peer-deps` or pin to a compatible version. This is a Wave 0 task.

2. **Supabase REST URL pattern for NetworkFirst route**
   - What we know: Supabase project URL has the pattern `https://<project-ref>.supabase.co/rest/v1/`.
   - What's unclear: The exact project ref is in `.env.local` as `PUBLIC_SUPABASE_URL` — the regex must match this at runtime, not hardcode the domain.
   - Recommendation: Use `({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/')` in the route matcher.

3. **item_history duplicate on double-sync**
   - What we know: When check-off is replayed from the main thread AND possibly Workbox BackgroundSync on Safari, the `item_history` INSERT could be duplicated.
   - What's unclear: Whether the SW-level BackgroundSync replays only the Workbox-queued requests (different from the IndexedDB app queue).
   - Recommendation: The custom app queue (idb-keyval) and Workbox's BackgroundSyncPlugin queue are separate. In the planned architecture, only the custom app queue is used for check-off; Workbox BackgroundSync is NOT used for check-off PATCH (to avoid double drain). Use one mechanism only.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright ^1.58.2 |
| Config file | `playwright.config.ts` |
| Quick run command | `npm run test:e2e -- --project=chromium tests/pwa.spec.ts` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PWAF-01 | Manifest link tag present in HTML head | smoke | `npm run test:e2e -- tests/pwa.spec.ts` | ❌ Wave 0 |
| PWAF-01 | Manifest has required installability fields (name, icons, display:standalone, start_url) | smoke | `npm run test:e2e -- tests/pwa.spec.ts` | ❌ Wave 0 |
| PWAF-01 | Service worker registered successfully | smoke | `npm run test:e2e -- tests/pwa.spec.ts` | ❌ Wave 0 |
| PWAF-02 | Check-off is applied optimistically with no network | integration | `npm run test:e2e -- tests/offline.spec.ts` | ❌ Wave 0 |
| PWAF-02 | Offline badge appears in BottomNav when device goes offline | integration | `npm run test:e2e -- tests/offline.spec.ts` | ❌ Wave 0 |
| PWAF-02 | Pending count increments when item is checked off offline | integration | `npm run test:e2e -- tests/offline.spec.ts` | ❌ Wave 0 |
| PWAF-02 | Queue drains and toast shows "Endringer synkronisert" on reconnect | integration | `npm run test:e2e -- tests/offline.spec.ts` | ❌ Wave 0 |
| PWAF-02 | Add-item input is disabled when offline | integration | `npm run test:e2e -- tests/offline.spec.ts` | ❌ Wave 0 |

**Note on Playwright offline testing:** Playwright supports `page.context().setOffline(true)` to simulate network loss. This is the correct approach for PWAF-02 tests — no real network disruption needed.

```typescript
// Example pattern for offline tests
await context.setOffline(true)
await page.click('[data-testid="item-checkbox"]')
// Verify optimistic update and badge
await expect(page.locator('.offline-badge')).toBeVisible()
await context.setOffline(false)
// Verify sync toast
await expect(page.locator('.toast')).toContainText('Endringer synkronisert')
```

### Sampling Rate
- **Per task commit:** `npm run test:e2e -- tests/pwa.spec.ts tests/offline.spec.ts`
- **Per wave merge:** `npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/pwa.spec.ts` — covers PWAF-01 manifest and SW registration smoke tests
- [ ] `tests/offline.spec.ts` — covers PWAF-02 offline check-off, queue, reconnect sync, disabled UI
- [ ] `static/icons/icon-192.png` — required for PWA installability (must exist before build)
- [ ] `static/icons/icon-512.png` — required for PWA installability
- [ ] `static/icons/icon-512-maskable.png` — required for Android adaptive icons

---

## Sources

### Primary (HIGH confidence)
- https://vite-pwa-org.netlify.app/frameworks/sveltekit — `@vite-pwa/sveltekit` configuration guide, webManifestLink, registerSW
- https://developer.chrome.com/docs/workbox/modules/workbox-background-sync — BackgroundSyncPlugin API, maxRetentionTime, Safari fallback behavior
- https://github.com/jakearchibald/idb-keyval — idb-keyval API, `update` atomic method
- https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/ — Svelte 5 global `$state` patterns in `.svelte.ts`
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable — PWA installability criteria (HTTPS, manifest, SW with fetch handler, icons 192+512)

### Secondary (MEDIUM confidence)
- https://github.com/vite-pwa/sveltekit/releases — v1.1.0 confirmed as latest, v1.0.0 breaking change to vite-plugin-pwa v1.0.0
- https://vite-pwa-org.netlify.app/workbox/inject-manifest — injectManifest strategy overview
- https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/ — IndexedDB queue data structure, idempotency via clientId, replay pattern
- https://web.dev/articles/install-criteria — installability criteria verification

### Tertiary (LOW confidence)
- https://github.com/GoogleChrome/workbox/issues/2386 — Safari BackgroundSync fallback not triggering on `online` event (older issue, behavior may differ per Workbox version)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@vite-pwa/sveltekit`, `workbox-*`, `idb-keyval` all verified against official docs and npm
- Architecture: HIGH — patterns derived from official Workbox and vite-pwa documentation
- Pitfalls: HIGH for SW/SvelteKit conflicts and manifest icons; MEDIUM for Safari BackgroundSync timing edge case
- Vite 7 compatibility: LOW — peer deps for `@vite-pwa/sveltekit` v1.1.0 with Vite 7 not confirmed; verify at install time

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (30 days — Workbox and vite-pwa are relatively stable)