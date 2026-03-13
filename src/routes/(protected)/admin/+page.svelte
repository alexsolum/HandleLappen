<script lang="ts">
  const sections = [
    { label: 'Butikker', href: '/admin/butikker' },
    { label: 'Husstand', href: '/admin/husstand' },
    { label: 'Historikk', href: '/admin/historikk' },
    { label: 'Items' },
    { label: 'Brukerinnstillinger' }
  ]
</script>

<div class="mx-auto max-w-lg px-4 py-6">
  <header class="mb-5">
    <h1 class="text-2xl font-semibold text-gray-900">Admin</h1>
  </header>
  <div class="space-y-2">
    {#each sections as section}
      {#if section.href}
        <a href={section.href} class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50">
          <span class="text-sm font-medium text-gray-900">{section.label}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4 text-gray-400">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 18 6-6-6-6" />
          </svg>
        </a>
      {:else}
        <div class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 opacity-50">
          <span class="text-sm font-medium text-gray-900">{section.label}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4 text-gray-400">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 18 6-6-6-6" />
          </svg>
        </div>
      {/if}
    {/each}
  </div>

  <div class="mt-8">
    <form action="?/logout" method="POST">
      <button
        type="submit"
        class="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        Logg ut
      </button>
    </form>
  </div>
</div>
