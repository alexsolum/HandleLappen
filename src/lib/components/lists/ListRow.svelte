<script lang="ts">
  import { swipeLeft } from '$lib/actions/swipe'

  interface Props {
    list: { id: string; name: string; list_items: Array<{ count: number }> }
    onDelete: () => void
  }

  let { list, onDelete }: Props = $props()
</script>

<div class="relative overflow-hidden rounded-xl">
  <!-- Delete badge revealed behind the row on swipe -->
  <div
    class="absolute inset-y-0 right-0 flex items-center justify-center w-20 bg-red-500 text-white text-sm font-medium rounded-r-xl"
    aria-hidden="true"
  >
    Slett
  </div>

  <!-- Row content — translated left on swipe -->
  <div
    use:swipeLeft={{ onDelete }}
    class="relative flex items-center justify-between px-4 py-4 rounded-xl border border-gray-200 bg-white"
    style="touch-action: pan-y;"
  >
    <a href="/lister/{list.id}" class="flex-1 min-w-0">
      <span class="font-medium text-gray-900 block truncate">{list.name}</span>
      <span class="text-sm text-gray-500">{list.list_items[0]?.count ?? 0} ting</span>
    </a>
    <span class="ml-2 text-gray-300 text-lg" aria-hidden="true">›</span>
  </div>
</div>
