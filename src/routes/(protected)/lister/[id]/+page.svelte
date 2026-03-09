<script lang="ts">
  import {
    createItemsQuery,
    createAddItemMutation,
    createDeleteItemMutation,
    createCheckOffMutation,
  } from '$lib/queries/items'
  import ItemRow from '$lib/components/items/ItemRow.svelte'
  import ItemInput from '$lib/components/items/ItemInput.svelte'
  import DoneSection from '$lib/components/items/DoneSection.svelte'

  let { data } = $props()

  const itemsQuery = createItemsQuery(data.supabase, data.listId)
  const addItemMutation = createAddItemMutation(data.supabase, data.listId)
  const deleteItemMutation = createDeleteItemMutation(data.supabase, data.listId)
  const checkOffMutation = createCheckOffMutation(data.supabase, data.listId, data.user.id)

  const activeItems = $derived(itemsQuery.data?.filter((i) => !i.is_checked) ?? [])
  const doneItems = $derived(itemsQuery.data?.filter((i) => i.is_checked) ?? [])

  function handleAdd(name: string, quantity: number | null) {
    // Focus is called synchronously in ItemInput before this fires
    addItemMutation.mutate({ name, quantity })
  }

  function handleToggle(item: { id: string; name: string; is_checked: boolean }) {
    checkOffMutation.mutate({
      itemId: item.id,
      isChecked: !item.is_checked,
      itemName: item.name,
    })
  }

  function handleUncheck(itemId: string) {
    const item = doneItems.find((i) => i.id === itemId)
    if (item) checkOffMutation.mutate({ itemId, isChecked: false, itemName: item.name })
  }

  function handleDelete(itemId: string) {
    deleteItemMutation.mutate({ id: itemId })
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
  {#if addItemMutation.isError || deleteItemMutation.isError || checkOffMutation.isError}
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
    <div class="divide-y divide-gray-100 rounded-xl bg-white shadow-sm">
      {#each activeItems as item (item.id)}
        <ItemRow
          {item}
          onToggle={() => handleToggle(item)}
          onDelete={() => handleDelete(item.id)}
        />
      {/each}
    </div>

    {#if activeItems.length === 0 && doneItems.length > 0}
      <p class="py-4 text-center text-sm text-gray-400">Alle varer er handlet!</p>
    {/if}
  {/if}

  <!-- Done section -->
  <DoneSection items={doneItems} onUncheck={handleUncheck} />
</div>

<!-- Persistent bottom input bar -->
<ItemInput onAdd={handleAdd} />
