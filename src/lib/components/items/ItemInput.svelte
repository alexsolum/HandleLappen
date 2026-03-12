<script lang="ts">
  import BarcodeScannerSheet from '$lib/components/barcode/BarcodeScannerSheet.svelte'
  import ManualEanEntrySheet from '$lib/components/barcode/ManualEanEntrySheet.svelte'
  import { offlineStore } from '$lib/stores/offline.svelte'

  interface Props {
    onAdd: (name: string, quantity: number | null) => void
    onDetected?: (ean: string) => void
    onManualSubmit?: (ean: string) => void
    resumeBarcodeFlow?: 'scanner' | 'manual' | null
    onResumeHandled?: () => void
  }

  let {
    onAdd,
    onDetected = () => {},
    onManualSubmit = () => {},
    resumeBarcodeFlow = null,
    onResumeHandled = () => {},
  }: Props = $props()

  let name = $state('')
  let quantity = $state('')
  let nameInput: HTMLInputElement
  let barcodeFlow = $state<'scanner' | 'manual' | null>(null)
  let cameraSupported = $state(false)
  let isOnline = $derived(offlineStore.isOnline)
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

  function handleSubmit() {
    if (!isOnline) return

    const trimmed = name.trim()
    if (!trimmed) return

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
</script>

<div class="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 px-3">
  <div class="mx-auto max-w-lg rounded-[1.5rem] border border-gray-200 bg-white/95 px-3 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <input
          bind:this={nameInput}
          bind:value={name}
          type="text"
          placeholder="Legg til vare…"
          class="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          disabled={!isOnline}
          title={!isOnline ? offlineLabel : undefined}
          aria-label={!isOnline ? offlineLabel : 'Legg til vare'}
          onkeydown={handleKeydown}
        />
        <input
          bind:value={quantity}
          type="number"
          min="1"
          placeholder="Antall"
          class="w-24 rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          disabled={!isOnline}
          title={!isOnline ? offlineLabel : undefined}
          aria-label={!isOnline ? offlineLabel : 'Antall'}
          onkeydown={handleKeydown}
        />
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
