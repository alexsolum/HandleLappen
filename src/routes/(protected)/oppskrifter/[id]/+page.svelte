<script lang="ts">
  import { goto } from '$app/navigation'
  import {
    createRecipeDetailQuery,
    createDeleteRecipeMutation,
    type RecipeIngredient,
  } from '$lib/queries/recipes'
  import { createListsQuery } from '$lib/queries/lists'
  import { createAddOrIncrementItemMutation } from '$lib/queries/items'
  import { searchRememberedItems } from '$lib/queries/remembered-items-core'
  import ListPickerSheet from '$lib/components/recipes/ListPickerSheet.svelte'

  let { data } = $props()
  const { supabase, recipeId, householdId } = data

  const recipeQuery = createRecipeDetailQuery(supabase, recipeId)
  const listsQuery = createListsQuery(supabase)
  const addOrIncrementMutation = createAddOrIncrementItemMutation(supabase)
  const deleteMutation = createDeleteRecipeMutation(supabase)

  // Ingredient selection state — all selected by default once loaded
  let selectedIngredients = $state<Set<string>>(new Set())
  let listPickerOpen = $state(false)
  let isAddingToList = $state(false)
  let toastMessage = $state<string | null>(null)
  let toastTimeout: ReturnType<typeof setTimeout> | null = null
  let showDeleteConfirm = $state(false)
  let isDeleting = $state(false)

  // When recipe loads, pre-select all ingredients
  $effect(() => {
    const ingredients = recipeQuery.data?.recipe_ingredients
    if (ingredients && selectedIngredients.size === 0) {
      selectedIngredients = new Set(ingredients.map((i: RecipeIngredient) => i.id))
    }
  })

  function toggleIngredient(id: string) {
    const next = new Set(selectedIngredients)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedIngredients = next
  }

  function selectAll() {
    const ingredients = recipeQuery.data?.recipe_ingredients ?? []
    selectedIngredients = new Set(ingredients.map((i: RecipeIngredient) => i.id))
  }

  function selectNone() {
    selectedIngredients = new Set()
  }

  function showToast(message: string) {
    if (toastTimeout) clearTimeout(toastTimeout)
    toastMessage = message
    toastTimeout = setTimeout(() => {
      toastMessage = null
      toastTimeout = null
    }, 3000)
  }

  async function handleAddToList(listId: string, listName: string) {
    listPickerOpen = false
    isAddingToList = true

    const ingredients = recipeQuery.data?.recipe_ingredients ?? []
    const selected = ingredients.filter((i: RecipeIngredient) => selectedIngredients.has(i.id))

    if (selected.length === 0) {
      isAddingToList = false
      return
    }

    try {
      for (const ingredient of selected) {
        const remembered = await searchRememberedItems(supabase, ingredient.name, householdId)
        const categoryId = remembered.length > 0 ? remembered[0].lastCategoryId : null
        await addOrIncrementMutation.mutateAsync({ listId, name: ingredient.name, categoryId })
      }
      showToast(`La til ${selected.length} ingrediens${selected.length === 1 ? '' : 'er'} i ${listName}`)
    } catch (err) {
      console.error('Failed to add ingredients to list:', err)
      showToast('Kunne ikke legge til ingredienser. Prøv igjen.')
    } finally {
      isAddingToList = false
    }
  }

  async function handleDelete() {
    if (isDeleting) return
    isDeleting = true
    try {
      await deleteMutation.mutateAsync({ id: recipeId })
      goto('/oppskrifter')
    } catch (err) {
      console.error('Failed to delete recipe:', err)
      isDeleting = false
      showDeleteConfirm = false
    }
  }

  const selectedCount = $derived(selectedIngredients.size)
  const totalIngredients = $derived(recipeQuery.data?.recipe_ingredients?.length ?? 0)

  const lists = $derived(
    (listsQuery.data ?? []).map((l: any) => ({ id: l.id, name: l.name }))
  )
</script>

