<script lang="ts">
  import {
    createItemsQuery,
    createAddItemMutation,
    createDeleteItemMutation,
    createChangeQuantityMutation,
    createCheckOffMutation,
    createAssignCategoryMutation,
    createUpdateItemMutation,
    itemsQueryKey,
  } from '$lib/queries/items'
  import {
    createRememberedItemsQuery,
    type RememberedItem,
  } from '$lib/queries/remembered-items'
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
  import LocationPermissionCard from '$lib/components/stores/LocationPermissionCard.svelte'
  import ShoppingModeBanner from '$lib/components/stores/ShoppingModeBanner.svelte'
  import StoreSelector from '$lib/components/stores/StoreSelector.svelte'
  import {
    beginLocationExplanation,
    cancelLocationExplanation,
    confirmAutomaticStore,
    dismissShoppingMode,
    locationSession,
    refreshLocationStores,
    retryLocationDetection,
    stopLocationSession,
  } from '$lib/location/session.svelte'
  import type { DetectableStore } from '$lib/location/proximity'
  import { setActiveList } from '$lib/stores/active-list.svelte'
  import { storeDisplayName } from '$lib/utils/stores'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { onDestroy } from 'svelte'

  type Item = {
    id: string
    name: string
    quantity: number | null
    is_checked: boolean
    category_id: string | null
    brand?: string | null
    product_image_url?: string | null
  }

  let { data } = $props()
  let selectedStoreId = $state<string | null>(null)
  let pendingCategoryItem = $state<{ id: string; name: string } | null>(null)
  let detailSheetItem = $state<Item | null>(null)
  let barcodeResumeFlow = $state<'scanner' | 'manual' | null>(null)
  let barcodeLookupState = $state<'closed' | 'loading' | 'found' | 'not_found' | 'error'>('closed')
  let barcodeLookupResult = $state<BarcodeSheetModel | null>(null)
  let barcodeLookupEan = $state<string | null>(null)
  let rememberedQueryText = $state('')
  let isManuallySelected = $state(false)

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
    stopLocationSession()
  })

  const itemsQuery = createItemsQuery(data.supabase, data.listId)
  const categoriesQuery = createCategoriesQuery(data.supabase, data.householdId)
  const storeLayoutQuery = createStoreLayoutQuery(data.supabase, () => selectedStoreId)
  const storesQuery = createStoresQuery(data.supabase, data.householdId)
  const rememberedItemsQuery = createRememberedItemsQuery(
    data.supabase,
    data.listId,
    () => rememberedQueryText,
    data.householdId
  )
  const addItemMutation = createAddItemMutation(data.supabase, data.listId)
  const deleteItemMutation = createDeleteItemMutation(data.supabase, data.listId)
  const changeQuantityMutation = createChangeQuantityMutation(data.supabase, data.listId)
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
  const rememberedSuggestions = $derived(rememberedItemsQuery.data ?? [])
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
  const selectedStoreName = $derived.by(() => {
    const found = storesQuery.data?.find((store) => store.id === selectedStoreId)
    return found ? storeDisplayName(found.chain, found.location_name) : null
  })
  const detectableStores = $derived((storesQuery.data ?? []) as DetectableStore[])
  const detectedStoreName = $derived.by(() => {
    const found = storesQuery.data?.find((store) => store.id === locationSession.detectedStoreId)
    return found ? storeDisplayName(found.chain, found.location_name) : null
  })
  const activeShoppingStore = $derived.by(() => {
    if (!locationSession.shoppingModeActive || !locationSession.detectedStoreId) return null
    return storesQuery.data?.find((store) => store.id === locationSession.detectedStoreId) ?? null
  })

  $effect(() => {
    setActiveList({ id: data.listId, name: data.listName })
  })

  $effect(() => {
    refreshLocationStores(detectableStores)
  })

  $effect(() => {
    if (locationSession.shoppingModeActive && locationSession.detectedStoreId) {
      selectedStoreId = locationSession.detectedStoreId
      isManuallySelected = false
    } else if (!locationSession.shoppingModeActive && !isManuallySelected) {
      if (
        locationSession.shoppingModeSuppressedStoreId !== null &&
        locationSession.detectedStoreId === locationSession.shoppingModeSuppressedStoreId
      ) {
        selectedStoreId = null
      } else {
        selectedStoreId = locationSession.detectedStoreId
      }
    }
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
    rememberedQueryText = ''

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

  function handleRememberedQueryChange(value: string) {
    rememberedQueryText = value
  }

  function handleRememberedSuggestionSelect(suggestion: RememberedItem) {
    rememberedQueryText = ''
    const rememberedCategoryStillValid =
      suggestion.lastCategoryId != null &&
      ((categoriesQuery.data?.length ?? 0) === 0 ||
        (categoriesQuery.data ?? []).some((category) => category.id === suggestion.lastCategoryId))
    const categoryId = rememberedCategoryStillValid ? suggestion.lastCategoryId : null

    addItemMutation.mutate(
      {
        name: suggestion.itemName,
        quantity: 1,
        categoryId,
      },
      {
        onSuccess: (newItem) => {
          if (categoryId == null) {
            pendingCategoryItem = { id: newItem.id, name: newItem.name }
          }
        },
      }
    )
  }

  function handleManualStoreSelect(id: string | null) {
    selectedStoreId = id
    isManuallySelected = id !== null
  }

  function handleUncheck(itemId: string) {
    const item = doneItems.find((i) => i.id === itemId)
    if (item) {
      const shouldAttributeStore = locationSession.shoppingModeActive || isManuallySelected
      checkOffMutation.mutate({
        itemId,
        isChecked: false,
        itemName: item.name,
        historyContext: {
          listName: data.listName,
          storeId: shouldAttributeStore ? selectedStoreId : null,
          storeName: shouldAttributeStore ? selectedStoreName : null,
        },
      })
    }
  }

  function handleDelete(itemId: string) {
    deleteItemMutation.mutate({ id: itemId })
  }

  function handleIncrement(item: Item) {
    changeQuantityMutation.mutate({
      id: item.id,
      currentQuantity: item.quantity,
      delta: 1,
    })
  }

  function handleDecrement(item: Item) {
    changeQuantityMutation.mutate({
      id: item.id,
      currentQuantity: item.quantity,
      delta: -1,
    })
  }

  function handleGroupToggle(itemId: string, checked: boolean) {
    const item = activeItems.find((entry) => entry.id === itemId)
    if (item) {
      const shouldAttributeStore = locationSession.shoppingModeActive || isManuallySelected
      checkOffMutation.mutate({
        itemId,
        isChecked: checked,
        itemName: item.name,
        historyContext: {
          listName: data.listName,
          storeId: shouldAttributeStore ? selectedStoreId : null,
          storeName: shouldAttributeStore ? selectedStoreName : null,
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

  function handleDetailSave(id: string, name: string, quantity: number | null, categoryId: string | null, brand: string | null) {
    const previousCategoryId = detailSheetItem?.category_id ?? null

    updateItemMutation.mutate({ id, name, quantity, brand })

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

  function handleBarcodeConfirm(input: { name: string; quantity: number | null; categoryId: string | null; brand: string | null; imageUrl: string | null }) {
    addItemMutation.mutate(
      {
        name: input.name,
        quantity: input.quantity,
        brand: input.brand ?? undefined,
        imageUrl: input.imageUrl ?? undefined,
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
    changeQuantityMutation.isError ||
    checkOffMutation.isError ||
    assignCategoryMutation.isError ||
    updateItemMutation.isError ||
    rememberedItemsQuery.isError
  }
    <div class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      Noe gikk galt. Endringen ble ikke lagret.
    </div>
  {/if}

  <div class="mb-4 space-y-3">
    {#if locationSession.shoppingModeActive && activeShoppingStore}
      <ShoppingModeBanner
        storeName={storeDisplayName(activeShoppingStore.chain, activeShoppingStore.location_name)}
        chain={activeShoppingStore.chain}
        onDismiss={dismissShoppingMode}
      />
    {:else}
      <LocationPermissionCard
        state={locationSession.status}
        {detectedStoreName}
        showSettingsHint={locationSession.showSettingsHint}
        onStart={beginLocationExplanation}
        onConfirm={() => void confirmAutomaticStore(detectableStores)}
        onCancel={cancelLocationExplanation}
        onRetry={() => void retryLocationDetection(detectableStores)}
      />
      <StoreSelector
        stores={storesQuery.data ?? []}
        {selectedStoreId}
        onSelect={handleManualStoreSelect}
      />
    {/if}
  </div>

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
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
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
  onQueryChange={handleRememberedQueryChange}
  onSuggestionSelect={handleRememberedSuggestionSelect}
  onDetected={handleBarcodeEntry}
  onManualSubmit={handleBarcodeEntry}
  resumeBarcodeFlow={barcodeResumeFlow}
  suggestions={rememberedSuggestions}
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
