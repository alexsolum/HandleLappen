<script lang="ts">
  import { storeDisplayName } from '$lib/utils/stores'

  type Store = {
    id: string
    chain: string | null
    location_name: string
  }

  interface Props {
    stores: Store[]
    selectedStoreId: string | null
    onSelect: (id: string | null) => void
  }

  let { stores, selectedStoreId, onSelect }: Props = $props()

  let dialogEl = $state<HTMLDialogElement | null>(null)

  const selectedStoreName = $derived.by(() => {
    const found = stores.find((store) => store.id === selectedStoreId)
    return found ? storeDisplayName(found.chain, found.location_name) : 'Velg butikk manuelt'
  })

  function openSheet() {
    dialogEl?.showModal()
  }

  function closeSheet() {
    dialogEl?.close()
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) {
      closeSheet()
    }
  }

  function handleSelect(id: string | null) {
    onSelect(id)
    closeSheet()
  }
</script>

<button
  type="button"
  class="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 shadow-sm"
  onclick={openSheet}
>
  <span>Butikk:</span>
  <span class="font-medium">{selectedStoreName}</span>
</button>

<dialog
  bind:this={dialogEl}
  onclick={handleBackdropClick}
  class="fixed bottom-0 left-0 right-0 m-0 mt-auto w-full max-w-none rounded-t-2xl border-0 p-0 shadow-2xl backdrop:bg-black/40"
>
  <div class="rounded-t-2xl bg-white">
    <div class="border-b border-gray-100 px-4 py-4">
      <h2 class="text-base font-semibold text-gray-900">Velg butikk</h2>
    </div>

    <div class="divide-y divide-gray-100">
      <button
        type="button"
        class="flex w-full items-center justify-between px-4 py-4 text-left text-sm text-gray-700"
        onclick={() => handleSelect(null)}
      >
        <span>Velg butikk manuelt</span>
        {#if selectedStoreId == null}
          <span class="font-medium text-green-600">Valgt</span>
        {/if}
      </button>

      {#each stores as store (store.id)}
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-4 text-left text-sm text-gray-700"
          onclick={() => handleSelect(store.id)}
        >
          <span>{storeDisplayName(store.chain, store.location_name)}</span>
          {#if selectedStoreId === store.id}
            <span class="font-medium text-green-600">Valgt</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</dialog>
