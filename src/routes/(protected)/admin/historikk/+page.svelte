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
  <title>Historikk — HandleAppen</title>
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
    <a href="/admin" class="mb-2 inline-block text-sm text-green-600 hover:text-green-700">
      ← Admin
    </a>
    <h1 class="text-lg font-semibold text-gray-900">Historikk</h1>
    <p class="text-sm text-gray-500">Dato-gruppert og klar for rask skanning.</p>
  </div>

  {#if data.historyGroups.length === 0}
    <div class="rounded-xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
      Ingen historikk ennå.
    </div>
  {:else}
    <div class="space-y-6">
      {#each data.historyGroups as group}
        <section data-testid="history-date-group">
          <h2 class="mb-2 text-sm font-semibold text-gray-600">{group.dateLabel}</h2>

          <div class="space-y-2">
            {#each group.sessions as session}
              <details
                class="rounded-xl border border-gray-200 bg-white"
                data-testid="history-session"
              >
                <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                  <div class="min-w-0">
                    <div class="truncate text-sm font-medium text-gray-900">
                      {#if session.storeName}
                        {session.storeName}
                      {:else}
                        {session.listName}
                      {/if}
                    </div>
                    <div class="truncate text-xs text-gray-500">
                      {#if session.storeName}
                        {session.listName}
                      {/if}
                    </div>
                  </div>
                  <span class="text-xs text-gray-400">{session.items.length}</span>
                </summary>

                <ul class="border-t border-gray-100 px-4 py-2" data-testid="history-items">
                  {#each session.items as item}
                    <li>
                      <button
                        type="button"
                        class="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:bg-gray-50"
                        data-testid="history-add-back"
                        onclick={() => handleAddBack(item.itemName)}
                      >
                        <span class="truncate text-gray-900">{item.itemName}</span>
                        <span class="shrink-0 text-xs text-gray-500">{item.memberName}</span>
                      </button>
                    </li>
                  {/each}
                </ul>
              </details>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
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
