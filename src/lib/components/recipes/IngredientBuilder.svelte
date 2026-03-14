<script lang="ts">
  import type { SupabaseClient } from '@supabase/supabase-js'
  import { searchRememberedItems, type RememberedItem } from '$lib/queries/remembered-items-core'
  import { offlineStore } from '$lib/stores/offline.svelte'

  interface Props {
    supabase: SupabaseClient
    ingredients: string[]
    onUpdate: (ingredients: string[]) => void
  }

  let { supabase, ingredients = $bindable([]), onUpdate }: Props = $props()

  let query = $state('')
  let suggestions = $state<RememberedItem[]>([])
  let isSearching = $state(false)
  let inputElement: HTMLInputElement

  const isOnline = $derived(offlineStore.isOnline)

  async function handleInput(e: Event) {
    const value = (e.currentTarget as HTMLInputElement).value
    query = value

    if (value.trim().length > 0 && isOnline) {
      isSearching = true
      try {
        suggestions = await searchRememberedItems(supabase as any, value)
      } catch (err) {
        console.error('Failed to fetch suggestions:', err)
        suggestions = []
      } finally {
        isSearching = false
      }
    } else {
      suggestions = []
    }
  }

  function addIngredient(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    
    // Simple normalization (lowercase) to avoid obvious duplicates in the same recipe
    const normalized = trimmed.toLowerCase()
    if (ingredients.some(i => i.toLowerCase() === normalized)) {
      query = ''
      suggestions = []
      return
    }

    ingredients = [...ingredients, trimmed]
    onUpdate(ingredients)
    query = ''
    suggestions = []
    inputElement?.focus()
  }

  function removeIngredient(index: number) {
    ingredients = ingredients.filter((_, i) => i !== index)
    onUpdate(ingredients)
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addIngredient(query)
    }
  }
</script>

<div class="space-y-4">
  <div class="relative">
    <div class="flex gap-2">
      <input
        bind:this={inputElement}
        type="text"
        value={query}
        oninput={handleInput}
        onkeydown={handleKeydown}
        placeholder="Søk eller skriv inn ingrediens..."
        class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
      />
      <button
        type="button"
        onclick={() => addIngredient(query)}
        disabled={!query.trim()}
        class="rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        Legg til
      </button>
    </div>

    {#if suggestions.length > 0}
      <div class="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        {#each suggestions as suggestion}
          <button
            type="button"
            onclick={() => addIngredient(suggestion.itemName)}
            class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-green-50"
          >
            <span class="text-sm font-medium text-gray-900">{suggestion.itemName}</span>
            <span class="text-xs text-gray-500">Brukt {suggestion.useCount} ganger</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if ingredients.length > 0}
    <div class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
      {#each ingredients as ingredient, i}
        <div class="flex items-center justify-between px-4 py-3">
          <span class="text-sm text-gray-900">{ingredient}</span>
          <button
            type="button"
            onclick={() => removeIngredient(i)}
            class="text-red-500 hover:text-red-700"
            aria-label="Fjern ingrediens"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <p class="text-center text-sm text-gray-500 py-4 italic">Ingen ingredienser lagt til ennå.</p>
  {/if}
</div>
