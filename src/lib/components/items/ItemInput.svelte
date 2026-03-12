<script lang="ts">
  import BarcodeScannerSheet from '$lib/components/barcode/BarcodeScannerSheet.svelte'
  import ManualEanEntrySheet from '$lib/components/barcode/ManualEanEntrySheet.svelte'
  import type { RememberedItem } from '$lib/queries/remembered-items-core'
  import { offlineStore } from '$lib/stores/offline.svelte'

  interface Props {
    onAdd: (name: string, quantity: number) => void
    onQueryChange?: (query: string) => void
    onSuggestionSelect?: (suggestion: RememberedItem) => void
    onDetected?: (ean: string) => void
    onManualSubmit?: (ean: string) => void
    resumeBarcodeFlow?: 'scanner' | 'manual' | null
    suggestions?: RememberedItem[]
    onResumeHandled?: () => void
  }

  let {
    onAdd,
    onQueryChange = () => {},
    onSuggestionSelect = () => {},
    onDetected = () => {},
    onManualSubmit = () => {},
    resumeBarcodeFlow = null,
    suggestions = [],
    onResumeHandled = () => {},
  }: Props = $props()

  let name = $state('')
  let quantity = $state(1)
  let nameInput: HTMLInputElement
  let barcodeFlow = $state<'scanner' | 'manual' | null>(null)
  let cameraSupported = $state(false)
  let isOnline = $derived(offlineStore.isOnline)
  const visibleSuggestions = $derived(isOnline && name.trim().length > 0 ? suggestions : [])
  const offlineLabel = 'Legg til krever nett'

  $effect(() => {
    cameraSupported =
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof window !== 'undefined'
  })

  $effect(() => {
    if (typeof window === 'undefined') return

    const handleMockDetection = (event: Event) => {
      if (barcodeFlow !== 'scanner') return

      const ean = (event as CustomEvent<string>).detail
      if (typeof ean !== 'string' || ean.trim().length === 0) return

      handleDetected(ean)
    }

    window.addEventListener('handleappen:barcode-detected', handleMockDetection as EventListener)

    return () => {
      window.removeEventListener('handleappen:barcode-detected', handleMockDetection as EventListener)
    }
  })

  $effect(() => {
    if (!resumeBarcodeFlow || barcodeFlow === resumeBarcodeFlow) return

    queueMicrotask(() => {
      barcodeFlow = resumeBarcodeFlow
      onResumeHandled()
    })
  })

  function resetInput() {
    name = ''
    quantity = 1
    onQueryChange('')
  }

  function handleSubmit() {
    if (!isOnline) return

    const trimmed = name.trim()
    if (!trimmed) return

    nameInput.focus()

    onAdd(trimmed, quantity)
    resetInput()
  }

  function handleInput(event: Event) {
    const nextValue = (event.currentTarget as HTMLInputElement).value
    name = nextValue
    onQueryChange(nextValue)
  }

  function handleSuggestionClick(suggestion: RememberedItem) {
    if (!isOnline) return

    nameInput.focus()
    onSuggestionSelect(suggestion)
    resetInput()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  function openScanner() {
    if (!isOnline) return

    queueMicrotask(() => {
      barcodeFlow = 'scanner'
    })
  }

  function openManualEntry() {
    if (!isOnline) return

    queueMicrotask(() => {
      barcodeFlow = 'manual'
    })
  }

  function closeBarcodeFlow() {
    barcodeFlow = null
  }

  function handleDetected(ean: string) {
    closeBarcodeFlow()
    onDetected(ean)
  }

  function handleManualSubmit(ean: string) {
    closeBarcodeFlow()
    onManualSubmit(ean)
  }

  function incrementQuantity() {
    quantity += 1
  }

  function decrementQuantity() {
    quantity = Math.max(1, quantity - 1)
  }
</script>

<div class="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 px-3">
  <div
    class="mx-auto max-w-lg rounded-[1.5rem] border border-gray-200 bg-white/95 px-3 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur"
    data-testid="add-bar-shell"
  >
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <input
          bind:this={nameInput}
          type="text"
          value={name}
          placeholder="Legg til vare…"
          class="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          disabled={!isOnline}
          title={!isOnline ? offlineLabel : undefined}
          aria-label={!isOnline ? offlineLabel : 'Legg til vare'}
          data-testid="add-item-input"
          oninput={handleInput}
          onkeydown={handleKeydown}
        />
        <div
          class="flex items-center gap-1 rounded-xl border border-gray-300 bg-white p-1 disabled:cursor-not-allowed disabled:bg-gray-100"
          data-testid="add-quantity-stepper"
        >
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
            aria-label={!isOnline ? offlineLabel : 'Reduser antall'}
            data-testid="add-decrement"
            onclick={decrementQuantity}
            disabled={!isOnline}
            title={!isOnline ? offlineLabel : undefined}
          >
            -
          </button>
          <span
            class="min-w-8 text-center text-sm font-semibold text-gray-900 disabled:text-gray-400"
            aria-label={!isOnline ? offlineLabel : 'Antall'}
            data-testid="add-quantity"
          >
            {quantity}
          </span>
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
            aria-label={!isOnline ? offlineLabel : 'Øk antall'}
            data-testid="add-increment"
            onclick={incrementQuantity}
            disabled={!isOnline}
            title={!isOnline ? offlineLabel : undefined}
          >
            +
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:flex-none">
        <button
          type="button"
          onclick={openScanner}
          class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:flex-none"
          disabled={!isOnline}
          title={!isOnline ? offlineLabel : undefined}
        >
          Scan
        </button>
        <button
          type="button"
          onclick={handleSubmit}
          class="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 sm:flex-none"
          disabled={!isOnline}
          title={!isOnline ? offlineLabel : undefined}
        >
          Legg til
        </button>
      </div>
    </div>

    {#if visibleSuggestions.length > 0}
      <div
        class="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white"
        data-testid="remembered-suggestions"
      >
        <div class="border-b border-gray-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
          Nylig brukt i husstanden
        </div>
        <div class="max-h-60 overflow-y-auto">
          {#each visibleSuggestions as suggestion (suggestion.normalizedName)}
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 text-left last:border-b-0 hover:bg-green-50"
              data-testid="remembered-suggestion-row"
              onclick={() => handleSuggestionClick(suggestion)}
            >
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium text-gray-900">{suggestion.itemName}</span>
                <span class="block text-xs text-gray-500">
                  {suggestion.useCount} tidligere {suggestion.useCount === 1 ? 'gang' : 'ganger'}
                </span>
              </span>
              <span class="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Hurtiglegg til
              </span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<BarcodeScannerSheet
  open={barcodeFlow === 'scanner'}
  onClose={closeBarcodeFlow}
  onDetected={handleDetected}
  onOpenManualEntry={openManualEntry}
/>

<ManualEanEntrySheet
  open={barcodeFlow === 'manual'}
  supportsCamera={cameraSupported}
  onClose={closeBarcodeFlow}
  onSubmit={handleManualSubmit}
  onBackToCamera={openScanner}
/>
