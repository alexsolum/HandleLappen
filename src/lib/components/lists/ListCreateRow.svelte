<script lang="ts">
  interface Props {
    onCreate: (name: string) => void
  }

  let { onCreate }: Props = $props()

  let isCreating = $state(false)
  let newListName = $state('')

  function startCreate() {
    isCreating = true
  }

  function submitCreate() {
    const trimmed = newListName.trim()
    if (!trimmed) return
    onCreate(trimmed)
    newListName = ''
    isCreating = false
  }

  function cancel() {
    newListName = ''
    isCreating = false
  }
</script>

<div class="rounded-xl border border-gray-200 bg-white">
  {#if isCreating}
    <div class="flex items-center gap-2 px-4 py-3">
      <input
        bind:value={newListName}
        onkeydown={(e) => {
          if (e.key === 'Enter') submitCreate()
          if (e.key === 'Escape') cancel()
        }}
        placeholder="Navn på lista"
        class="flex-1 text-sm outline-none"
        autofocus
      />
      <button
        onclick={submitCreate}
        class="shrink-0 text-sm text-green-700 font-medium px-2 py-1"
      >
        Legg til
      </button>
    </div>
  {:else}
    <button
      onclick={startCreate}
      class="flex items-center gap-2 px-4 py-3 w-full text-left text-gray-500 text-sm"
    >
      <span class="text-xl leading-none">+</span> Ny liste
    </button>
  {/if}
</div>
