<script lang="ts">
  import { motionDuration } from '$lib/utils/motion.svelte'
  import { CHAIN_COLORS } from '$lib/utils/stores'
  import { fly } from 'svelte/transition'

  interface Props {
    open: boolean
    storeName: string
    chain?: string | null
    itemsCount: number
    elapsedMinutes: number
    onClose: () => void
  }

  let { open, storeName, chain = null, itemsCount, elapsedMinutes, onClose }: Props = $props()
  let dialogEl = $state<HTMLDialogElement | null>(null)

  const swatchColor = $derived(chain && CHAIN_COLORS[chain] ? CHAIN_COLORS[chain] : '#166534')
  const itemLabel = $derived(itemsCount === 1 ? 'vare handlet' : 'varer handlet')

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) onClose()
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
  class="fixed inset-0 m-0 h-dvh w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/40"
>
  <div class="flex min-h-full items-end justify-center p-2 sm:p-4">
    <!-- motion: respect reduced-motion -->
    <div
      class="mx-auto w-[calc(100%-0.5rem)] max-w-lg overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
      data-testid="trip-summary-sheet"
      transition:fly={{ y: 400, duration: motionDuration(280) }}
    >
      <div class="border-b border-gray-100 px-5 pb-5 pt-6">
        <div class="flex items-center gap-3">
          <span
            class="h-10 w-10 flex-shrink-0 rounded-full border border-black/5"
            style="background-color: {swatchColor};"
            aria-hidden="true"
          ></span>
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-gray-500">{storeName}</p>
            <h2 class="text-xl font-semibold text-gray-900">Handleturen er ferdig</h2>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 px-5 py-5">
        <div class="rounded-2xl bg-gray-50 px-4 py-3">
          <p class="text-2xl font-semibold text-gray-900">{itemsCount}</p>
          <p class="text-sm text-gray-500">{itemLabel}</p>
        </div>
        <div class="rounded-2xl bg-gray-50 px-4 py-3">
          <p class="text-2xl font-semibold text-gray-900">~{elapsedMinutes}</p>
          <p class="text-sm text-gray-500">minutter</p>
        </div>
      </div>

      <div class="border-t border-gray-100 px-5 pb-5 pt-3">
        <button
          type="button"
          class="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          onclick={onClose}
        >
          Ferdig
        </button>
      </div>
    </div>
  </div>
</dialog>
