<script lang="ts">
  type LocationPermissionState =
    | 'idle'
    | 'explaining'
    | 'locating'
    | 'active'
    | 'permission-denied'
    | 'unavailable'

  interface Props {
    state: LocationPermissionState
    detectedStoreName: string | null
    showSettingsHint: boolean
    onStart: () => void
    onConfirm: () => void
    onCancel: () => void
    onRetry: () => void
  }

  let { state, detectedStoreName, showSettingsHint, onStart, onConfirm, onCancel, onRetry }: Props =
    $props()
</script>

<section class="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm text-emerald-950">
  {#if state === 'idle'}
    <button
      type="button"
      class="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-emerald-700"
      onclick={onStart}
    >
      Slå på automatisk butikkvalg
    </button>
  {:else if state === 'explaining'}
    <div class="space-y-3">
      <div class="space-y-1">
        <h2 class="text-base font-semibold">Velg butikk automatisk</h2>
        <p>HandleAppen bruker posisjonen din bare mens appen er åpen for å finne nærmeste lagrede butikk.</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-emerald-700"
          onclick={onConfirm}
        >
          Fortsett
        </button>
        <button
          type="button"
          class="inline-flex items-center rounded-full border border-emerald-200 bg-white px-4 py-2 font-medium text-emerald-900 transition hover:bg-emerald-100"
          onclick={onCancel}
        >
          Ikke nå
        </button>
      </div>
    </div>
  {:else if state === 'locating'}
    <p class="font-medium">Finner posisjonen din…</p>
  {:else if state === 'active'}
    <p class="font-medium">
      {#if detectedStoreName}
        Automatisk valgt butikk: {detectedStoreName}
      {:else}
        Automatisk butikkvalg er på.
      {/if}
    </p>
  {:else if state === 'permission-denied'}
    <div class="space-y-3">
      <p class="font-medium">Stedstilgang er avslått. Du kan prøve igjen eller velge butikk manuelt.</p>
      {#if showSettingsHint}
        <p>Hvis Safari ikke spør igjen, åpne Innstillinger og gi HandleAppen stedstilgang.</p>
      {/if}
      <button
        type="button"
        class="inline-flex items-center rounded-full border border-emerald-200 bg-white px-4 py-2 font-medium text-emerald-900 transition hover:bg-emerald-100"
        onclick={onRetry}
      >
        Prøv igjen
      </button>
    </div>
  {:else if state === 'unavailable'}
    <div class="space-y-3">
      <p class="font-medium">Vi fant ikke posisjonen din akkurat nå. Velg butikk manuelt eller prøv igjen.</p>
      <button
        type="button"
        class="inline-flex items-center rounded-full border border-emerald-200 bg-white px-4 py-2 font-medium text-emerald-900 transition hover:bg-emerald-100"
        onclick={onRetry}
      >
        Prøv igjen
      </button>
    </div>
  {/if}
</section>
