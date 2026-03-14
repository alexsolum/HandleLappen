<script lang="ts">
  import { goto } from '$app/navigation'
  import { createRecipeMutation } from '$lib/queries/recipes'
  import { uploadRecipeImage } from '$lib/storage/upload'
  import IngredientBuilder from '$lib/components/recipes/IngredientBuilder.svelte'

  let { data } = $props()
  const { supabase } = data

  let name = $state('')
  let description = $state('')
  let ingredients = $state<string[]>([])
  let imageFile = $state<File | null>(null)
  let imagePreview = $state<string | null>(null)
  let isSubmitting = $state(false)
  let error = $state<string | null>(null)

  const mutation = createRecipeMutation(supabase)

  function handleImageChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    if (input.files && input.files[0]) {
      const file = input.files[0]
      imageFile = file
      imagePreview = URL.createObjectURL(file)
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (isSubmitting) return
    isSubmitting = true
    error = null

    try {
      let imageUrl: string | undefined = undefined

      if (imageFile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Ikke logget inn')

        // We need household_id for the upload path. 
        // We can get it from the RPC or from the user session if it was there.
        // Let's use the RPC to be sure.
        const { data: householdId, error: hError } = await supabase.rpc('my_household_id')
        if (hError) throw hError

        imageUrl = await uploadRecipeImage(supabase, householdId, imageFile)
      }

      await mutation.mutateAsync({
        name,
        description,
        image_url: imageUrl,
        ingredients
      })

      goto('/oppskrifter')
    } catch (err: any) {
      console.error('Failed to create recipe:', err)
      error = err.message || 'Kunne ikke lagre oppskriften. Prøv igjen.'
    } finally {
      isSubmitting = false
    }
  }
</script>

<div class="mx-auto max-w-2xl px-4 py-8">
  <div class="mb-8 flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">Ny oppskrift</h1>
    <a
      href="/oppskrifter"
      class="text-sm font-medium text-gray-600 hover:text-gray-900"
    >
      Avbryt
    </a>
  </div>

  <form onsubmit={handleSubmit} class="space-y-8">
    {#if error}
      <div class="rounded-xl bg-red-50 p-4 text-sm text-red-700">
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
              />
              <button
                type="button"
                onclick={() => { imageFile = null; imagePreview = null }}
                class="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
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
                  Last opp et bilde
                </span>
                <input
                  type="file"
                  accept="image/*"
                  class="sr-only"
                  onchange={handleImageChange}
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
        bind:ingredients
        onUpdate={(newIngredients) => ingredients = newIngredients}
      />
    </div>

    <div class="pt-4">
      <button
        type="submit"
        disabled={isSubmitting || !name || ingredients.length === 0}
        class="w-full rounded-xl bg-green-600 py-4 text-base font-bold text-white shadow-lg hover:bg-green-700 disabled:bg-gray-300 disabled:shadow-none transition-all active:scale-[0.98]"
      >
        {isSubmitting ? 'Lagrer...' : 'Lagre oppskrift'}
      </button>
    </div>
  </form>
</div>
