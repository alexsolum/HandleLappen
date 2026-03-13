<script lang="ts">
  import { createStoreMutation, createStoresQuery, deleteStoreMutation } from '$lib/queries/stores'
  import StoreRow from '$lib/components/stores/StoreRow.svelte'

  let { data } = $props()

  const storesQuery = createStoresQuery(data.supabase, data.householdId)
  const createMutation = createStoreMutation(data.supabase, data.householdId)
  const deleteMutation = deleteStoreMutation(data.supabase, data.householdId)

  let isCreating = $state(false)
  let newStoreName = $state('')

  function openCreateRow() {
    isCreating = true
  }

  function cancelCreate() {
    isCreating = false
    newStoreName = ''
  }

  function submitCreate() {
    const trimmed = newStoreName.trim()
    if (!trimmed) return

    createMutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          newStoreName = ''
          isCreating = false
        },
      }
    )
  }

  function handleDelete(id: string) {
    deleteMutation.mutate({ id })
  }
</script>

<svelte:head>
  <title>Butikker — HandleAppen</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-6 pb-24">
  <div class="mb-5">
    <a href="/admin" class="mb-2 inline-block text-sm font-medium text-green-700 hover:text-green-800">
      ← Admin
    </a>
    <h1 class="text-2xl font-semibold text-gray-900">Butikker</h1>
    <p class="mt-1 text-sm text-gray-500">Velg en butikk eller juster standard rekkefølge.</p>
  </div>

  {#if createMutation.isError || deleteMutation.isError}
    <div class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      Noe gikk galt. Endringen ble ikke lagret.
    </div>
  {/if}

  <div class="space-y-3">
    <a
      href="/admin/butikker/standard"
      class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
    >
      <div>
        <span class="block text-sm font-medium text-gray-900">Standard rekkefølge</span>
        <span class="text-sm text-gray-500">Legg til, gi nytt navn eller slett kategorier</span>
      </div>
      <span class="text-xl text-gray-400" aria-hidden="true">⚙</span>
    </a>

    {#if storesQuery.isPending}
      <p class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
        Laster butikker…
      </p>
    {:else if storesQuery.isError}
      <p class="rounded-xl border border-dashed border-red-200 px-4 py-6 text-center text-sm text-red-600">
        Kunne ikke laste butikker.
      </p>
    {:else}
      {#each storesQuery.data ?? [] as store (store.id)}
        <StoreRow {store} onDelete={handleDelete} adminPrefix="/admin" />
      {/each}

      {#if storesQuery.data?.length === 0}
        <p class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          Ingen butikker ennå.
        </p>
      {/if}
    {/if}

    {#if isCreating}
      <div class="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <label class="block text-sm font-medium text-gray-700" for="new-store-name">Butikknavn</label>
        <input
          id="new-store-name"
          bind:value={newStoreName}
          class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none"
          placeholder="Rema 1000 Majorstua"
          maxlength="80"
          onkeydown={(event) => {
            if (event.key === 'Enter') submitCreate()
            if (event.key === 'Escape') cancelCreate()
          }}
        />
        <div class="mt-3 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
            onclick={cancelCreate}
          >
            Avbryt
          </button>
          <button
            type="button"
            class="rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
            onclick={submitCreate}
          >
            Lagre
          </button>
        </div>
      </div>
    {:else}
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-left"
        onclick={openCreateRow}
      >
        <span class="text-sm font-medium text-gray-900">Legg til butikk</span>
        <span class="text-xl text-green-700" aria-hidden="true">+</span>
      </button>
    {/if}
  </div>
</div>
