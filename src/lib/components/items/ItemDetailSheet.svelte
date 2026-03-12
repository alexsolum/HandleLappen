<script lang="ts">
  type Category = { id: string; name: string }
  type Item = { id: string; name: string; quantity: number | null; category_id: string | null }

  interface Props {
    item: Item | null
    categories: Category[]
    onSave: (id: string, name: string, quantity: number | null, categoryId: string | null) => void
    onClose: () => void
  }

  let { item, categories, onSave, onClose }: Props = $props()

  let dialogEl = $state<HTMLDialogElement | null>(null)
  let draftName = $state('')
  let draftQuantity = $state('')
  let draftCategoryId = $state<string | null>(null)

  $effect(() => {
    if (!item) {
      draftName = ''
      draftQuantity = ''
      draftCategoryId = null
      return
    }

    draftName = item.name
    draftQuantity = item.quantity == null ? '' : String(item.quantity)
    draftCategoryId = item.category_id
  })

  $effect(() => {
    if (!dialogEl) return

    if (item) {
      if (!dialogEl.open) dialogEl.showModal()
      return
    }

    if (dialogEl.open) dialogEl.close()
  })

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) onClose()
  }

  function handleSave() {
    if (!item) return

    const trimmedName = draftName.trim()
    if (!trimmedName) return

    const parsedQuantity = draftQuantity === '' ? null : Number.parseInt(draftQuantity, 10)
    onSave(item.id, trimmedName, Number.isNaN(parsedQuantity) ? null : parsedQuantity, draftCategoryId)
  }
</script>

<dialog
  bind:this={dialogEl}
  onclick={handleBackdropClick}
  class="fixed bottom-0 left-0 right-0 m-0 w-full max-w-none rounded-t-2xl border-0 p-0 shadow-2xl backdrop:bg-black/40"
>
  <div class="mx-auto w-full max-w-lg rounded-t-2xl bg-white px-4 pb-6 pt-5">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-900">Rediger vare</h2>
      <button
        type="button"
        class="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        onclick={onClose}
        aria-label="Lukk varedetaljer"
      >
        ✕
      </button>
    </div>

    <div class="space-y-4">
      <label class="block space-y-2">
        <span class="text-sm font-medium text-gray-700">Navn</span>
        <input
          bind:value={draftName}
          type="text"
          class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </label>

      <label class="block space-y-2">
        <span class="text-sm font-medium text-gray-700">Antall</span>
        <input
          bind:value={draftQuantity}
          type="number"
          min="1"
          class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </label>

      <div class="space-y-2">
        <span class="text-sm font-medium text-gray-700">Kategori</span>
        <div class="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
          {#each categories as category (category.id)}
            <button
              type="button"
              class={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                draftCategoryId === category.id
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onclick={() => (draftCategoryId = category.id)}
            >
              {category.name}
            </button>
          {/each}

          <button
            type="button"
            class={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
              draftCategoryId == null ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onclick={() => (draftCategoryId = null)}
          >
            Andre varer
          </button>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button
          type="button"
          class="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          onclick={onClose}
        >
          Lukk
        </button>
        <button
          type="button"
          class="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700"
          onclick={handleSave}
        >
          Lagre
        </button>
      </div>
    </div>
  </div>
</dialog>
