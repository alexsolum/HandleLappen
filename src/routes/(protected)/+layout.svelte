<script lang="ts">
  import { browser } from '$app/environment'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { onMount } from 'svelte'
  import BottomNav from '$lib/components/lists/BottomNav.svelte'
  import { getAll, replayBatch, replaceQueue } from '$lib/offline/queue'
  import { isOfflineMode, refreshPendingCount } from '$lib/stores/offline.svelte'

  let { data, children } = $props()
  let syncToast = $state(false)
  let drainingQueue = false
  let lastDrainAt = 0
  let scheduledDrain: ReturnType<typeof setTimeout> | null = null
  let syncToastTimeout: ReturnType<typeof setTimeout> | null = null

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
      },
    },
  })

  async function drainQueue() {
    if (!browser || drainingQueue) return
    const now = Date.now()
    const sinceLast = now - lastDrainAt
    if (sinceLast < 2000) {
      if (!scheduledDrain) {
        scheduledDrain = setTimeout(() => {
          scheduledDrain = null
          void drainQueue()
        }, 2000 - sinceLast)
      }
      return
    }
    lastDrainAt = now

    await refreshPendingCount()

    if (isOfflineMode()) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 250))

    const queued = await getAll()
    if (queued.length === 0) return

    drainingQueue = true

    try {
      const result = await replayBatch(data.supabase, queued)
      await replaceQueue(result.survivors)
      await refreshPendingCount()

      if (result.succeeded > 0 && result.failed === 0) {
        showSyncToast()
      }
    } finally {
      drainingQueue = false
    }
  }

  function showSyncToast() {
    if (syncToastTimeout) {
      clearTimeout(syncToastTimeout)
    }

    syncToast = true
    syncToastTimeout = setTimeout(() => {
      syncToast = false
      syncToastTimeout = null
    }, 2000)
  }

  onMount(() => {
    // Defer the initial offline-queue drain so it doesn't compete with first paint.
    // requestIdleCallback yields until the browser is genuinely idle; fall back to
    // setTimeout for browsers that don't expose it (mainly older iOS Safari).
    const ric =
      typeof window !== 'undefined' &&
      (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
        .requestIdleCallback
    let idleHandle: ReturnType<typeof setTimeout> | number | null = null
    if (typeof ric === 'function') {
      idleHandle = ric(() => void drainQueue(), { timeout: 2500 })
    } else {
      idleHandle = setTimeout(() => void drainQueue(), 1500)
    }

    const handleOnline = () => {
      void drainQueue()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)

      if (idleHandle !== null) {
        const cancelIdle = (window as Window & { cancelIdleCallback?: (h: number) => void })
          .cancelIdleCallback
        if (typeof cancelIdle === 'function' && typeof idleHandle === 'number') {
          cancelIdle(idleHandle)
        } else if (typeof idleHandle !== 'number') {
          clearTimeout(idleHandle)
        }
      }

      if (syncToastTimeout) {
        clearTimeout(syncToastTimeout)
      }
    }
  })
</script>

<QueryClientProvider client={queryClient}>
  <div class="min-h-screen overflow-x-clip bg-gray-50">
    <header class="border-b border-gray-200 bg-white px-4 py-3">
      <div class="mx-auto flex max-w-5xl items-center gap-4">
        <a href="/" class="text-lg font-semibold text-green-700">HandleAppen</a>
      </div>
    </header>

    <main class="overflow-x-clip pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      {#if syncToast}
        <div
          class="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-800 px-4 py-2 text-sm text-white shadow-lg"
          role="status"
          aria-live="polite"
          data-testid="sync-toast"
        >
          Endringer synkronisert
        </div>
      {/if}

      {@render children()}
    </main>

    <BottomNav />
  </div>
</QueryClientProvider>
