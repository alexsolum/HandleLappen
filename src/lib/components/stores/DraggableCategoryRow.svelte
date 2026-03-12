<script lang="ts">
  interface Props {
    category: { id: string; name: string }
    onRename?: (id: string, name: string) => void
    onDelete?: (id: string) => void
  }

  let { category, onRename, onDelete }: Props = $props()

  let isEditing = $state(false)
  let draftName = $state(category.name)

  $effect(() => {
    draftName = category.name
  })

  function startEditing() {
    if (!onRename) return
    isEditing = true
    draftName = category.name
  }

  function submitRename() {
    const trimmed = draftName.trim()
    if (!trimmed || !onRename) {
      isEditing = false
      draftName = category.name
      return
    }

    onRename(category.id, trimmed)
    isEditing = false
  }

  function cancelRename() {
    isEditing = false
    draftName = category.name
  }
</script>

<div class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
  <div class="min-w-0 flex-1">
    {#if isEditing}
      <input
        bind:value={draftName}
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none"
        maxlength="80"
        onkeydown={(event) => {
          if (event.key === 'Enter') submitRename()
          if (event.key === 'Escape') cancelRename()
        }}
      />
    {:else}
      <span class="block truncate text-sm font-medium text-gray-900">{category.name}</span>
    {/if}
  </div>

  {#if isEditing}
    <button
      type="button"
      class="rounded-md px-2 py-1 text-sm font-medium text-green-700 hover:bg-green-50"
      onclick={submitRename}
    >
      Lagre
    </button>
    <button
      type="button"
      class="rounded-md px-2 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100"
      onclick={cancelRename}
    >
      Avbryt
    </button>
  {:else}
    {#if onRename}
      <button
        type="button"
        class="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        aria-label={`Gi nytt navn til ${category.name}`}
        onclick={startEditing}
      >
        ✎
      </button>
    {/if}

    {#if onDelete}
      <button
        type="button"
        class="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-red-500"
        aria-label={`Slett ${category.name}`}
        onclick={() => onDelete(category.id)}
      >
        🗑
      </button>
    {/if}

    <span
      class="cursor-grab select-none text-gray-400 touch-none"
      style="touch-action: none"
      aria-hidden="true"
    >
      ⠿⠿
    </span>
  {/if}
</div>
