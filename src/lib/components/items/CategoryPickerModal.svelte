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
  class="fixed inset-0 m-0 h-dvh w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/40"
>
  <div class="flex min-h-full items-end justify-center p-2 sm:p-4">
    <div class="mx-auto flex max-h-[calc(100dvh-1rem)] w-[calc(100%-0.5rem)] max-w-lg flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b border-gray-100 px-4 pb-4 pt-5">
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

      <div class="min-h-0 space-y-2 overflow-y-auto px-4 py-4">
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

      <div class="sticky bottom-0 border-t border-gray-100 bg-white px-4 pb-4 pt-3">
        <button
          type="button"
          class="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          onclick={() => onSelect(null)}
        >
          Hopp over
        </button>
      </div>
    </div>
  </div>
</dialog>
