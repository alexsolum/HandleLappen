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
  let editError = $state<string | null>(null)

  const dateFormatter = new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium' })

  function startEditing(item: ItemMemoryEntry) {
    editingItemId = item.id
    editingName = item.display_name
    editingCategoryId = item.last_category_id ?? ''
    editError = null
  }

  function cancelEditing() {
    editingItemId = null
    editingName = ''
    editingCategoryId = ''
    editError = null
  }

  function handleSave() {
    if (!editingItemId) return
    const trimmed = editingName.trim()
    if (!trimmed) {
      editError = 'Navnet kan ikke være tomt.'
      return
    }

    updateMutation.mutate(
      {
        itemId: editingItemId,
        displayName: trimmed,
        categoryId: editingCategoryId || null,
      },
      {
        onSuccess: () => cancelEditing(),
        onError: (error) => {
          editError = error.message
        },
      }
    )
  }

  $: categoryLookup = new Map(
    (categoriesQuery.data ?? []).map((category) => [category.id, category.name])
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
    <p class="mt-1 text-sm text-gray-500">Navn og kategori kan endres før vi kobler til bilder.</p>
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
            <div>
              <p class="text-base font-semibold text-gray-900">{item.display_name}</p>
              <p class="text-sm text-gray-500">
                {categoryLookup.get(item.last_category_id ?? '') ?? 'Uten kategori'} · brukt {item.use_count} ganger
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              onclick={() => startEditing(item)}
            >
              Endre
            </button>
          </div>
          <p class="text-xs text-gray-400">Sist brukt {dateFormatter.format(new Date(item.last_used_at))}</p>

          {#if editingItemId === item.id}
            <div class="space-y-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
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
