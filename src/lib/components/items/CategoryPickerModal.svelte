<script lang="ts">
  type Category = { id: string; name: string }

  interface Props {
    categories: Category[]
    onSelect: (categoryId: string | null) => void
    open: boolean
  }

  let { categories, onSelect, open }: Props = $props()

  let dialogEl = $state<HTMLDialogElement | null>(null)

  $effect(() => {
    if (!dialogEl) return

    if (open) {
      if (!dialogEl.open) dialogEl.showModal()
      return
    }

    if (dialogEl.open) dialogEl.close()
  })

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) {
      onSelect(null)
    }
  }
</script>

<dialog
  bind:this={dialogEl}
  onclick={handleBackdropClick}
  class="fixed bottom-0 left-0 right-0 m-0 w-full max-w-none rounded-t-2xl border-0 p-0 shadow-2xl backdrop:bg-black/40"
>
  <div class="mx-auto w-full max-w-lg rounded-t-2xl bg-white px-4 pb-6 pt-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-900">Velg kategori</h2>
      <button
        type="button"
        class="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        onclick={() => onSelect(null)}
        aria-label="Lukk kategorioversikt"
      >
        ✕
      </button>
    </div>

    <div class="max-h-72 space-y-2 overflow-y-auto pb-4">
      {#each categories as category (category.id)}
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-900 hover:border-green-200 hover:bg-green-50"
          onclick={() => onSelect(category.id)}
        >
          <span>{category.name}</span>
          <span class="text-xs uppercase tracking-wide text-gray-400">Velg</span>
        </button>
      {/each}
    </div>

    <button
      type="button"
      class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
      onclick={() => onSelect(null)}
    >
      Hopp over
    </button>
  </div>
</dialog>
