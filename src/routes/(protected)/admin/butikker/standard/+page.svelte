<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { dndzone, type DndEvent } from 'svelte-dnd-action'
  import DraggableCategoryRow from '$lib/components/stores/DraggableCategoryRow.svelte'
  import { categoriesQueryKey, createCategoriesQuery } from '$lib/queries/categories'
  import {
    createCategoryMutation,
    deleteCategoryMutation,
    reorderDefaultCategoriesMutation,
    updateCategoryMutation,
  } from '$lib/queries/stores'

  type OrderedCategory = { id: string; name: string; position: number }

  let { data } = $props()

  const queryClient = useQueryClient()
  const categoriesQuery = createCategoriesQuery(data.supabase, data.householdId)
  const createMutation = createCategoryMutation(data.supabase, data.householdId)
  const updateMutation = updateCategoryMutation(data.supabase, data.householdId)
  const deleteMutation = deleteCategoryMutation(data.supabase, data.householdId)
  const reorderMutation = reorderDefaultCategoriesMutation(data.supabase, data.householdId)

  let orderedCategories = $state<OrderedCategory[]>([])
  let isCreating = $state(false)
  let newCategoryName = $state('')

  $effect(() => {
    orderedCategories = (categoriesQuery.data ?? []) as OrderedCategory[]
  })

  onMount(() => {
    const categoriesChannel = data.supabase
      .channel(`categories-${data.householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => queryClient.invalidateQueries({ queryKey: categoriesQueryKey(data.householdId) })
      )
      .subscribe()

    return () => {
      data.supabase.removeChannel(categoriesChannel)
    }
  })

  onDestroy(() => {
    // handled by onMount teardown; explicit hook keeps lifecycle local to this page
  })

  function handleConsider(event: CustomEvent<DndEvent<OrderedCategory>>) {
    orderedCategories = event.detail.items as OrderedCategory[]
  }

  function handleFinalize(event: CustomEvent<DndEvent<OrderedCategory>>) {
    orderedCategories = event.detail.items as OrderedCategory[]
    reorderMutation.mutate({ categories: orderedCategories })
  }

  function handleCreate() {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return

    createMutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          newCategoryName = ''
          isCreating = false
        },
      }
    )
  }

  function handleRename(id: string, name: string) {
    updateMutation.mutate({ id, name })
  }

  function handleDelete(id: string) {
    deleteMutation.mutate({ id })
  }
</script>

<svelte:head>
  <title>Standard rekkefølge — HandleAppen</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-6 pb-24">
  <div class="mb-5 flex items-center gap-3">
    <a href="/admin/butikker" class="text-sm font-medium text-green-700 hover:text-green-800">← Butikker</a>
    <div>
      <h1 class="text-xl font-semibold text-gray-900">Standard rekkefølge</h1>
      <p class="text-sm text-gray-500">Dra, gi nytt navn eller slett kategorier.</p>
    </div>
  </div>

  {#if createMutation.isError || updateMutation.isError || deleteMutation.isError || reorderMutation.isError}
    <div class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      Noe gikk galt. Endringen ble ikke lagret.
    </div>
  {/if}

  {#if categoriesQuery.isPending}
    <p class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
      Laster kategorier…
    </p>
  {:else if categoriesQuery.isError}
    <p class="rounded-xl border border-dashed border-red-200 px-4 py-6 text-center text-sm text-red-600">
      Kunne ikke laste kategorier.
    </p>
  {:else}
    <div
      class="space-y-3"
      use:dndzone={{ items: orderedCategories, flipDurationMs: 200, dragStartThreshold: 1, delayTouchStart: true }}
      onconsider={handleConsider}
      onfinalize={handleFinalize}
    >
      {#each orderedCategories as category (category.id)}
        <DraggableCategoryRow {category} onRename={handleRename} onDelete={handleDelete} />
      {/each}
    </div>
  {/if}

  <div class="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
    {#if isCreating}
      <label class="block text-sm font-medium text-gray-700" for="new-category-name">Kategorinavn</label>
      <input
        id="new-category-name"
        bind:value={newCategoryName}
        class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none"
        placeholder="Legg til kategori"
        maxlength="80"
        onkeydown={(event) => {
          if (event.key === 'Enter') handleCreate()
          if (event.key === 'Escape') {
            isCreating = false
            newCategoryName = ''
          }
        }}
      />
      <div class="mt-3 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
          onclick={() => {
            isCreating = false
            newCategoryName = ''
          }}
        >
          Avbryt
        </button>
        <button
          type="button"
          class="rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
          onclick={handleCreate}
        >
          Lagre kategori
        </button>
      </div>
    {:else}
      <button
        type="button"
        class="flex w-full items-center justify-between text-left"
        onclick={() => {
          isCreating = true
        }}
      >
        <span class="text-sm font-medium text-gray-900">Legg til kategori</span>
        <span class="text-xl text-green-700" aria-hidden="true">+</span>
      </button>
    {/if}
  </div>
</div>
