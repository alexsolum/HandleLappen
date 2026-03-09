import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'

const QUERY_KEY = ['lists']

export function createListsQuery(supabase: SupabaseClient) {
  return createQuery(() => ({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lists')
        .select('id, name, created_at, list_items(count)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  }))
}

export function createCreateListMutation(supabase: SupabaseClient) {
  const queryClient = useQueryClient()
  return createMutation(() => ({
    mutationFn: async ({ name, householdId }: { name: string; householdId: string }) => {
      const { data, error } = await supabase
        .from('lists')
        .insert({ name, household_id: householdId })
        .select('id, name, created_at, list_items(count)')
        .single()
      if (error) throw error
      return data
    },
    onMutate: async ({ name }: { name: string; householdId: string }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData(QUERY_KEY)
      queryClient.setQueryData(QUERY_KEY, (old: any[] = []) => [
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
  return createMutation(() => ({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('lists').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id }: { id: string }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData(QUERY_KEY)
      queryClient.setQueryData(QUERY_KEY, (old: any[] = []) => old.filter((l) => l.id !== id))
      return { previous }
    },
    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  }))
}
