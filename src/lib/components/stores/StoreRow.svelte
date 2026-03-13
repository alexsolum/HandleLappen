<script lang="ts">
  interface Props {
    store: { id: string; name: string }
    onDelete: (id: string) => void
    adminPrefix?: string
  }

  let { store, onDelete, adminPrefix = '' }: Props = $props()

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
  <span class="min-w-0 flex-1 truncate font-medium text-gray-900">{store.name}</span>
  <button
    type="button"
    class="ml-3 shrink-0 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-red-500"
    aria-label={`Slett ${store.name}`}
    onclick={handleDelete}
  >
    ✕
  </button>
</a>
