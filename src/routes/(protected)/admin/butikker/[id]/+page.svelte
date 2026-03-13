<script lang="ts">
  import { page } from '$app/state'
  import { dndzone, type DndEvent } from 'svelte-dnd-action'
  import DraggableCategoryRow from '$lib/components/stores/DraggableCategoryRow.svelte'
  import { createStoreLayoutQuery } from '$lib/queries/categories'
  import { createStoresQuery, reorderStoreCategoriesMutation } from '$lib/queries/stores'

  type OrderedCategory = { id: string; name: string; position: number }

  let { data } = $props()

  const storeId = page.params.id
  const storeLayoutQuery = createStoreLayoutQuery(data.supabase, storeId)
  const storesQuery = createStoresQuery(data.supabase, data.householdId)
  const reorderMutation = reorderStoreCategoriesMutation(data.supabase, storeId, data.householdId)

  let orderedCategories = $state<OrderedCategory[]>([])

  $effect(() => {
    orderedCategories = (storeLayoutQuery.data ?? []) as OrderedCategory[]
  })

  const storeName = $derived(storesQuery.data?.find((store) => store.id === storeId)?.name ?? 'Butikk')

  function handleConsider(event: CustomEvent<DndEvent<OrderedCategory>>) {
    orderedCategories = event.detail.items as OrderedCategory[]
  }

  function handleFinalize(event: CustomEvent<DndEvent<OrderedCategory>>) {
    orderedCategories = event.detail.items as OrderedCategory[]
    reorderMutation.mutate({ categories: orderedCategories })
  }
</script>

<svelte:head>
  <title>{storeName} — HandleAppen</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-6 pb-24">
  <div class="mb-5 flex items-center gap-3">
    <a href="/admin/butikker" class="text-sm font-medium text-green-700 hover:text-green-800">← Butikker</a>
    <div>
      <h1 class="text-xl font-semibold text-gray-900">{storeName}</h1>
      <p class="text-sm text-gray-500">Dra kategoriene med håndtaket for å endre rekkefølgen.</p>
    </div>
  </div>

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
