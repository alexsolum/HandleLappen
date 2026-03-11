<script lang="ts">
  import { page } from '$app/state'
  import { offlineStore } from '$lib/stores/offline.svelte'

  const tabs = [
    { label: 'Lister', href: '/', active: true },
    { label: 'Husstand', href: '/husstand', active: true },
    { label: 'Butikker', href: '/butikker', active: true },
    { label: 'Anbefalinger', href: null, active: false }, // Phase 6
  ]
</script>

<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
  {#each tabs as tab}
    {#if tab.active && tab.href}
      {#if tab.href === '/'}
        <div class="relative flex-1">
          <a
            href={tab.href}
            class="block py-2 text-center text-xs {page.url.pathname === tab.href ? 'text-green-700 font-semibold' : 'text-gray-500'}"
          >
            {tab.label}
          </a>
          {#if offlineStore.pendingCount > 0}
            <span
              class="absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white"
              aria-label={`${offlineStore.pendingCount} endringer venter synkronisering`}
            >
              {offlineStore.pendingCount}
            </span>
          {:else if !offlineStore.isOnline}
            <span
              class="absolute right-3 top-2 h-2 w-2 rounded-full bg-orange-400"
              aria-label="Offline"
            ></span>
          {/if}
        </div>
      {:else}
        <a
          href={tab.href}
          class="flex-1 py-2 text-center text-xs {page.url.pathname === tab.href ? 'text-green-700 font-semibold' : 'text-gray-500'}"
        >
          {tab.label}
        </a>
      {/if}
    {:else}
      <span class="flex-1 py-2 text-center text-xs text-gray-300 cursor-not-allowed opacity-50">
        {tab.label}
      </span>
    {/if}
  {/each}
</nav>
