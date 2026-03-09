<script lang="ts">
  import { browser } from '$app/environment'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'

  let { data, children } = $props()

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
      },
    },
  })
</script>

<QueryClientProvider client={queryClient}>
  <div class="min-h-screen bg-gray-50">
    <header class="border-b border-gray-200 bg-white px-4 py-3">
      <div class="mx-auto flex max-w-5xl items-center gap-4">
        <a href="/" class="text-lg font-semibold text-green-700">HandleAppen</a>
      </div>
    </header>

    <main class="pb-16">
      {@render children()}
    </main>
  </div>
</QueryClientProvider>
