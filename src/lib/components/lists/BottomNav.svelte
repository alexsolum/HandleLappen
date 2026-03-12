<script lang="ts">
  import { page } from '$app/state'
  import { offlineStore } from '$lib/stores/offline.svelte'
  import { activeListStore } from '$lib/stores/active-list.svelte'

  type Tab = {
    label: string
    href: string
    active: boolean
    icon: 'lists' | 'home' | 'stores' | 'recommendations'
  }

  const recommendationHref = $derived(
    activeListStore.listId ? `/anbefalinger?list=${activeListStore.listId}` : '/anbefalinger'
  )

  const tabs: Tab[] = [
    { label: 'Lister', href: '/', active: true, icon: 'lists' },
    { label: 'Husstand', href: '/husstand', active: true, icon: 'home' },
    { label: 'Butikker', href: '/butikker', active: true, icon: 'stores' },
    { label: 'Anbefalinger', href: '/anbefalinger', active: true, icon: 'recommendations' },
  ]

  function isActive(tab: Tab, href: string) {
    if (tab.label === 'Anbefalinger') return page.url.pathname === '/anbefalinger'
    return page.url.pathname === href
  }
</script>

{#snippet tabIcon(icon: Tab['icon'])}
  {#if icon === 'lists'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  {:else if icon === 'home'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5M9 20v-5h6v5" />
    </svg>
  {:else if icon === 'stores'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 10h16M6 10V6h12v4M6 10v8h12v-8M9 14h6" />
    </svg>
  {:else}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 21-1.5-1.35C5 14.8 2 12.09 2 8.75 2 6.04 4.04 4 6.75 4c1.54 0 3.01.72 3.95 1.86C11.64 4.72 13.11 4 14.65 4 17.36 4 19.4 6.04 19.4 8.75c0 3.34-3 6.05-8.5 10.9Z" />
    </svg>
  {/if}
{/snippet}

<nav
  class="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2"
  data-testid="bottom-dock"
>
  <div class="mx-auto max-w-lg rounded-[1.75rem] border border-gray-200 bg-white/95 p-2 shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur">
    <div class="grid grid-cols-4 gap-1">
      {#each tabs as tab}
        {#if tab.active && tab.href}
          {@const href = tab.label === 'Anbefalinger' ? recommendationHref : tab.href}
          {@const active = isActive(tab, href)}

          <a
            href={href}
            class={`relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
              active
                ? 'bg-green-50 text-green-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-sm">
              {@render tabIcon(tab.icon)}
            </span>
            <span>{tab.label}</span>

            {#if tab.href === '/'}
              {#if offlineStore.pendingCount > 0}
                <span
                  class="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white"
                  aria-label={`${offlineStore.pendingCount} endringer venter synkronisering`}
                  data-testid="pending-badge"
                >
                  {offlineStore.pendingCount}
                </span>
              {:else if !offlineStore.isOnline}
                <span
                  class="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-orange-400"
                  aria-label="Offline"
                  data-testid="offline-indicator"
                ></span>
              {/if}
            {/if}
          </a>
        {/if}
      {/each}
    </div>
  </div>
</nav>
