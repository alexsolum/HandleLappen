<script lang="ts">
  import BarcodeScannerSheet from '$lib/components/barcode/BarcodeScannerSheet.svelte'
  import ManualEanEntrySheet from '$lib/components/barcode/ManualEanEntrySheet.svelte'

  interface Props {
    onAdd: (name: string, quantity: number | null) => void
    onDetected?: (ean: string) => void
    onManualSubmit?: (ean: string) => void
  }

  let { onAdd, onDetected = () => {}, onManualSubmit = () => {} }: Props = $props()

  let name = $state('')
  let quantity = $state('')
  let nameInput: HTMLInputElement
  let barcodeFlow = $state<'scanner' | 'manual' | null>(null)
  let cameraSupported = $state(false)

  $effect(() => {
    cameraSupported =
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof window !== 'undefined'
  })

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return

    // CRITICAL (Pitfall 6): focus SYNCHRONOUSLY before any async work
    // to keep iOS keyboard open during rapid entry
    nameInput.focus()

    const qty = quantity !== '' ? parseInt(quantity, 10) : null
    onAdd(trimmed, isNaN(qty as number) ? null : qty)

    name = ''
    quantity = ''
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  function openScanner() {
    queueMicrotask(() => {
      barcodeFlow = 'scanner'
    })
  }

  function openManualEntry() {
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
</script>

<div class="fixed bottom-16 left-0 right-0 border-t border-gray-200 bg-white px-4 py-3 shadow-lg">
  <div class="mx-auto flex max-w-lg flex-col gap-2 sm:flex-row sm:items-center">
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <input
        bind:this={nameInput}
        bind:value={name}
        type="text"
        placeholder="Legg til vare…"
        class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        onkeydown={handleKeydown}
      />
      <input
        bind:value={quantity}
        type="number"
        min="1"
        placeholder="Antall"
        class="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        onkeydown={handleKeydown}
      />
    </div>

    <div class="flex items-center gap-2 sm:flex-none">
      <button
        type="button"
        onclick={openScanner}
        class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:flex-none"
      >
        Scan
      </button>
      <button
        type="button"
        onclick={handleSubmit}
        class="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:flex-none"
      >
        Legg til
      </button>
    </div>
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
