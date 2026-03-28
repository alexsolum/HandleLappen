<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  interface Props {
    lat: number | null
    lng: number | null
    onLocationChange: (lat: number, lng: number) => void
  }

  let { lat, lng, onLocationChange }: Props = $props()

  let mapEl: HTMLDivElement
  let mapInstance: import('leaflet').Map | null = null
  let marker: import('leaflet').Marker | null = null
  let mapLoaded = $state(false)
  let mapError = $state(false)
  let hasPin = $state(lat !== null && lng !== null)

  const DEFAULT_LAT = 59.0
  const DEFAULT_LNG = 10.0
  const DEFAULT_ZOOM = 7
  const SAVED_ZOOM = 14

  onMount(async () => {
    try {
      const L = await import('leaflet')
      await import('leaflet/dist/leaflet.css')

      L.Icon.Default.prototype.options.iconUrl = (await import('leaflet/dist/images/marker-icon.png?url'))
        .default
      L.Icon.Default.prototype.options.iconRetinaUrl = (
        await import('leaflet/dist/images/marker-icon-2x.png?url')
      ).default
      L.Icon.Default.prototype.options.shadowUrl = (await import('leaflet/dist/images/marker-shadow.png?url'))
        .default
      L.Icon.Default.imagePath = ''

      const hasExisting = lat !== null && lng !== null
      const centerLat = hasExisting ? lat : DEFAULT_LAT
      const centerLng = hasExisting ? lng : DEFAULT_LNG
      const zoom = hasExisting ? SAVED_ZOOM : DEFAULT_ZOOM

      mapInstance = L.map(mapEl).setView([centerLat, centerLng], zoom)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapInstance)

      if (hasExisting) {
        marker = L.marker([lat!, lng!]).addTo(mapInstance)
      }

      mapInstance.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng

        if (marker) {
          marker.setLatLng(e.latlng)
        } else {
          marker = L.marker(e.latlng).addTo(mapInstance!)
        }

        hasPin = true
        onLocationChange(clickLat, clickLng)
      })

      mapLoaded = true
    } catch {
      mapError = true
    }
  })

  onDestroy(() => {
    if (mapInstance) {
      mapInstance.remove()
      mapInstance = null
    }
  })
</script>

<div class="rounded-xl overflow-hidden border border-gray-200">
  {#if mapError}
    <div class="h-[250px] w-full border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-500">
      Kartet kunne ikke lastes. Sjekk internettforbindelsen og last siden paa nytt.
    </div>
  {:else}
    <div class="relative">
      <div
        bind:this={mapEl}
        class="h-[250px] w-full bg-gray-100"
        aria-label="Kart for aa plassere butikkens posisjon"
      ></div>
      {#if !mapLoaded}
        <div class="absolute inset-0 flex items-center justify-center bg-gray-100 text-sm text-gray-500">
          Laster kart...
        </div>
      {/if}
    </div>
  {/if}
</div>

<p class="mt-2 text-sm text-gray-500">
  {#if hasPin}
    Trykk for aa flytte pinnen.
  {:else}
    Trykk paa kartet for aa plassere pinnen.
  {/if}
</p>
