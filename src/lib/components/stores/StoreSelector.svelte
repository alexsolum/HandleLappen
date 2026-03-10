<script lang="ts">
  type Store = {
    id: string
    name: string
  }

  interface Props {
    stores: Store[]
    selectedStoreId: string | null
    onSelect: (id: string | null) => void
  }

  let { stores, selectedStoreId, onSelect }: Props = $props()

  let dialogEl = $state<HTMLDialogElement | null>(null)

  const selectedStoreName = $derived(
    stores.find((store) => store.id === selectedStoreId)?.name ?? 'Ingen'
  )

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
        <span>Ingen butikk</span>
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
          <span>{store.name}</span>
          {#if selectedStoreId === store.id}
            <span class="font-medium text-green-600">Valgt</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</dialog>
