<script lang="ts">
  import {
    createItemsQuery,
    createAddItemMutation,
    createDeleteItemMutation,
    createCheckOffMutation,
    createAssignCategoryMutation,
    createUpdateItemMutation,
    itemsQueryKey,
  } from '$lib/queries/items'
  import { createCategoriesQuery, createStoreLayoutQuery } from '$lib/queries/categories'
  import { createStoresQuery } from '$lib/queries/stores'
  import {
    createBarcodeLookupMutation,
    resolveCanonicalCategoryId,
    type BarcodeSheetModel,
  } from '$lib/queries/barcode'
  import CategorySection from '$lib/components/items/CategorySection.svelte'
  import BarcodeLookupSheet from '$lib/components/barcode/BarcodeLookupSheet.svelte'
  import CategoryPickerModal from '$lib/components/items/CategoryPickerModal.svelte'
  import ItemInput from '$lib/components/items/ItemInput.svelte'
  import ItemDetailSheet from '$lib/components/items/ItemDetailSheet.svelte'
  import DoneSection from '$lib/components/items/DoneSection.svelte'
  import StoreSelector from '$lib/components/stores/StoreSelector.svelte'
  import { setActiveList } from '$lib/stores/active-list.svelte'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { onDestroy } from 'svelte'

  type Item = {
    id: string
    name: string
    quantity: number | null
    is_checked: boolean
    category_id: string | null
  }

  let { data } = $props()
  let selectedStoreId = $state<string | null>(null)
  let pendingCategoryItem = $state<{ id: string; name: string } | null>(null)
  let detailSheetItem = $state<Item | null>(null)
  let barcodeResumeFlow = $state<'scanner' | 'manual' | null>(null)
  let barcodeLookupState = $state<'closed' | 'loading' | 'found' | 'not_found' | 'error'>('closed')
  let barcodeLookupResult = $state<BarcodeSheetModel | null>(null)
  let barcodeLookupEan = $state<string | null>(null)

  const queryClient = useQueryClient()

  // Realtime: subscribe to list_items changes for this specific list.
  // The filter is server-side — only events for data.listId reach this client.
  const itemsChannel = data.supabase
    .channel(`list-items-${data.listId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'list_items',
        filter: `list_id=eq.${data.listId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: itemsQueryKey(data.listId) })
      }
    )
    .subscribe()

  onDestroy(() => {
    data.supabase.removeChannel(itemsChannel)
  })

  const itemsQuery = createItemsQuery(data.supabase, data.listId)
  const categoriesQuery = createCategoriesQuery(data.supabase, data.householdId)
  const storeLayoutQuery = createStoreLayoutQuery(data.supabase, () => selectedStoreId)
  const storesQuery = createStoresQuery(data.supabase, data.householdId)
  const addItemMutation = createAddItemMutation(data.supabase, data.listId)
  const deleteItemMutation = createDeleteItemMutation(data.supabase, data.listId)
  const checkOffMutation = createCheckOffMutation(data.supabase, data.listId, data.user.id)
  const assignCategoryMutation = createAssignCategoryMutation(data.supabase, data.listId)
  const updateItemMutation = createUpdateItemMutation(data.supabase, data.listId)
  const barcodeLookupMutation = createBarcodeLookupMutation(data.supabase, {
    listId: data.listId,
    getCategories: () => categoriesQuery.data ?? [],
  })

  const activeItems = $derived((itemsQuery.data?.filter((i) => !i.is_checked) ?? []) as Item[])
  const doneItems = $derived(itemsQuery.data?.filter((i) => i.is_checked) ?? [])
  const barcodeSubmitting = $derived(
    barcodeLookupState !== 'closed' && (addItemMutation.isPending || assignCategoryMutation.isPending)
  )
  const groupingPending = $derived(
    categoriesQuery.isPending || (selectedStoreId != null && storeLayoutQuery.isPending)
  )
  const groupedItems = $derived.by(() => {
    const unchecked = activeItems
    const orderedCategories = selectedStoreId
      ? (storeLayoutQuery.data ?? [])
      : (categoriesQuery.data ?? [])

    const groups: Array<{ categoryId: string | null; name: string; items: Item[] }> = []

    for (const category of orderedCategories) {
      const categoryItems = unchecked.filter((item) => item.category_id === category.id)

      if (categoryItems.length > 0) {
        groups.push({
          categoryId: category.id,
          name: category.name,
          items: categoryItems,
        })
      }
    }

    const uncategorized = unchecked.filter((item) => item.category_id == null)
    if (uncategorized.length > 0) {
      groups.push({ categoryId: null, name: 'Andre varer', items: uncategorized })
    }

    return groups
  })
  const selectedStoreName = $derived(
    storesQuery.data?.find((store) => store.id === selectedStoreId)?.name ?? null
  )

  $effect(() => {
    setActiveList({ id: data.listId, name: data.listName })
  })

  $effect(() => {
    if (!barcodeLookupResult?.canonicalCategory || barcodeLookupResult.categoryId != null) return
    if ((categoriesQuery.data?.length ?? 0) === 0) return

    barcodeLookupResult = {
      ...barcodeLookupResult,
      categoryId: resolveCanonicalCategoryId(
        categoriesQuery.data ?? [],
        barcodeLookupResult.canonicalCategory
      ),
    }
  })

  function handleAdd(name: string, quantity: number | null) {
    // Focus is called synchronously in ItemInput before this fires
    addItemMutation.mutate(
      { name, quantity },
      {
        onSuccess: (newItem) => {
          pendingCategoryItem = { id: newItem.id, name: newItem.name }
        },
      }
    )
  }

  function handleUncheck(itemId: string) {
    const item = doneItems.find((i) => i.id === itemId)
    if (item) {
      checkOffMutation.mutate({
        itemId,
        isChecked: false,
        itemName: item.name,
        historyContext: {
          listName: data.listName,
          storeId: selectedStoreId,
          storeName: selectedStoreName,
        },
      })
    }
  }

  function handleDelete(itemId: string) {
    deleteItemMutation.mutate({ id: itemId })
  }

  function handleGroupToggle(itemId: string, checked: boolean) {
    const item = activeItems.find((entry) => entry.id === itemId)
    if (item) {
      checkOffMutation.mutate({
        itemId,
        isChecked: checked,
        itemName: item.name,
        historyContext: {
          listName: data.listName,
          storeId: selectedStoreId,
          storeName: selectedStoreName,
        },
      })
    }
  }

  function handleCategorySelection(categoryId: string | null) {
    if (pendingCategoryItem && categoryId !== null) {
      assignCategoryMutation.mutate({ itemId: pendingCategoryItem.id, categoryId })
    }

    pendingCategoryItem = null
  }

  function handleDetailSave(id: string, name: string, quantity: number | null, categoryId: string | null) {
    const previousCategoryId = detailSheetItem?.category_id ?? null

    updateItemMutation.mutate({ id, name, quantity })

    if (categoryId !== previousCategoryId) {
      assignCategoryMutation.mutate({ itemId: id, categoryId })
    }

    detailSheetItem = null
  }

  function closeBarcodeLookupFlow() {
    barcodeLookupState = 'closed'
    barcodeLookupResult = null
    barcodeLookupEan = null
  }

  function handleBarcodeResumeHandled() {
    barcodeResumeFlow = null
  }

  function handleBarcodeEntry(ean: string) {
    barcodeLookupEan = ean
    barcodeLookupState = 'loading'
    barcodeLookupResult = null

    barcodeLookupMutation.mutate(
      { ean },
      {
        onSuccess: (result) => {
          barcodeLookupResult = result
          barcodeLookupState = result.state
        },
        onError: () => {
          barcodeLookupState = 'error'
        },
      }
    )
  }

  function reopenScannerFlow() {
    barcodeLookupState = 'closed'
    barcodeLookupResult = null
    barcodeResumeFlow = 'scanner'
  }

  function reopenManualBarcodeFlow() {
    barcodeLookupState = 'closed'
    barcodeLookupResult = null
    barcodeResumeFlow = 'manual'
  }

  function finalizeBarcodeAdd() {
    closeBarcodeLookupFlow()
  }

  function handleBarcodeConfirm(input: { name: string; quantity: number | null; categoryId: string | null }) {
    addItemMutation.mutate(
      {
        name: input.name,
        quantity: input.quantity,
      },
      {
        onSuccess: (newItem) => {
          if (input.categoryId) {
            assignCategoryMutation.mutate(
              { itemId: newItem.id, categoryId: input.categoryId },
              {
                onSuccess: finalizeBarcodeAdd,
              }
            )
            return
          }

          finalizeBarcodeAdd()
        },
      }
    )
  }
