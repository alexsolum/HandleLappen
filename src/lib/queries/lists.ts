import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'

const QUERY_KEY = ['lists']

type ListRow = {
  id: string
  name: string
  created_at: string
  list_items: Array<{ count: number }>
}

type CreateListVariables = { name: string; householdId: string }
type DeleteListVariables = { id: string }
type MutationContext = { previous: ListRow[] | undefined }

export function createListsQuery(supabase: SupabaseClient) {
  return createQuery(() => ({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lists')
        .select('id, name, created_at, list_items(count)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ListRow[]
    },
  }))
}

export function createCreateListMutation(supabase: SupabaseClient) {
  const queryClient = useQueryClient()
  return createMutation<ListRow, Error, CreateListVariables, MutationContext>(() => ({
    mutationFn: async ({ name, householdId }) => {
      const { data, error } = await supabase
        .from('lists')
        .insert({ name, household_id: householdId })
        .select('id, name, created_at, list_items(count)')
        .single()
      if (error) throw error
      return data as ListRow
    },
    onMutate: async ({ name }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<ListRow[]>(QUERY_KEY)
      queryClient.setQueryData<ListRow[]>(QUERY_KEY, (old = []) => [
        {
          id: crypto.randomUUID(),
          name,
          created_at: new Date().toISOString(),
          list_items: [{ count: 0 }],
        },
        ...old,
      ])
      return { previous }
    },
    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  }))
}

export function createDeleteListMutation(supabase: SupabaseClient) {
  const queryClient = useQueryClient()
  return createMutation<void, Error, DeleteListVariables, MutationContext>(() => ({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('lists').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<ListRow[]>(QUERY_KEY)
      queryClient.setQueryData<ListRow[]>(QUERY_KEY, (old = []) => old.filter((l) => l.id !== id))
      return { previous }
    },
    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  }))
}
