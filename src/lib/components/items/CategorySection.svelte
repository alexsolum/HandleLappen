<script lang="ts">
  import ItemRow from '$lib/components/items/ItemRow.svelte'

  type Item = {
    id: string
    name: string
    quantity: number | null
    is_checked: boolean
  }

  interface Props {
    categoryName: string
    items: Item[]
    onToggle: (id: string, checked: boolean) => void
    onDelete: (id: string) => void
    onIncrement: (item: Item) => void
    onDecrement: (item: Item) => void
    onLongPress: (item: Item) => void
  }

  let { categoryName, items, onToggle, onDelete, onIncrement, onDecrement, onLongPress }: Props = $props()

  void onLongPress
</script>

<div class="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
  {categoryName}
</div>

  {#each items as item (item.id)}
  <ItemRow
    {item}
    onToggle={() => onToggle(item.id, !item.is_checked)}
    onDelete={() => onDelete(item.id)}
    onIncrement={() => onIncrement(item)}
    onDecrement={() => onDecrement(item)}
    onLongPress={() => onLongPress(item)}
  />
{/each}
