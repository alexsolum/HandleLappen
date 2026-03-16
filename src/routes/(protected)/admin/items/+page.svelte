<script lang="ts">
  import { createCategoriesQuery } from '$lib/queries/categories'
  import {
    createItemMemoryQuery,
    createUpdateItemMemoryMutation,
    type ItemMemoryEntry,
  } from '$lib/queries/item-memory-admin'

  let { data } = $props()

  const itemsQuery = createItemMemoryQuery(data.supabase)
  const categoriesQuery = createCategoriesQuery(data.supabase, data.householdId)
  const updateMutation = createUpdateItemMemoryMutation(data.supabase)

  let editingItemId = $state<string | null>(null)
  let editingName = $state('')
  let editingCategoryId = $state('')
  let editingBrand = $state('')
  let editingImageUrl = $state('')
  let editError = $state<string | null>(null)
  let imageLoadError = $state(false)

  const dateFormatter = new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium' })

  function startEditing(item: ItemMemoryEntry) {
    editingItemId = item.id
    editingName = item.display_name
    editingCategoryId = item.last_category_id ?? ''
    editingBrand = item.brand ?? ''
    editingImageUrl = item.product_image_url ?? ''
    editError = null
    imageLoadError = false
  }

  function cancelEditing() {
    editingItemId = null
    editingName = ''
    editingCategoryId = ''
    editingBrand = ''
    editingImageUrl = ''
    editError = null
    imageLoadError = false
  }

  function clearImage() {
    editingImageUrl = ''
    imageLoadError = false
  }

  function handleSave() {
    if (!editingItemId) return
    const trimmed = editingName.trim()
    if (!trimmed) {
      editError = 'Navnet kan ikke være tomt.'
      return
    }

    const trimmedImageUrl = editingImageUrl.trim()

    updateMutation.mutate(
      {
        itemId: editingItemId,
        displayName: trimmed,
        categoryId: editingCategoryId || null,
        brand: editingBrand.trim() || null,
        imageUrl: trimmedImageUrl || null,
      },
      {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          editError = error.message
        },
      }
    )
  }

  /** Returns true if brandText is a substring (case-insensitive) of productName */
  function shouldHideBrand(productName: string, brandText: string | null | undefined): boolean {
    if (!brandText) return true
    return productName.toLowerCase().includes(brandText.toLowerCase())
  }

  const categoryLookup = $derived(
    new Map((categoriesQuery.data ?? []).map((category) => [category.id, category.name]))
  )
</script>

