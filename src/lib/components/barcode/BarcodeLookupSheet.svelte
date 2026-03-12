<script lang="ts">
  import type { BarcodeCategoryOption, BarcodeSheetModel } from '$lib/queries/barcode'

  interface Props {
    open: boolean
    ean?: string | null
    viewState: 'loading' | 'found' | 'not_found' | 'error'
    result: BarcodeSheetModel | null
    categories: BarcodeCategoryOption[]
    submitting?: boolean
    onClose: () => void
    onRetry: () => void
    onOpenManualEntry: () => void
    onConfirm: (input: { name: string; quantity: number | null; categoryId: string | null }) => void
  }

  let {
    open,
    ean = null,
    viewState,
    result,
    categories,
    submitting = false,
    onClose,
    onRetry,
    onOpenManualEntry,
    onConfirm,
  }: Props = $props()

  let dialogEl = $state<HTMLDialogElement | null>(null)
  let draftName = $state('')
  let draftQuantity = $state('1')
  let draftCategoryId = $state<string | null>(null)

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) onClose()
  }

  function parseQuantity(value: string) {
    if (!value) return null

    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
  }

  function handleCategoryChange(event: Event) {
    const target = event.currentTarget as HTMLSelectElement
    draftCategoryId = target.value || null
  }

  function handleConfirm() {
    const trimmedName = draftName.trim()

    if (!trimmedName) return

    onConfirm({
      name: trimmedName,
      quantity: parseQuantity(draftQuantity),
      categoryId: draftCategoryId,
    })
  }

  $effect(() => {
    if (viewState === 'found' || viewState === 'not_found') {
      draftName = result?.itemName ?? ''
      draftQuantity = String(result?.quantity ?? 1)
      draftCategoryId = result?.categoryId ?? null
    }
  })

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
    <div class="mx-auto flex max-h-[calc(100dvh-1rem)] w-[calc(100%-0.5rem)] max-w-lg flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl" data-testid="barcode-lookup-sheet">
      <div class="flex items-center justify-between border-b border-gray-100 px-4 pb-4 pt-5">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">
            {#if viewState === 'loading'}
              Søker etter vare
            {:else if viewState === 'found'}
              Bekreft vare
            {:else if viewState === 'not_found'}
              Finner ikke varen
            {:else}
              Kunne ikke søke opp varen
            {/if}
          </h2>
          <p class="mt-1 text-sm text-gray-500">
            {#if viewState === 'loading'}
              Vi henter navn og kategori automatisk.
            {:else if viewState === 'found'}
              Kontroller navnet og kategorien før du legger varen i listen.
            {:else if viewState === 'not_found'}
              Du kan prøve på nytt, skrive inn en annen EAN eller legge til varen manuelt.
            {:else}
              Prøv igjen eller fortsett med manuell EAN.
            {/if}
          </p>
        </div>
        <button
          type="button"
          class="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onclick={onClose}
          aria-label="Lukk strekkodesøk"
        >
          ✕
        </button>
      </div>

      <div class="min-h-0 space-y-4 overflow-y-auto px-4 py-4">
        {#if result?.ean || ean}
          <div class="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            EAN: <span class="font-medium text-gray-900">{result?.ean ?? ean}</span>
          </div>
        {/if}

        {#if viewState === 'loading'}
          <div class="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
            Søker i produktdatabasen…
          </div>
        {:else if viewState === 'found' || viewState === 'not_found'}
          <div class="space-y-4">
            <label class="block space-y-2">
              <span class="text-sm font-medium text-gray-700">Varenavn</span>
              <input
                bind:value={draftName}
                type="text"
                class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="F.eks. Pepsi Max 1,5 L"
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

            <label class="block space-y-2">
              <span class="text-sm font-medium text-gray-700">Kategori</span>
              <select
                class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                value={draftCategoryId ?? ''}
                onchange={handleCategoryChange}
              >
                <option value="">Andre varer</option>
                {#each categories as category (category.id)}
                  <option value={category.id}>{category.name}</option>
                {/each}
              </select>
            </label>
          </div>
        {:else}
          <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            Strekkodesøket svarte ikke som forventet. Prøv igjen, eller bruk manuell EAN.
          </div>
        {/if}
      </div>

      <div class="sticky bottom-0 flex flex-col gap-2 border-t border-gray-100 bg-white px-4 pb-4 pt-3 sm:flex-row" data-testid="sheet-actions">
        <button
          type="button"
          class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onclick={onRetry}
        >
          Prøv igjen
        </button>

        <button
          type="button"
          class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onclick={onOpenManualEntry}
        >
          Skriv EAN manuelt
        </button>

        {#if viewState === 'found' || viewState === 'not_found'}
          <button
            type="button"
            class="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
            disabled={submitting || draftName.trim().length === 0}
            onclick={handleConfirm}
          >
            {#if submitting}
              Legger til…
            {:else if viewState === 'found'}
              Legg til vare
            {:else}
              Legg til manuelt
            {/if}
          </button>
        {:else}
          <button
            type="button"
            class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onclick={onClose}
          >
            Avbryt
          </button>
        {/if}
      </div>
    </div>
  </div>
</dialog>
