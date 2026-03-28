<script lang="ts">
  import { storeDisplayName } from '$lib/utils/stores'

  interface Props {
    store: { id: string; chain: string | null; location_name: string }
    onDelete: (id: string) => void
    adminPrefix?: string
  }

  let { store, onDelete, adminPrefix = '' }: Props = $props()
  const displayName = $derived(storeDisplayName(store.chain, store.location_name))

  function handleDelete(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    onDelete(store.id)
  }
</script>

<a
  href="{adminPrefix}/butikker/{store.id}"
  class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
>
  <span class="min-w-0 flex-1 truncate font-medium text-gray-900">{displayName}</span>
  <button
    type="button"
    class="ml-3 shrink-0 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-red-500"
    aria-label={`Slett ${displayName}`}
    onclick={handleDelete}
  >
    ✕
  </button>
</a>