<svelte:head>
  <title>Varekatalog — HandleAppen</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-6 pb-24">
  <div class="mb-5">
    <a href="/admin" class="mb-2 inline-block text-sm font-medium text-green-600 hover:text-green-700">
      ← Admin
    </a>
    <h1 class="text-2xl font-semibold text-gray-900">Varekatalog</h1>
    <p class="mt-1 text-sm text-gray-500">Navn, kategori, merke og bilde kan endres her.</p>
  </div>

  {#if itemsQuery.isPending}
    <div class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
      Laster Varekatalog…
    </div>
  {:else if itemsQuery.isError}
    <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
      Kunne ikke laste varekatalogen.
    </div>
  {:else if (itemsQuery.data?.length ?? 0) === 0}
    <div class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
      Ingen varer i varekatalogen ennå.
    </div>
  {:else}
    {#if updateMutation.isError && !editError}
      <div class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {updateMutation.error?.message ?? 'Kunne ikke lagre endringen.'}
      </div>
    {/if}

    <div class="space-y-3">
      {#each itemsQuery.data ?? [] as item (item.id)}
        <article class="space-y-3 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
          <div class="flex items-start justify-between gap-3">
            <!-- Thumbnail + name/brand -->
            <div class="flex min-w-0 items-start gap-3">
              <!-- Circular thumbnail -->
              <div class="relative h-10 w-10 shrink-0">
                {#if item.product_image_url}
                  <img
                    src={item.product_image_url}
                    alt={item.display_name}
                    class="h-10 w-10 rounded-full object-cover"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
                  />
                  <!-- Fallback icon (hidden unless image errors) -->
                  <div
                    class="absolute inset-0 hidden h-10 w-10 items-center justify-center rounded-full bg-gray-100"
                    aria-hidden="true"
                  >
                    <svg class="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                {:else}
                  <!-- Placeholder icon -->
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100"
                    aria-hidden="true"
                  >
                    <svg class="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                {/if}
              </div>

              <!-- Name + brand subtitle -->
              <div class="min-w-0">
                <p class="text-base font-semibold text-gray-900">{item.display_name}</p>
                {#if item.brand && !shouldHideBrand(item.display_name, item.brand)}
                  <p class="text-xs text-gray-500">{item.brand}</p>
                {/if}
                <p class="text-sm text-gray-500">
                  {categoryLookup.get(item.last_category_id ?? '') ?? 'Uten kategori'} · brukt {item.use_count} ganger
                </p>
              </div>
            </div>

            <button
              type="button"
              class="shrink-0 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              onclick={() => startEditing(item)}
            >
              Endre
            </button>
          </div>
          <p class="text-xs text-gray-400">Sist brukt {dateFormatter.format(new Date(item.last_used_at))}</p>

          {#if editingItemId === item.id}
            <div class="space-y-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <!-- Name field -->
              <div class="space-y-1">
                <label class="text-xs font-semibold uppercase tracking-wide text-gray-500" for="item-name">
                  Navn
                </label>
                <input
                  id="item-name"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none"
                  bind:value={editingName}
                  placeholder="F.eks. Melk"
                  maxlength="80"
                />
              </div>

              <!-- Brand field -->
              <div class="space-y-1">
                <label class="text-xs font-semibold uppercase tracking-wide text-gray-500" for="item-brand">
                  Merke
                </label>
                <input
                  id="item-brand"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none"
                  bind:value={editingBrand}
                  placeholder="F.eks. Tine"
                  maxlength="100"
                />
              </div>

              <!-- Image URL field with live preview -->
              <div class="space-y-1">
                <label class="text-xs font-semibold uppercase tracking-wide text-gray-500" for="item-image-url">
                  Bilde-URL
                </label>
                <div class="flex items-center gap-2">
                  <input
                    id="item-image-url"
                    class="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none"
                    bind:value={editingImageUrl}
                    oninput={() => { imageLoadError = false }}
                    placeholder="https://…"
                  />
                  {#if editingImageUrl.trim()}
                    <button
                      type="button"
                      class="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-100"
                      onclick={clearImage}
                    >
                      Tøm bilde
                    </button>
                  {/if}
                </div>

                <!-- Live image preview -->
                {#if editingImageUrl.trim() && !imageLoadError}
                  <div class="mt-2 flex items-center gap-3">
                    <img
                      src={editingImageUrl.trim()}
                      alt="Forhåndsvisning"
                      class="h-12 w-12 rounded-full object-cover border border-gray-200"
                      onerror="this.parentElement.style.display='none'"
                    />
                    <span class="text-xs text-gray-500">Forhåndsvisning</span>
                  </div>
                {/if}
              </div>

              <!-- Category field -->
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-semibold uppercase tracking-wide text-gray-500" for="item-category">
                    Kategori
                  </label>
                  {#if categoriesQuery.isPending}
                    <span class="text-xs text-gray-400">Laster kategorier…</span>
                  {/if}
                </div>
                <select
                  id="item-category"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none"
                  bind:value={editingCategoryId}
                >
                  <option value="">Uten kategori</option>
                  {#each categoriesQuery.data ?? [] as category}
                    <option value={category.id}>{category.name}</option>
                  {/each}
                </select>
              </div>

              {#if editError}
                <p class="text-xs text-red-600">{editError}</p>
              {/if}

              <div class="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                  onclick={cancelEditing}
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-green-700 px-4 py-1 text-xs font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-400"
                  disabled={updateMutation.isLoading}
                  onclick={handleSave}
                >
                  {#if updateMutation.isLoading}
                    Lagre…
                  {:else}
                    Lagre
                  {/if}
                </button>
              </div>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</div>
