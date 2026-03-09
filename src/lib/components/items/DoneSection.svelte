<script lang="ts">
  interface Props {
    items: Array<{ id: string; name: string; quantity: number | null }>
    onUncheck: (id: string) => void
  }

  let { items, onUncheck }: Props = $props()

  let expanded = $state(false)

  function toggleExpanded() {
    expanded = !expanded
  }
</script>

{#if items.length > 0}
  <div class="mt-4">
    <!-- Section header — tap to toggle -->
    <button
      type="button"
      class="flex w-full items-center justify-between px-4 py-2 text-left"
      onclick={toggleExpanded}
    >
      <span class="text-sm font-medium uppercase tracking-wide text-gray-500">
        Handlet ({items.length})
      </span>
      <span class="text-xs text-gray-400">{expanded ? '(skjul)' : '(vis)'}</span>
    </button>

    {#if expanded}
      <div class="divide-y divide-gray-100">
        {#each items as item (item.id)}
          <button
            type="button"
            class="flex w-full items-center gap-3 bg-white px-4 py-3 text-left"
            onclick={() => onUncheck(item.id)}
          >
            <!-- Checked indicator -->
            <div
              class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-green-500 bg-green-500"
            >
              <svg class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span class="font-medium text-gray-400 line-through">
              {item.name}{item.quantity != null ? ` · ${item.quantity}` : ''}
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
