import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enqueue } from '$lib/offline/queue'
import { isOfflineMode, refreshPendingCount } from '$lib/stores/offline.svelte'
import { rememberedItemsBaseKey } from '$lib/queries/remembered-items'

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

type AddItemVariables = { name: string; quantity?: number | null; categoryId?: string | null }
type AddOrIncrementItemVariables = { listId: string; name: string; amount?: number; categoryId?: string | null }
type DeleteItemVariables = { id: string }
type ChangeQuantityVariables = {
  id: string
  currentQuantity: number | null
  delta: 1 | -1
}
type ToggleItemVariables = {
  itemId: string
  isChecked: boolean
  itemName: string
  historyContext?: {
    listName?: string | null
    storeId?: string | null
    storeName?: string | null
  }
}
type AssignCategoryVariables = { itemId: string; categoryId: string | null }
type UpdateItemVariables = { id: string; name: string; quantity: number | null }
type MutationContext = { previous: Item[] | undefined }
type AddOrIncrementResult = { action: 'added' | 'incremented'; itemId: string }
type ChangeQuantityResult = { action: 'updated' | 'deleted'; quantity: number | null }

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
    mutationFn: async ({ name, quantity, categoryId }) => {
      const { data, error } = await supabase
        .from('list_items')
        .insert({ list_id: listId, name, quantity: quantity ?? 1, category_id: categoryId ?? null })
        .select('id, list_id, name, quantity, is_checked, checked_at, sort_order, category_id, created_at')
        .single()
      if (error) throw error
      return data as Item
    },
    onMutate: async ({ name, quantity, categoryId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Item[]>(queryKey)
      queryClient.setQueryData<Item[]>(queryKey, (old = []) => [
        ...old,
        {
          id: crypto.randomUUID(),
          list_id: listId,
          name,
          quantity: quantity ?? 1,
          is_checked: false,
          checked_at: null,
          sort_order: 0,
          category_id: categoryId ?? null,
          created_at: new Date().toISOString(),
        },
      ])
      return { previous }
    },
    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: rememberedItemsBaseKey(listId) })
    },
  }))
}

export function createAddOrIncrementItemMutation(supabase: SupabaseClient) {
  const queryClient = useQueryClient()

  return createMutation<AddOrIncrementResult, Error, AddOrIncrementItemVariables>(() => ({
    mutationFn: async ({ listId, name, amount = 1, categoryId }) => {
      const trimmedName = name.trim()
      const normalizedName = trimmedName.toLowerCase()

      const { data: existingItems, error: existingError } = await supabase
        .from('list_items')
        .select('id, name, quantity, is_checked')
        .eq('list_id', listId)

      if (existingError) throw existingError

      const matchingItems = (existingItems ?? []).filter(
        (item) => item.name.trim().toLowerCase() === normalizedName
      )
      const existingItem = matchingItems.find((item) => !item.is_checked)

      if (existingItem) {
        const nextQuantity = (existingItem.quantity ?? 1) + amount
        const { error: updateError } = await supabase
          .from('list_items')
          .update({ quantity: nextQuantity })
          .eq('id', existingItem.id)

        if (updateError) throw updateError

        return { action: 'incremented', itemId: existingItem.id }
      }

      const { data: insertedItem, error: insertError } = await supabase
        .from('list_items')
        .insert({
          list_id: listId,
          name: trimmedName,
          quantity: amount,
          category_id: categoryId ?? null,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      return { action: 'added', itemId: insertedItem.id }
    },
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: itemsQueryKey(variables.listId) })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      queryClient.invalidateQueries({ queryKey: rememberedItemsBaseKey(variables.listId) })
    },
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: rememberedItemsBaseKey(listId) })
    },
  }))
}

export function createChangeQuantityMutation(supabase: SupabaseClient, listId: string) {
  const queryClient = useQueryClient()
  const queryKey = itemsQueryKey(listId)

  return createMutation<ChangeQuantityResult, Error, ChangeQuantityVariables, MutationContext>(() => ({
    mutationFn: async ({ id, currentQuantity, delta }) => {
      const nextQuantity = Math.max((currentQuantity ?? 1) + delta, 0)

      if (nextQuantity < 1) {
        const { error } = await supabase.from('list_items').delete().eq('id', id)
        if (error) throw error
        return { action: 'deleted', quantity: null }
      }

      const { error } = await supabase.from('list_items').update({ quantity: nextQuantity }).eq('id', id)
      if (error) throw error

      return { action: 'updated', quantity: nextQuantity }
    },
    onMutate: async ({ id, currentQuantity, delta }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Item[]>(queryKey)
      const nextQuantity = Math.max((currentQuantity ?? 1) + delta, 0)

      queryClient.setQueryData<Item[]>(queryKey, (old = []) => {
        if (nextQuantity < 1) {
          return old.filter((item) => item.id !== id)
        }

        return old.map((item) => (item.id === id ? { ...item, quantity: nextQuantity } : item))
      })

      return { previous }
    },
    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: rememberedItemsBaseKey(listId) })
    },
  }))
}

export function createCheckOffMutation(supabase: SupabaseClient, listId: string, userId: string) {
  const queryClient = useQueryClient()
  const queryKey = itemsQueryKey(listId)

  async function enqueueToggle(itemId: string, isChecked: boolean, itemName: string) {
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
  }

  async function runOnlineToggle(
    itemId: string,
    isChecked: boolean,
    itemName: string,
    historyContext?: ToggleItemVariables['historyContext']
  ) {
    const timestamp = new Date().toISOString()

    const { error: itemError } = await supabase
      .from('list_items')
      .update({
        is_checked: isChecked,
        checked_at: isChecked ? timestamp : null,
      })
      .eq('id', itemId)
    if (itemError) throw itemError

    if (isChecked) {
      const { error: histError } = await supabase.from('item_history').insert({
        list_id: listId,
        item_id: itemId,
        item_name: itemName,
        checked_by: userId,
        checked_at: timestamp,
        list_name: historyContext?.listName ?? null,
        store_id: historyContext?.storeId ?? null,
        store_name: historyContext?.storeName ?? null,
      })
      if (histError) throw histError
    }
  }

  async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('offline-toggle-timeout')), timeoutMs)
        }),
      ])
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  return createMutation<boolean, Error, ToggleItemVariables, MutationContext>(() => ({
    mutationFn: async ({ itemId, isChecked, itemName, historyContext }) => {
      if (isOfflineMode()) {
        await enqueueToggle(itemId, isChecked, itemName)
        return true
      }

      try {
        await runWithTimeout(runOnlineToggle(itemId, isChecked, itemName, historyContext), 5_000)
        return false
      } catch (error) {
        void error
        await enqueueToggle(itemId, isChecked, itemName)
        return true
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
    onSettled: (queued) => {
      if (!queued && !isOfflineMode()) {
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: rememberedItemsBaseKey(listId) })
    },
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: rememberedItemsBaseKey(listId) })
    },
  }))
}
