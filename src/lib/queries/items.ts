import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enqueue } from '$lib/offline/queue'
import { refreshPendingCount } from '$lib/stores/offline.svelte'

type Item = {
  id: string
  list_id: string
  name: string
  quantity: number | null
  is_checked: boolean
  checked_at: string | null
  sort_order: number
  category_id: string | null
  created_at: string
}

type AddItemVariables = { name: string; quantity?: number | null }
type DeleteItemVariables = { id: string }
type ToggleItemVariables = { itemId: string; isChecked: boolean; itemName: string }
type AssignCategoryVariables = { itemId: string; categoryId: string | null }
type UpdateItemVariables = { id: string; name: string; quantity: number | null }
type MutationContext = { previous: Item[] | undefined }

export function itemsQueryKey(listId: string) {
  return ['items', listId]
}

export function createItemsQuery(supabase: SupabaseClient, listId: string) {
  return createQuery(() => ({
    queryKey: itemsQueryKey(listId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('list_items')
        .select('id, list_id, name, quantity, is_checked, checked_at, sort_order, category_id, created_at')
        .eq('list_id', listId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Item[]
    },
  }))
}

export function createAddItemMutation(supabase: SupabaseClient, listId: string) {
  const queryClient = useQueryClient()
  const queryKey = itemsQueryKey(listId)

  return createMutation<Item, Error, AddItemVariables, MutationContext>(() => ({
    mutationFn: async ({ name, quantity }) => {
      const { data, error } = await supabase
        .from('list_items')
        .insert({ list_id: listId, name, quantity: quantity ?? null })
        .select('id, list_id, name, quantity, is_checked, checked_at, sort_order, category_id, created_at')
        .single()
      if (error) throw error
      return data as Item
    },
    onMutate: async ({ name, quantity }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Item[]>(queryKey)
      queryClient.setQueryData<Item[]>(queryKey, (old = []) => [
        ...old,
        {
          id: crypto.randomUUID(),
          list_id: listId,
          name,
          quantity: quantity ?? null,
          is_checked: false,
          checked_at: null,
          sort_order: 0,
          category_id: null,
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

  return createMutation<void, Error, DeleteItemVariables, MutationContext>(() => ({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('list_items').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Item[]>(queryKey)
      queryClient.setQueryData<Item[]>(queryKey, (old = []) => old.filter((item) => item.id !== id))
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

  return createMutation<void, Error, ToggleItemVariables, MutationContext>(() => ({
    mutationFn: async ({ itemId, isChecked, itemName }) => {
      if (!navigator.onLine) {
        const timestamp = new Date().toISOString()

        await enqueue({
          id: itemId,
          type: 'toggle',
          payload: {
            itemId,
            listId,
            isChecked,
            itemName,
            userId,
            timestamp,
          },
          enqueuedAt: timestamp,
        })
        await refreshPendingCount()
        return
      }

      const timestamp = new Date().toISOString()

      // Step 1: Toggle the item
      const { error: itemError } = await supabase
        .from('list_items')
        .update({
          is_checked: isChecked,
          checked_at: isChecked ? timestamp : null,
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
          checked_at: timestamp,
        })
        if (histError) throw histError
      }
    },
    onMutate: async ({ itemId, isChecked }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Item[]>(queryKey)
      queryClient.setQueryData<Item[]>(queryKey, (old = []) =>
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
    onSettled: () => {
      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey })
      }
    },
  }))
}

export function createAssignCategoryMutation(supabase: SupabaseClient, listId: string) {
  const queryClient = useQueryClient()
  const queryKey = itemsQueryKey(listId)

  return createMutation<void, Error, AssignCategoryVariables, MutationContext>(() => ({
    mutationFn: async ({ itemId, categoryId }) => {
      const { error } = await supabase.from('list_items').update({ category_id: categoryId }).eq('id', itemId)
      if (error) throw error
    },
    onMutate: async ({ itemId, categoryId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Item[]>(queryKey)
      queryClient.setQueryData<Item[]>(queryKey, (old = []) =>
        old.map((item) => (item.id === itemId ? { ...item, category_id: categoryId } : item))
      )
      return { previous }
    },
    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  }))
}

export function createUpdateItemMutation(supabase: SupabaseClient, listId: string) {
  const queryClient = useQueryClient()
  const queryKey = itemsQueryKey(listId)

  return createMutation<void, Error, UpdateItemVariables, MutationContext>(() => ({
    mutationFn: async ({ id, name, quantity }) => {
      const { error } = await supabase.from('list_items').update({ name, quantity }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, name, quantity }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Item[]>(queryKey)
      queryClient.setQueryData<Item[]>(queryKey, (old = []) =>
        old.map((item) => (item.id === id ? { ...item, name, quantity } : item))
      )
      return { previous }
    },
    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  }))
}
