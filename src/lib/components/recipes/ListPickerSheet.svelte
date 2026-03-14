<script lang="ts">
  type ListOption = {
    id: string
    name: string
  }

  interface Props {
    lists: ListOption[]
    open: boolean
    onClose: () => void
    onSelect: (listId: string, listName: string) => void
  }

  let { lists, open, onClose, onSelect }: Props = $props()

  let dialogEl = $state<HTMLDialogElement | null>(null)

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) {
      onClose()
    }
  }

  $effect(() => {
    if (!dialogEl) return

    if (open) {
      if (!dialogEl.open) dialogEl.showModal()
      return
    }

    if (dialogEl.open) dialogEl.close()
  })
</script>

<dialog
  bind:this={dialogEl}
  onclick={handleBackdropClick}
  class="fixed bottom-0 left-0 right-0 m-0 w-full max-w-none rounded-t-2xl border-0 p-0 shadow-2xl backdrop:bg-black/40"
>
  <div class="mx-auto w-full max-w-lg rounded-t-2xl bg-white px-4 pb-6 pt-5" data-testid="list-picker-sheet">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Velg liste</h2>
        <p class="mt-1 text-sm text-gray-500">Velg hvilken handleliste du vil legge ingrediensene i.</p>
      </div>
      <button
        type="button"
        class="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        onclick={onClose}
        aria-label="Lukk listevelger"
      >
        &#x2715;
      </button>
    </div>

    {#if lists.length === 0}
      <div class="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
        Du har ingen handlelister ennå.
        <a href="/lister" class="mt-2 block font-medium text-green-600 hover:text-green-700">
          Gå til handlelister
        </a>
      </div>
    {:else}
      <div class="max-h-72 space-y-2 overflow-y-auto pb-4">
        {#each lists as list (list.id)}
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-900 hover:border-green-200 hover:bg-green-50"
            onclick={() => onSelect(list.id, list.name)}
            data-testid="list-picker-option"
          >
            <span>{list.name}</span>
            <span class="text-xs uppercase tracking-wide text-gray-400">Velg</span>
          </button>
        {/each}
      </div>
    {/if}

    <button
      type="button"
      class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
      onclick={onClose}
    >
      Avbryt
    </button>
  </div>
</dialog>
