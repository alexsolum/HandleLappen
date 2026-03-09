import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'

export function itemsQueryKey(listId: string) {
  return ['items', listId]
}

export function createItemsQuery(supabase: SupabaseClient, listId: string) {
  return createQuery(() => ({
    queryKey: itemsQueryKey(listId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('list_items')
        .select('id, list_id, name, quantity, is_checked, checked_at, sort_order, created_at')
        .eq('list_id', listId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  }))
}

export function createAddItemMutation(supabase: SupabaseClient, listId: string) {
  const queryClient = useQueryClient()
  const queryKey = itemsQueryKey(listId)

  return createMutation(() => ({
    mutationFn: async ({ name, quantity }: { name: string; quantity?: number | null }) => {
      const { data, error } = await supabase
        .from('list_items')
        .insert({ list_id: listId, name, quantity: quantity ?? null })
        .select('id, list_id, name, quantity, is_checked, checked_at, sort_order, created_at')
        .single()
      if (error) throw error
      return data
    },
    onMutate: async ({ name, quantity }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old: any[] = []) => [
        ...old,
        {
          id: crypto.randomUUID(),
          list_id: listId,
          name,
          quantity: quantity ?? null,
          is_checked: false,
          checked_at: null,
          sort_order: 0,
          created_at: new Date().toISOString(),
        },
      ])
      return { previous }
    },
    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  }))
}

export function createDeleteItemMutation(supabase: SupabaseClient, listId: string) {
  const queryClient = useQueryClient()
  const queryKey = itemsQueryKey(listId)

  return createMutation(() => ({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('list_items').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old: any[] = []) => old.filter((item) => item.id !== id))
      return { previous }
    },
    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  }))
}

export function createCheckOffMutation(supabase: SupabaseClient, listId: string, userId: string) {
  const queryClient = useQueryClient()
  const queryKey = itemsQueryKey(listId)

  return createMutation(() => ({
    mutationFn: async ({
      itemId,
      isChecked,
      itemName,
    }: {
      itemId: string
      isChecked: boolean
      itemName: string
    }) => {
      // Step 1: Toggle the item
      const { error: itemError } = await supabase
        .from('list_items')
        .update({
          is_checked: isChecked,
          checked_at: isChecked ? new Date().toISOString() : null,
        })
        .eq('id', itemId)
      if (itemError) throw itemError

      // Step 2: Write history row when checking off (HIST-01)
      // checked_by is explicitly provided — do NOT rely on auth.uid() at DB level
      if (isChecked) {
        const { error: histError } = await supabase.from('item_history').insert({
          list_id: listId,
          item_id: itemId,
          item_name: itemName,
          checked_by: userId,
          checked_at: new Date().toISOString(),
        })
        if (histError) throw histError
      }
    },
    onMutate: async ({ itemId, isChecked }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old: any[] = []) =>
        old.map((item) =>
          item.id === itemId
            ? { ...item, is_checked: isChecked, checked_at: isChecked ? new Date().toISOString() : null }
            : item
        )
      )
      return { previous }
    },
    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  }))
}
