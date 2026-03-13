<script lang="ts">
  import { createAddOrIncrementItemMutation } from '$lib/queries/items'
  import { createListsQuery } from '$lib/queries/lists'
  import ListTargetSheet from '$lib/components/recommendations/ListTargetSheet.svelte'

  let { data } = $props()
  let targetSheetOpen = $state(false)
  let pendingItemName = $state<string | null>(null)
  let addBackToast = $state<string | null>(null)
  let addBackToastTimeout = $state<ReturnType<typeof setTimeout> | null>(null)

  const listsQuery = createListsQuery(data.supabase)
  const addBackMutation = createAddOrIncrementItemMutation(data.supabase)

  function showAddBackToast(message: string) {
    addBackToast = message

    if (addBackToastTimeout) {
      clearTimeout(addBackToastTimeout)
    }

    addBackToastTimeout = setTimeout(() => {
      addBackToast = null
      addBackToastTimeout = null
    }, 2000)
  }

  function finishAddBack(itemName: string, action: 'added' | 'incremented') {
    pendingItemName = null
    targetSheetOpen = false
    showAddBackToast(action === 'incremented' ? `${itemName} oppdatert` : `${itemName} lagt til`)
  }

  function addBackToList(listId: string, itemName: string) {
    addBackMutation.mutate(
      { listId, name: itemName, amount: 1 },
      {
        onSuccess: (result) => finishAddBack(itemName, result.action),
      }
    )
  }

  function handleAddBack(itemName: string) {
    const lists = listsQuery.data ?? []

    if (data.recommendations.activeListId) {
      addBackToList(data.recommendations.activeListId, itemName)
      return
    }

    if (lists.length === 1) {
      addBackToList(lists[0].id, itemName)
      return
    }

    pendingItemName = itemName
    targetSheetOpen = true
  }

  function handleTargetSelect(listId: string) {
    if (!pendingItemName) return
    addBackToList(listId, pendingItemName)
  }
</script>

<svelte:head>
  <title>Anbefalinger — HandleAppen</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-6">
  {#if addBackToast}
    <div
      class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-800 px-4 py-2 text-sm text-white shadow-lg"
      role="status"
      aria-live="polite"
      data-testid="add-back-toast"
    >
      {addBackToast}
    </div>
  {/if}

  <div class="mb-6">
    <h1 class="text-lg font-semibold text-gray-900">Anbefalinger</h1>
    <p class="text-sm text-gray-500">Praktiske forslag basert på handlehistorikken deres.</p>
  </div>

  <section class="mb-6 space-y-3">
    <div>
      <h2 class="text-sm font-semibold text-gray-900">Forslag</h2>
      <p class="text-xs text-gray-500">Én kompakt liste med varer som ofte kjøpes igjen.</p>
    </div>

    {#if data.recommendations.isColdStart}
      <div class="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
        <p class="font-medium">Anbefalinger vises etter 10 handleøkter.</p>
        <p class="mt-1 text-sm text-green-700">
          Dere har {data.recommendations.sessionCount} av 10 økter så langt.
        </p>
      </div>
    {:else if data.recommendations.needsListPrompt}
      <div class="rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm text-gray-600">
        Åpne en liste for å se forslag som passer det dere handler nå.
      </div>
    {:else if data.recommendations.items.length === 0}
      <div class="rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm text-gray-500">
        Ingen forslag klare ennå for {data.recommendations.activeListName}.
      </div>
    {:else}
      <div class="rounded-xl border border-gray-200 bg-white" data-testid="recommendation-list">
        <ul class="divide-y divide-gray-100">
          {#each data.recommendations.items as item}
            <li data-testid="recommendation-row">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50"
                onclick={() => handleAddBack(item.itemName)}
              >
                <div class="min-w-0">
                  <div class="truncate font-medium text-gray-900">{item.itemName}</div>
                  <div class="truncate text-xs text-gray-500">{item.reason}</div>
                </div>
                <span class="shrink-0 text-xs text-gray-400">{item.purchaseCount}</span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>
</div>

<ListTargetSheet
  lists={(listsQuery.data ?? []).map((list) => ({ id: list.id, name: list.name }))}
  open={targetSheetOpen}
  onClose={() => {
    targetSheetOpen = false
    pendingItemName = null
  }}
  onSelect={handleTargetSelect}
/>
