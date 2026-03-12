<script lang="ts">
  import { browser } from '$app/environment'
  import { onDestroy } from 'svelte'
  import {
    bindVisibilityCleanup,
    createRouteCleanup,
    startScanner,
    stopScanner,
    type ScannerError,
    type ScannerSession,
  } from '$lib/barcode/scanner'

  interface Props {
    open: boolean
    onClose: () => void
    onDetected: (ean: string) => void
    onOpenManualEntry: () => void
  }

  type ScannerViewState = 'idle' | 'loading' | 'scanning' | 'permission-denied' | 'camera-failure'

  let { open, onClose, onDetected, onOpenManualEntry }: Props = $props()

  let dialogEl = $state<HTMLDialogElement | null>(null)
  let session = $state<ScannerSession | null>(null)
  let state = $state<ScannerViewState>('idle')
  let message = $state('Vi starter kameraet og ser etter strekkoden.')

  const previewId = `barcode-scanner-preview`
  let removeVisibilityCleanup: (() => void) | null = null
  let removeRouteCleanup: (() => void) | null = null

  function getMockMode() {
    if (!browser) return null

    const mock = (
      window as Window & {
        __HANDLEAPPEN_BARCODE_SCANNER_MOCK__?: { mode?: 'active' | 'permission-denied' }
      }
    ).__HANDLEAPPEN_BARCODE_SCANNER_MOCK__

    return mock?.mode ?? null
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) {
      void handleClose()
    }
  }

  function updateFailureState(error: ScannerError) {
    state = error.reason
    message =
      error.reason === 'permission-denied'
        ? 'Kameratilgang er avslått. Du kan gi tilgang og prøve igjen, eller skrive EAN manuelt.'
        : 'Kameraet kunne ikke startes. Prøv igjen, eller skriv EAN manuelt.'
  }

  async function teardownScanner() {
    removeVisibilityCleanup?.()
    removeVisibilityCleanup = null
    removeRouteCleanup?.()
    removeRouteCleanup = null
    await stopScanner(session)
    session = null
  }

  async function bootScanner() {
    if (!browser || !open) return

    state = 'loading'
    message = 'Vi starter kameraet og ser etter strekkoden.'
    await teardownScanner()

    if (getMockMode() === 'active') {
      const handleMockDetected = async (event: Event) => {
        const barcode = (event as CustomEvent<string>).detail
        state = 'idle'
        await onDetected(barcode)
      }

      window.addEventListener('handleappen:barcode-detected', handleMockDetected as EventListener)

      session = {
        scanner: {
          isScanning: true,
          stop: async () => {
            window.removeEventListener('handleappen:barcode-detected', handleMockDetected as EventListener)
          },
          clear: async () => {
            window.removeEventListener('handleappen:barcode-detected', handleMockDetected as EventListener)
          },
        },
        elementId: previewId,
        status: 'running',
        stopped: false,
        lastValue: null,
      }

      state = 'scanning'
      message = 'Hold strekkoden rolig foran kameraet. Vi stopper ved første gyldige treff.'
      removeVisibilityCleanup = bindVisibilityCleanup(() => teardownScanner())
      removeRouteCleanup = createRouteCleanup(() => teardownScanner())
      return
    }

    try {
      session = await startScanner({
        elementId: previewId,
        onDetected: async (ean) => {
          state = 'idle'
          await onDetected(ean)
        },
        onError: async (error) => {
          updateFailureState(error)
        },
      })

      state = 'scanning'
      message = 'Hold strekkoden rolig foran kameraet. Vi stopper ved første gyldige treff.'
      removeVisibilityCleanup = bindVisibilityCleanup(() => teardownScanner())
      removeRouteCleanup = createRouteCleanup(() => teardownScanner())
    } catch (error) {
      if (error instanceof Error && error.name === 'ScannerError') return

      updateFailureState({
        name: 'ScannerError',
        message: 'Kameraet kunne ikke startes.',
        reason: 'camera-failure',
      } as ScannerError)
    }
  }

  async function handleClose() {
    await teardownScanner()
    state = 'idle'
    onClose()
  }

  async function retryScanner() {
    await bootScanner()
  }

  $effect(() => {
    if (!dialogEl) return

    if (open) {
      if (!dialogEl.open) dialogEl.showModal()
      void bootScanner()
      return
    }

    if (dialogEl.open) dialogEl.close()
    void teardownScanner()
    state = 'idle'
  })

  onDestroy(() => {
    void teardownScanner()
  })
</script>

<dialog
  bind:this={dialogEl}
  onclick={handleBackdropClick}
  class="fixed inset-0 m-0 h-dvh w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/40"
>
  <div class="flex min-h-full items-end justify-center p-2 sm:p-4">
    <div class="mx-auto flex max-h-[calc(100dvh-1rem)] w-[calc(100%-0.5rem)] max-w-lg flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b border-gray-100 px-4 pb-4 pt-5">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Scan strekkode</h2>
          <p class="mt-1 text-sm text-gray-500">{message}</p>
        </div>
        <button
          type="button"
          class="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onclick={() => void handleClose()}
          aria-label="Lukk skanner"
        >
          ✕
        </button>
      </div>

      <div class="min-h-0 space-y-4 overflow-y-auto px-4 py-4">
        <div
          class="overflow-hidden rounded-2xl border border-gray-200 bg-gray-950"
          data-testid="barcode-preview-shell"
        >
          <div
            id={previewId}
            data-testid="barcode-preview"
            class="relative flex min-h-64 items-center justify-center bg-gray-950 text-center text-sm text-white"
          >
            {#if state === 'loading'}
              <p class="px-6 text-gray-200">Starter kamera…</p>
            {:else if state === 'scanning'}
              <div class="w-full">
                <div class="pointer-events-none absolute inset-4 rounded-2xl border-2 border-dashed border-white/70"></div>
                <p class="absolute inset-x-0 bottom-4 text-xs text-white/80">
                  Vi stopper automatisk ved første gyldige barcode.
                </p>
              </div>
            {:else if state === 'permission-denied'}
              <div class="space-y-2 px-6 py-10">
                <p class="font-medium text-white">Kameratilgang mangler</p>
                <p class="text-sm text-gray-200">Gi tilgang i nettleseren og prøv igjen, eller bruk manuell EAN.</p>
              </div>
            {:else if state === 'camera-failure'}
              <div class="space-y-2 px-6 py-10">
                <p class="font-medium text-white">Kameraet kunne ikke startes</p>
                <p class="text-sm text-gray-200">Dette kan skyldes manglende kamera eller at enheten allerede bruker det.</p>
              </div>
            {:else}
              <p class="px-6 text-gray-200">Trykk på nytt for å starte skanneren.</p>
            {/if}
          </div>
        </div>
      </div>

      <div class="sticky bottom-0 flex flex-col gap-2 border-t border-gray-100 bg-white px-4 pb-4 pt-3 sm:flex-row" data-testid="sheet-actions">
        {#if state === 'permission-denied' || state === 'camera-failure'}
          <button
            type="button"
            class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onclick={() => void retryScanner()}
          >
            Prøv igjen
          </button>
        {/if}

        <button
          type="button"
          class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onclick={onOpenManualEntry}
        >
          Skriv EAN manuelt
        </button>

        <button
          type="button"
          class="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700"
          onclick={() => void handleClose()}
        >
          Avbryt
        </button>
      </div>
    </div>
  </div>
</dialog>
