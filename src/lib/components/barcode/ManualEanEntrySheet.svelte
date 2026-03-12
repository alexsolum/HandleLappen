<script lang="ts">
  interface Props {
    open: boolean
    supportsCamera: boolean
    onClose: () => void
    onSubmit: (ean: string) => void
    onBackToCamera: () => void
  }

  let { open, supportsCamera, onClose, onSubmit, onBackToCamera }: Props = $props()

  let dialogEl = $state<HTMLDialogElement | null>(null)
  let ean = $state('')
  let error = $state('')

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) onClose()
  }

  function resetForm() {
    ean = ''
    error = ''
  }

  function sanitize(value: string) {
    return value.replace(/\D/g, '')
  }

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    ean = sanitize(target.value)
    error = ''
  }

  function validate(value: string): string {
    if (!value) return 'Skriv inn EAN-koden før du fortsetter.'
    if (![8, 12, 13].includes(value.length)) return 'EAN må være 8, 12 eller 13 sifre.'
    return ''
  }

  function handleSubmit() {
    const normalized = sanitize(ean)
    const validationError = validate(normalized)

    if (validationError) {
      error = validationError
      return
    }

    onSubmit(normalized)
    resetForm()
  }

  $effect(() => {
    if (!dialogEl) return

    if (open) {
      if (!dialogEl.open) dialogEl.showModal()
      return
    }

    resetForm()
    if (dialogEl.open) dialogEl.close()
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
          <h2 class="text-lg font-semibold text-gray-900">Skriv EAN manuelt</h2>
          <p class="mt-1 text-sm text-gray-500">Bruk dette hvis kameraet ikke finner strekkoden.</p>
        </div>
        <button
          type="button"
          class="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onclick={onClose}
          aria-label="Lukk manuell EAN"
        >
          ✕
        </button>
      </div>

      <div class="min-h-0 space-y-4 overflow-y-auto px-4 py-4">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-gray-700">EAN-kode</span>
          <input
            value={ean}
            type="text"
            inputmode="numeric"
            autocomplete="off"
            placeholder="F.eks. 7044610878304"
            class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            oninput={handleInput}
          />
        </label>

        {#if error}
          <p class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        {/if}
      </div>

      <div class="sticky bottom-0 flex flex-col gap-2 border-t border-gray-100 bg-white px-4 pb-4 pt-3 sm:flex-row" data-testid="sheet-actions">
        {#if supportsCamera}
          <button
            type="button"
            class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onclick={onBackToCamera}
          >
            Tilbake til kamera
          </button>
        {/if}

        <button
          type="button"
          class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onclick={onClose}
        >
          Avbryt
        </button>

        <button
          type="button"
          class="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700"
          onclick={handleSubmit}
        >
          Fortsett
        </button>
      </div>
    </div>
  </div>
</dialog>
