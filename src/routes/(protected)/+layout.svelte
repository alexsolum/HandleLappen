<script lang="ts">
  import { browser } from '$app/environment'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { createBrowserClient } from '@supabase/ssr'
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'
  import { onMount } from 'svelte'
  import BottomNav from '$lib/components/lists/BottomNav.svelte'
  import { getAll, replayBatch, replaceQueue } from '$lib/offline/queue'
  import { isOfflineMode, refreshPendingCount } from '$lib/stores/offline.svelte'

  let { data, children } = $props()
  const replaySupabase = browser
    ? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        cookies: {
          getAll() {
            const cookies: { name: string; value: string }[] = []
            if (typeof document !== 'undefined') {
              document.cookie.split('; ').forEach((c) => {
                const [name, ...rest] = c.split('=')
                cookies.push({ name, value: rest.join('=') })
              })
            }
            return cookies
          },
          setAll(cookiesToSet) {
            if (typeof document !== 'undefined') {
              cookiesToSet.forEach(({ name, value, options }) => {
                const cookieStr = `${name}=${value}; path=${options?.path || '/'}${
                  options?.maxAge ? `; max-age=${options.maxAge}` : ''
                }${options?.expires ? `; expires=${options.expires.toUTCString()}` : ''}${
                  options?.secure ? '; secure' : ''
                }${options?.sameSite ? `; samesite=${options.sameSite}` : ''}`
                document.cookie = cookieStr
              })
            }
          },
        },
      })
    : data.supabase
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
      const {
        data: { session },
      } = await data.supabase.auth.getSession()
      if (session) {
        await replaySupabase.auth.setSession(session)
      }

      const result = await replayBatch(replaySupabase, queued)
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
    void drainQueue()

    const handleOnline = () => {
      void drainQueue()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)

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
