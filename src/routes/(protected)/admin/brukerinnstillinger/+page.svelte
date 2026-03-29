<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import StoreMapWidget from '$lib/components/stores/StoreMapWidget.svelte'
  import { classifyLocationError, getCurrentLocation } from '$lib/location/geolocation'

  let { data } = $props()

  const userId = data.user.id

  const roundCoordinate = (value: number) => Math.round(value * 10_000) / 10_000

  let savedLat = $state<number | null>(data.homeLocation?.lat ?? null)
  let savedLng = $state<number | null>(data.homeLocation?.lng ?? null)
  let pendingLat = $state<number | null>(savedLat)
  let pendingLng = $state<number | null>(savedLng)
  let feedback = $state('')
  let errorMessage = $state('')
  let isSaving = $state(false)
  let isRemoving = $state(false)
  let isLocating = $state(false)

  const hasSavedLocation = $derived(savedLat !== null && savedLng !== null)
  const hasPendingLocation = $derived(pendingLat !== null && pendingLng !== null)
  const hasUnsavedChanges = $derived(pendingLat !== savedLat || pendingLng !== savedLng)
  const statusLabel = $derived(
    !hasPendingLocation
      ? hasSavedLocation
        ? 'Lagret hjemmeposisjon'
        : feedback === 'Hjemmeposisjon fjernet'
          ? 'Ingen hjemmeposisjon lagret'
          : 'Ikke lagret ennå'
      : hasUnsavedChanges
        ? 'Klar til lagring'
        : 'Lagret hjemmeposisjon'
  )

  function handleLocationChange(lat: number, lng: number) {
    pendingLat = roundCoordinate(lat)
    pendingLng = roundCoordinate(lng)
    feedback = ''
    errorMessage = ''
  }

  async function handleUseCurrentLocation() {
    isLocating = true
    feedback = ''
    errorMessage = ''

    try {
      const sample = await getCurrentLocation()
      handleLocationChange(sample.latitude, sample.longitude)
    } catch (error) {
      const kind = classifyLocationError(error)

      errorMessage =
        kind === 'permission-denied'
          ? 'Stedstilgang ble avslått. Tillat stedstilgang og prøv igjen.'
          : kind === 'position-unavailable'
            ? 'Vi fant ikke posisjonen din akkurat nå. Prøv igjen om et øyeblikk.'
            : kind === 'timeout'
              ? 'Posisjonen brukte for lang tid. Prøv igjen.'
              : 'Denne enheten støtter ikke stedstilgang her.'
    } finally {
      isLocating = false
    }
  }

  async function handleSave() {
    if (!hasPendingLocation) {
      return
    }

    isSaving = true
    feedback = ''
    errorMessage = ''

    const { error } = await data.supabase.from('user_home_locations').upsert(
      {
        user_id: userId,
        lat_4dp: pendingLat,
        lng_4dp: pendingLng,
      },
      { onConflict: 'user_id' }
    )

    isSaving = false

    if (error) {
      errorMessage = 'Kunne ikke lagre hjemmeposisjon. Prøv igjen.'
      return
    }

    savedLat = pendingLat
    savedLng = pendingLng
    feedback = 'Hjemmeposisjon lagret'
    await invalidateAll()
  }

  async function handleRemove() {
    isRemoving = true
    feedback = ''
    errorMessage = ''

    const { error } = await data.supabase.from('user_home_locations').delete().eq('user_id', userId)

    isRemoving = false

    if (error) {
      errorMessage = 'Kunne ikke fjerne hjemmeposisjon. Prøv igjen.'
      return
    }

    savedLat = null
    savedLng = null
    pendingLat = null
    pendingLng = null
    feedback = 'Hjemmeposisjon fjernet'
    await invalidateAll()
  }
</script>

<svelte:head>
  <title>Brukerinnstillinger — HandleAppen</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-6 pb-24">
  <a href="/admin" class="text-sm font-medium text-green-700 hover:text-green-800">← Admin</a>

  <header class="mt-3">
    <h1 class="text-2xl font-semibold text-gray-900">Brukerinnstillinger</h1>
    <p class="mt-2 text-sm text-gray-600">
      Hjemmeposisjonen din er kun knyttet til din konto. Den brukes bare for aa skille handletur fra rydde opp hjemme.
      Kun din konto kan se denne hjemmeposisjonen, og den er ikke delt med andre i husstanden.
    </p>
  </header>

  <section class="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Hjemmeposisjon</h2>
        <p class="mt-1 text-sm text-gray-500">
          Lagre et fast punkt for aa rydde opp hjemme uten aa skrive til historikken.
        </p>
      </div>
      <span class="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
        {statusLabel}
      </span>
    </div>

    <div class="mt-4" data-testid="home-location-map">
      <StoreMapWidget lat={pendingLat} lng={pendingLng} onLocationChange={handleLocationChange} />
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        class="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 transition hover:border-green-500 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        onclick={handleUseCurrentLocation}
        disabled={isLocating || isSaving || isRemoving}
      >
        {isLocating ? 'Henter posisjon…' : 'Bruk min posisjon'}
      </button>

      <button
        type="button"
        class="rounded-lg bg-green-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        onclick={handleSave}
        disabled={!hasPendingLocation || !hasUnsavedChanges || isSaving || isRemoving}
      >
        {isSaving ? 'Lagrer…' : 'Lagre hjemmeposisjon'}
      </button>
    </div>

    {#if hasSavedLocation}
      <button
        type="button"
        class="mt-3 w-full rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        onclick={handleRemove}
        disabled={isSaving || isRemoving}
      >
        {isRemoving ? 'Fjerner…' : 'Fjern hjemmeposisjon'}
      </button>
    {/if}

    <dl class="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
      <div class="flex items-center justify-between gap-4">
        <dt class="font-medium text-gray-500">Breddegrad</dt>
        <dd data-testid="pending-lat">{pendingLat ?? '—'}</dd>
      </div>
      <div class="mt-2 flex items-center justify-between gap-4">
        <dt class="font-medium text-gray-500">Lengdegrad</dt>
        <dd data-testid="pending-lng">{pendingLng ?? '—'}</dd>
      </div>
    </dl>

    <div aria-live="polite" class="mt-4 space-y-2">
      {#if feedback}
        <p class="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">{feedback}</p>
      {/if}

      {#if errorMessage}
        <p class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      {/if}
    </div>
  </section>
</div>