{#if recipeQuery.isLoading}
  <div class="mx-auto max-w-2xl px-4 py-8">
    <div class="animate-pulse space-y-6">
      <div class="aspect-video w-full rounded-2xl bg-gray-200"></div>
      <div class="h-8 w-2/3 rounded bg-gray-200"></div>
      <div class="h-4 w-full rounded bg-gray-200"></div>
      <div class="h-4 w-5/6 rounded bg-gray-200"></div>
    </div>
  </div>
{:else if recipeQuery.error}
  <div class="mx-auto max-w-2xl px-4 py-8">
    <div class="rounded-2xl bg-red-50 p-8 text-center text-red-700">
      Kunne ikke laste oppskriften. Prøv igjen senere.
    </div>
  </div>
{:else if recipeQuery.data}
  {@const recipe = recipeQuery.data}
  {@const ingredients = recipe.recipe_ingredients ?? []}

  <div class="mx-auto max-w-2xl pb-32">
    <!-- Hero image -->
    {#if recipe.image_url}
      <div class="relative aspect-video w-full overflow-hidden bg-gray-100">
        <img
          src={recipe.image_url}
          alt={recipe.name}
          class="h-full w-full object-cover"
          data-testid="recipe-image"
        />
      </div>
    {:else}
      <div class="flex aspect-video w-full items-center justify-center bg-gray-100 text-gray-300">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    {/if}

    <div class="px-4 pt-6">
      <!-- Title row with actions -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <div class="mb-2">
            <a
              href="/oppskrifter"
              class="text-sm font-medium text-green-600 hover:text-green-700"
            >
              &larr; Tilbake
            </a>
          </div>
          <h1 class="text-2xl font-bold text-gray-900" data-testid="recipe-name">{recipe.name}</h1>
        </div>

        <!-- Overflow menu -->
        <div class="flex items-center gap-2 pt-6">
          <a
            href="/oppskrifter/{recipeId}/rediger"
            class="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            data-testid="edit-recipe-button"
          >
            Rediger
          </a>
          <button
            type="button"
            onclick={() => (showDeleteConfirm = true)}
            class="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            data-testid="delete-recipe-button"
          >
            Slett
          </button>
        </div>
      </div>

      {#if recipe.description}
        <p class="mt-3 text-gray-600" data-testid="recipe-description">{recipe.description}</p>
      {/if}

      <!-- Ingredients section -->
      <div class="mt-8">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">
            Ingredienser
            {#if ingredients.length > 0}
              <span class="ml-1 text-sm font-normal text-gray-400">
                ({selectedCount}/{ingredients.length} valgt)
              </span>
            {/if}
          </h2>
          {#if ingredients.length > 1}
            <div class="flex gap-2">
              <button
                type="button"
                onclick={selectAll}
                class="text-xs font-medium text-green-600 hover:text-green-700"
              >
                Velg alle
              </button>
              <span class="text-gray-300">|</span>
              <button
                type="button"
                onclick={selectNone}
                class="text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Velg ingen
              </button>
            </div>
          {/if}
        </div>

        {#if ingredients.length === 0}
          <div class="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            Ingen ingredienser registrert.
          </div>
        {:else}
          <div class="divide-y divide-gray-100 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" data-testid="ingredients-list">
            {#each ingredients as ingredient (ingredient.id)}
              <label
                class="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-gray-50"
                data-testid="ingredient-row"
              >
                <input
                  type="checkbox"
                  checked={selectedIngredients.has(ingredient.id)}
                  onchange={() => toggleIngredient(ingredient.id)}
                  class="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  data-testid="ingredient-checkbox"
                />
                <span class="text-sm font-medium text-gray-900">{ingredient.name}</span>
              </label>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Sticky Add to List bar -->
  {#if ingredients.length > 0}
    <div class="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 flex justify-center px-4">
      <div class="w-full max-w-2xl">
        <button
          type="button"
          onclick={() => (listPickerOpen = true)}
          disabled={selectedCount === 0 || isAddingToList}
          class="w-full rounded-2xl bg-green-600 px-6 py-4 text-base font-bold text-white shadow-xl transition-all hover:bg-green-700 active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none"
          data-testid="add-to-list-button"
        >
          {#if isAddingToList}
            Legger til...
          {:else if selectedCount === 0}
            Ingen ingredienser valgt
          {:else}
            Legg til {selectedCount} ingrediens{selectedCount === 1 ? '' : 'er'} i liste
          {/if}
        </button>
      </div>
    </div>
  {/if}

  <!-- List picker bottom sheet -->
  <ListPickerSheet
    {lists}
    open={listPickerOpen}
    onClose={() => (listPickerOpen = false)}
    onSelect={handleAddToList}
  />

  <!-- Delete confirmation dialog -->
  {#if showDeleteConfirm}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      data-testid="delete-confirm-dialog"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 class="text-lg font-semibold text-gray-900">Slett oppskrift?</h3>
        <p class="mt-2 text-sm text-gray-600">
          Dette vil slette &laquo;{recipe.name}&raquo; permanent. Handlingen kan ikke angres.
        </p>
        <div class="mt-6 flex gap-3">
          <button
            type="button"
            onclick={() => (showDeleteConfirm = false)}
            disabled={isDeleting}
            class="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            type="button"
            onclick={handleDelete}
            disabled={isDeleting}
            class="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
            data-testid="confirm-delete-button"
          >
            {isDeleting ? 'Sletter...' : 'Slett'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Toast notification -->
  {#if toastMessage}
    <div
      class="fixed bottom-[calc(10rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-800 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
      role="status"
      aria-live="polite"
      data-testid="toast-message"
    >
      {toastMessage}
    </div>
  {/if}
{/if}
