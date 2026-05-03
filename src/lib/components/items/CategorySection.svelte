<script lang="ts">
  import ItemRow from '$lib/components/items/ItemRow.svelte'
  import { motionDuration } from '$lib/utils/motion.svelte'
  import { flip } from 'svelte/animate'
  import { fly } from 'svelte/transition'

  type Item = {
    id: string
    name: string
    quantity: number | null
    is_checked: boolean
    category_id: string | null
    product_image_url?: string | null
  }

  interface Props {
    categoryName: string
    items: Item[]
    onToggle: (id: string, checked: boolean) => void
    onDelete: (id: string) => void
    onIncrement: (item: Item) => void
    onDecrement: (item: Item) => void
    onLongPress: (item: Item) => void
    enableReflowAnimation?: boolean
  }

  let {
    categoryName,
    items,
    onToggle,
    onDelete,
    onIncrement,
    onDecrement,
    onLongPress,
    enableReflowAnimation = true,
  }: Props = $props()
  const flipDuration = $derived(enableReflowAnimation ? motionDuration(220) : 0)

</script>

<div class="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
  {categoryName}
</div>

{#each items as item (item.id)}
  <!-- motion: respect reduced-motion; key by item id to avoid realtime remount double-runs. -->
  <div
    animate:flip={{ duration: flipDuration }}
    in:fly={{ y: -8, duration: motionDuration(180) }}
    out:fly={{ y: 8, duration: motionDuration(160), opacity: 0 }}
  >
    <ItemRow
      {item}
      onToggle={() => onToggle(item.id, !item.is_checked)}
      onDelete={() => onDelete(item.id)}
      onIncrement={() => onIncrement(item)}
      onDecrement={() => onDecrement(item)}
      onLongPress={() => onLongPress(item)}
    />
  </div>
{/each}
