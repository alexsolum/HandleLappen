<script lang="ts">
  import { createListsQuery, createCreateListMutation, createDeleteListMutation } from '$lib/queries/lists'
  import ListRow from '$lib/components/lists/ListRow.svelte'
  import ListCreateRow from '$lib/components/lists/ListCreateRow.svelte'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { onDestroy } from 'svelte'

  let { data } = $props()

  const queryClient = useQueryClient()

  // Realtime: subscribe to lists changes so the home screen updates when
  // another device creates or deletes a list.
  // RLS (WALRUS) enforces household isolation server-side — no client-side filter needed.
  const listsChannel = data.supabase
    .channel('household-lists')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'lists',
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['lists'] })
      }
    )
    .subscribe()

  onDestroy(() => {
    data.supabase.removeChannel(listsChannel)
  })

  const listsQuery = createListsQuery(data.supabase)
  const createListMutation = createCreateListMutation(data.supabase)
  const deleteListMutation = createDeleteListMutation(data.supabase)

  function handleCreate(name: string) {
    createListMutation.mutate({ name, householdId: data.householdId })
  }

  function handleDelete(id: string) {
    deleteListMutation.mutate({ id })
  }
</script>

<div class="max-w-lg mx-auto px-4 py-6 space-y-2">
  {#if listsQuery.isPending}
    <p class="text-sm text-gray-400 text-center py-8">Laster lister…</p>
  {:else if listsQuery.isError}
    <p class="text-sm text-red-600 text-center py-8">Kunne ikke laste lister.</p>
  {:else if listsQuery.data && listsQuery.data.length === 0}
    <p class="text-sm text-gray-400 text-center py-8">
      Ingen lister ennå. Trykk '+' for å lage din første liste.
    </p>
  {:else if listsQuery.data}
    {#each listsQuery.data as list (list.id)}
      <ListRow {list} onDelete={() => handleDelete(list.id)} />
    {/each}
  {/if}

  <ListCreateRow onCreate={handleCreate} />
</div>
