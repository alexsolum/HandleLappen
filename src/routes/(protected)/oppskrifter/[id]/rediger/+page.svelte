<script lang="ts">
  import { goto } from '$app/navigation'
  import {
    createRecipeDetailQuery,
    createUpdateRecipeMutation,
    type RecipeIngredient,
  } from '$lib/queries/recipes'
  import { uploadRecipeImage } from '$lib/storage/upload'
  import IngredientBuilder from '$lib/components/recipes/IngredientBuilder.svelte'

  let { data } = $props()
  const { supabase, recipeId, householdId } = data

  const recipeQuery = createRecipeDetailQuery(supabase, recipeId)
  const updateMutation = createUpdateRecipeMutation(supabase)

  // Form state — initialised from loaded recipe
  let name = $state('')
  let description = $state('')
  let ingredients = $state<string[]>([])
  let imageFile = $state<File | null>(null)
  let imagePreview = $state<string | null>(null)
  let removeCurrentImage = $state(false)
  let isSubmitting = $state(false)
  let error = $state<string | null>(null)
  let initialised = $state(false)

  // When recipe loads, populate form fields (runs once)
  $effect(() => {
    const recipe = recipeQuery.data
    if (recipe && !initialised) {
      name = recipe.name
      description = recipe.description ?? ''
      const sorted = [...(recipe.recipe_ingredients ?? [])].sort(
        (a: RecipeIngredient, b: RecipeIngredient) => a.position - b.position
      )
      ingredients = sorted.map((i: RecipeIngredient) => i.name)
      imagePreview = recipe.image_url
      initialised = true
    }
  })

  function handleImageChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    if (input.files && input.files[0]) {
      imageFile = input.files[0]
      imagePreview = URL.createObjectURL(input.files[0])
      removeCurrentImage = false
    }
  }

  function handleRemoveImage() {
    imageFile = null
    imagePreview = null
    removeCurrentImage = true
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (isSubmitting) return
    isSubmitting = true
    error = null

    try {
      // Determine new image_url value
      let newImageUrl: string | null | undefined = undefined // undefined = keep existing

      if (imageFile) {
        // New file chosen — upload it
        const { data: householdData, error: hError } = await supabase.rpc('my_household_id')
        if (hError) throw hError
        newImageUrl = await uploadRecipeImage(supabase, householdData, imageFile)
      } else if (removeCurrentImage) {
        // User explicitly removed the image
        newImageUrl = null
      }

      await updateMutation.mutateAsync({
        id: recipeId,
        name,
        description,
        image_url: newImageUrl,
        ingredients,
      })

      goto(`/oppskrifter/${recipeId}`)
    } catch (err: any) {
      console.error('Failed to update recipe:', err)
      error = err.message || 'Kunne ikke lagre endringene. Prøv igjen.'
    } finally {
      isSubmitting = false
    }
  }
</script>

{#if recipeQuery.isLoading}
  <div class="mx-auto max-w-2xl px-4 py-8">
    <div class="animate-pulse space-y-6">
      <div class="h-8 w-1/2 rounded bg-gray-200"></div>
      <div class="aspect-video w-full rounded-2xl bg-gray-200"></div>
      <div class="h-4 w-full rounded bg-gray-200"></div>
    </div>
  </div>
{:else if recipeQuery.error}
  <div class="mx-auto max-w-2xl px-4 py-8">
    <div class="rounded-2xl bg-red-50 p-8 text-center text-red-700">
      Kunne ikke laste oppskriften. Prøv igjen senere.
    </div>
  </div>
{:else if recipeQuery.data}
  <div class="mx-auto max-w-2xl px-4 py-8">
    <div class="mb-8 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900" data-testid="edit-recipe-heading">Rediger oppskrift</h1>
      <a
        href="/oppskrifter/{recipeId}"
        class="text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        Avbryt
      </a>
    </div>

    <form onsubmit={handleSubmit} class="space-y-8">
      {#if error}
        <div class="rounded-xl bg-red-50 p-4 text-sm text-red-700" data-testid="edit-error">
          {error}
        </div>
      {/if}

      <div class="space-y-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <!-- Name -->
        <div class="space-y-2">
          <label for="name" class="block text-sm font-semibold text-gray-700">
            Navn på oppskrift
          </label>
          <input
            id="name"
            type="text"
            bind:value={name}
            required
            placeholder="f.eks. Spaghetti Carbonara"
            class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            data-testid="recipe-name-input"
          />
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <label for="description" class="block text-sm font-semibold text-gray-700">
            Beskrivelse (valgfritt)
          </label>
          <textarea
            id="description"
            bind:value={description}
            rows="3"
            placeholder="Hvordan lager man denne?"
            class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          ></textarea>
        </div>

        <!-- Image -->
        <div class="space-y-2">
          <span class="block text-sm font-semibold text-gray-700">Bilde</span>
          <div class="flex flex-col gap-4">
            {#if imagePreview}
              <div class="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
                <img
                  src={imagePreview}
                  alt="Forhåndsvisning"
                  class="h-full w-full object-cover"
                  data-testid="image-preview"
                />
                <button
                  type="button"
                  onclick={handleRemoveImage}
                  class="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                  data-testid="remove-image-button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            {/if}
            <label
              class="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 hover:border-green-500 hover:bg-green-50"
            >
              <div class="space-y-1 text-center">
                <svg
                  class="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <div class="flex text-sm text-gray-600">
                  <span class="relative rounded-md font-medium text-green-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-offset-2 hover:text-green-500">
                    {imagePreview ? 'Endre bilde' : 'Last opp et bilde'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    class="sr-only"
                    onchange={handleImageChange}
                    data-testid="image-input"
                  />
                </div>
                <p class="text-xs text-gray-500">WebP, PNG, JPG opp til 10MB</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Ingredients -->
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">Ingredienser</h2>
        <IngredientBuilder
          {supabase}
          {householdId}
          bind:ingredients
          onUpdate={(newIngredients) => (ingredients = newIngredients)}
        />
      </div>

      <div class="pt-4">
        <button
          type="submit"
          disabled={isSubmitting || !name}
          class="w-full rounded-xl bg-green-600 py-4 text-base font-bold text-white shadow-lg hover:bg-green-700 disabled:bg-gray-300 disabled:shadow-none transition-all active:scale-[0.98]"
          data-testid="save-recipe-button"
        >
          {isSubmitting ? 'Lagrer...' : 'Lagre endringer'}
        </button>
      </div>
    </form>
  </div>
{/if}