</script>

<svelte:head>
  <title>{data.listName} — HandleAppen</title>
</svelte:head>

<div class="max-w-lg mx-auto px-4 pb-32">
  <!-- Header -->
  <div class="flex items-center gap-3 py-4">
    <a href="/" class="text-sm font-medium text-green-700 hover:text-green-800">← Lister</a>
    <h1 class="text-lg font-semibold text-gray-900">{data.listName}</h1>
  </div>

  <!-- Error banner -->
  {#if
    addItemMutation.isError ||
    deleteItemMutation.isError ||
    checkOffMutation.isError ||
    assignCategoryMutation.isError ||
    updateItemMutation.isError
  }
    <div class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      Noe gikk galt. Endringen ble ikke lagret.
    </div>
  {/if}

  <!-- Active items -->
  {#if itemsQuery.isPending}
    <p class="py-8 text-center text-sm text-gray-500">Laster varer…</p>
  {:else if itemsQuery.isError}
    <p class="py-8 text-center text-sm text-red-500">Kunne ikke laste varer.</p>
  {:else if activeItems.length === 0 && doneItems.length === 0}
    <p class="py-8 text-center text-sm text-gray-400">
      Ingen varer. Legg til den første varen nedenfor.
    </p>
  {:else}
    <div class="mb-4">
      <StoreSelector
        stores={storesQuery.data ?? []}
        {selectedStoreId}
        onSelect={(id) => (selectedStoreId = id)}
      />
    </div>

    <div class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {#if groupingPending}
        <div class="px-4 py-8 text-center text-sm text-gray-500">Laster kategorier…</div>
      {:else}
        {#each groupedItems as group (group.categoryId ?? 'andre')}
          <CategorySection
            categoryName={group.name}
            items={group.items}
            onToggle={handleGroupToggle}
            onDelete={handleDelete}
            onLongPress={(item) => (detailSheetItem = item)}
          />
        {/each}
      {/if}

      {#if !groupingPending && groupedItems.length === 0 && activeItems.length === 0}
        <div class="px-4 py-8 text-center text-sm text-gray-400">Ingen aktive varer</div>
      {/if}
    </div>

    {#if activeItems.length === 0 && doneItems.length > 0}
      <p class="py-4 text-center text-sm text-gray-400">Alle varer er handlet!</p>
    {/if}
  {/if}

  <!-- Done section -->
  <DoneSection items={doneItems} onUncheck={handleUncheck} />
</div>

<!-- Persistent bottom input bar -->
<ItemInput
  onAdd={handleAdd}
  onDetected={handleBarcodeEntry}
  onManualSubmit={handleBarcodeEntry}
  resumeBarcodeFlow={barcodeResumeFlow}
  onResumeHandled={handleBarcodeResumeHandled}
/>

<BarcodeLookupSheet
  open={barcodeLookupState !== 'closed'}
  ean={barcodeLookupEan}
  viewState={barcodeLookupState === 'closed' ? 'loading' : barcodeLookupState}
  result={barcodeLookupResult}
  categories={categoriesQuery.data ?? []}
  submitting={barcodeSubmitting}
  onClose={closeBarcodeLookupFlow}
  onRetry={reopenScannerFlow}
  onOpenManualEntry={reopenManualBarcodeFlow}
  onConfirm={handleBarcodeConfirm}
/>

{#if pendingCategoryItem !== null}
  <CategoryPickerModal
    categories={categoriesQuery.data ?? []}
    open={true}
    onSelect={handleCategorySelection}
  />
{/if}

{#if detailSheetItem !== null}
  <ItemDetailSheet
    item={detailSheetItem}
    categories={categoriesQuery.data ?? []}
    onSave={handleDetailSave}
    onClose={() => (detailSheetItem = null)}
  />
{/if}
