<script lang="ts">
  import { page } from '$app/state'
  import { dndzone, type DndEvent } from 'svelte-dnd-action'
  import DraggableCategoryRow from '$lib/components/stores/DraggableCategoryRow.svelte'
  import StoreMapWidget from '$lib/components/stores/StoreMapWidget.svelte'
  import { createStoreLayoutQuery } from '$lib/queries/categories'
  import { createStoresQuery, reorderStoreCategoriesMutation, updateStoreMutation } from '$lib/queries/stores'
  import { storeDisplayName, CHAIN_OPTIONS } from '$lib/utils/stores'

  type OrderedCategory = { id: string; name: string; position: number }

  let { data } = $props()

  const storeId = page.params.id
  const storeLayoutQuery = createStoreLayoutQuery(data.supabase, storeId)
  const storesQuery = createStoresQuery(data.supabase, data.householdId)
  const reorderMutation = reorderStoreCategoriesMutation(data.supabase, storeId, data.householdId)
  const updateMutation = updateStoreMutation(data.supabase, data.householdId)

  let orderedCategories = $state<OrderedCategory[]>([])
  let editChain = $state<string | null>(null)
  let editLocationName = $state('')
  let pendingLat = $state<number | null>(null)
  let pendingLng = $state<number | null>(null)
  let initialized = $state(false)

  $effect(() => {
    orderedCategories = (storeLayoutQuery.data ?? []) as OrderedCategory[]
  })

  const currentStore = $derived(storesQuery.data?.find((store) => store.id === storeId))

  $effect(() => {
    if (currentStore && !initialized) {
      editChain = currentStore.chain
      editLocationName = currentStore.location_name
      pendingLat = currentStore.lat
      pendingLng = currentStore.lng
      initialized = true
    }
  })

  const composedName = $derived(storeDisplayName(editChain, editLocationName))

  function handleConsider(event: CustomEvent<DndEvent<OrderedCategory>>) {
    orderedCategories = event.detail.items as OrderedCategory[]
  }

  function handleFinalize(event: CustomEvent<DndEvent<OrderedCategory>>) {
    orderedCategories = event.detail.items as OrderedCategory[]
    reorderMutation.mutate({ categories: orderedCategories })
  }

  function handleSave() {
    if (!editLocationName.trim()) return
    updateMutation.mutate({
      id: storeId,
      chain: editChain,
      location_name: editLocationName,
      lat: pendingLat,
      lng: pendingLng,
    })
  }

  function handleLocationChange(lat: number, lng: number) {
    pendingLat = lat
    pendingLng = lng
  }
</script>

<svelte:head>
  <title>{composedName || 'Rediger butikk'} — HandleAppen</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-6 pb-24">
  <a href="/admin/butikker" class="text-sm font-medium text-green-700 hover:text-green-800">← Butikker</a>
  <h1 class="mt-3 mb-4 text-xl font-semibold text-gray-900">{composedName || 'Rediger butikk'}</h1>

  <div class="mb-4 space-y-4 rounded-xl border border-gray-200 bg-white px-4 py-4">
    <div>
      <label for="store-chain" class="block text-sm font-medium text-gray-700">Kjede</label>
      <select
        id="store-chain"
        bind:value={editChain}
        class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        disabled={updateMutation.isPending}
      >
        <option value={null}>Velg kjede...</option>
        {#each CHAIN_OPTIONS as chain}
          <option value={chain}>{chain}</option>
        {/each}
      </select>
    </div>

    <div>
      <label for="store-location" class="block text-sm font-medium text-gray-700">Butikknavn</label>
      <input
        id="store-location"
        bind:value={editLocationName}
        class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none"
        placeholder="f.eks. Teie"
        maxlength="80"
        disabled={updateMutation.isPending}
      />
    </div>

    {#if editLocationName.trim()}
      <p class="text-sm font-medium text-gray-600">Vises som: {composedName}</p>
    {/if}

    <StoreMapWidget lat={pendingLat} lng={pendingLng} onLocationChange={handleLocationChange} />

    <button
      type="button"
      onclick={handleSave}
      class="w-full rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={updateMutation.isPending || !editLocationName.trim()}
    >
      {updateMutation.isPending ? 'Lagrer...' : 'Lagre endringer'}
    </button>

    {#if updateMutation.isError}
      <div class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        Noe gikk galt. Endringen ble ikke lagret — prøv igjen.
      </div>
    {/if}
  </div>

  <p class="mb-4 text-sm text-gray-500">Dra kategoriene med håndtaket for å endre rekkefølgen.</p>

  {#if reorderMutation.isError}
    <div class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      Kunne ikke lagre ny rekkefølge.
    </div>
  {/if}

  {#if storeLayoutQuery.isPending}
    <p class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
      Laster kategorier…
    </p>
  {:else if storeLayoutQuery.isError}
    <p class="rounded-xl border border-dashed border-red-200 px-4 py-6 text-center text-sm text-red-600">
      Kunne ikke laste butikkoppsettet.
    </p>
  {:else}
    <div
      class="space-y-3"
      use:dndzone={{ items: orderedCategories, flipDurationMs: 200, dragStartThreshold: 1, delayTouchStart: true }}
      onconsider={handleConsider}
      onfinalize={handleFinalize}
    >
      {#each orderedCategories as category (category.id)}
        <DraggableCategoryRow {category} />
      {/each}
    </div>
  {/if}
</div>
