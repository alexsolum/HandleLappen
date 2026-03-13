<script lang="ts">
  import { page } from '$app/state'
  import { offlineStore } from '$lib/stores/offline.svelte'
  import { activeListStore } from '$lib/stores/active-list.svelte'

  type Tab = {
    label: string
    href: string
    active: boolean
    icon: 'lists' | 'recommendations' | 'book' | 'gear'
  }

  const recommendationHref = $derived(
    activeListStore.listId ? `/anbefalinger?list=${activeListStore.listId}` : '/anbefalinger'
  )

  const tabs: Tab[] = [
    { label: 'Handleliste', href: '/', active: true, icon: 'lists' },
    { label: 'Oppskrifter', href: '/oppskrifter', active: true, icon: 'book' },
    { label: 'Anbefalinger', href: '/anbefalinger', active: true, icon: 'recommendations' },
    { label: 'Admin', href: '/admin', active: true, icon: 'gear' },
  ]

  function isActive(tab: Tab, href: string) {
    const path = page.url.pathname
    if (tab.href === '/') return path === '/' || path.startsWith('/lister/')
    if (tab.href === '/anbefalinger') return path === '/anbefalinger'
    return path === tab.href || path.startsWith(tab.href + '/')
  }
</script>

{#snippet tabIcon(icon: Tab['icon'])}
  {#if icon === 'lists'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  {:else if icon === 'book'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  {:else if icon === 'gear'}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.869a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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
          {@const href = tab.href === '/anbefalinger' ? recommendationHref : tab.href}
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
