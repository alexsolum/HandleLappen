<script lang="ts">
  import { createRecipesQuery } from '$lib/queries/recipes'

  let { data } = $props()
  const { supabase } = data

  const recipesQuery = createRecipesQuery(supabase)

  let searchQuery = $state('')

  const filteredRecipes = $derived(
    recipesQuery.data?.filter((recipe) =>
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? []
  )
</script>

<div class="mx-auto max-w-5xl px-4 py-8">
  <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <h1 class="text-3xl font-bold text-gray-900">Oppskrifter</h1>
    <a
      href="/oppskrifter/ny"
      class="inline-flex items-center justify-center rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-green-700 active:scale-95 sm:w-auto"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
      </svg>
      Ny oppskrift
    </a>
  </div>

  <div class="mb-8">
    <div class="relative">
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
      </div>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Søk i oppskrifter..."
        class="block w-full rounded-2xl border-none bg-white py-4 pl-12 pr-4 text-sm shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-green-500"
      />
    </div>
  </div>

  {#if recipesQuery.isLoading}
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each Array(6) as _}
        <div class="animate-pulse space-y-4">
          <div class="aspect-video rounded-2xl bg-gray-200"></div>
          <div class="h-4 w-2/3 rounded bg-gray-200"></div>
          <div class="h-3 w-1/2 rounded bg-gray-200"></div>
        </div>
      {/each}
    </div>
  {:else if recipesQuery.error}
    <div class="rounded-2xl bg-red-50 p-8 text-center text-red-700">
      Kunne ikke laste oppskrifter. Prøv igjen senere.
    </div>
  {:else if filteredRecipes.length === 0}
    <div class="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <h3 class="mt-4 text-sm font-semibold text-gray-900">
        {searchQuery ? 'Ingen treff på søket' : 'Ingen oppskrifter ennå'}
      </h3>
      <p class="mt-2 text-sm text-gray-500">
        {searchQuery ? 'Prøv et annet søkeord.' : 'Lagre dine favorittoppskrifter for enkel tilgang.'}
      </p>
      {#if !searchQuery}
        <div class="mt-6">
          <a
            href="/oppskrifter/ny"
            class="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Legg til din første
          </a>
        </div>
      {/if}
    </div>
  {:else}
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each filteredRecipes as recipe (recipe.id)}
        <a
          href="/oppskrifter/{recipe.id}"
          class="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-green-500/30"
        >
          <div class="relative aspect-video overflow-hidden bg-gray-100">
            {#if recipe.image_url}
              <img
                src={recipe.image_url}
                alt={recipe.name}
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            {:else}
              <div class="flex h-full w-full items-center justify-center text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            {/if}
          </div>
          <div class="p-4">
            <h3 class="font-bold text-gray-900 group-hover:text-green-700">{recipe.name}</h3>
            {#if recipe.description}
              <p class="mt-1 line-clamp-2 text-sm text-gray-500">{recipe.description}</p>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

