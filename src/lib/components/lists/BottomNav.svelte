<script lang="ts">
  import { page } from '$app/state'

  const tabs = [
    { label: 'Lister', href: '/', active: true },
    { label: 'Husstand', href: '/husstand', active: true },
    { label: 'Butikker', href: null, active: false }, // Phase 3
    { label: 'Anbefalinger', href: null, active: false }, // Phase 6
  ]
</script>

<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
  {#each tabs as tab}
    {#if tab.active && tab.href}
      <a
        href={tab.href}
        class="flex-1 py-2 text-center text-xs {page.url.pathname === tab.href ? 'text-green-700 font-semibold' : 'text-gray-500'}"
      >
        {tab.label}
      </a>
    {:else}
      <span class="flex-1 py-2 text-center text-xs text-gray-300 cursor-not-allowed opacity-50">
        {tab.label}
      </span>
    {/if}
  {/each}
</nav>
