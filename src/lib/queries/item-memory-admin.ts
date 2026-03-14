import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ItemMemoryEntry = {
  id: string
  display_name: string
  normalized_name: string
  last_category_id: string | null
  last_used_at: string
  use_count: number
}

type UpdateItemMemoryVariables = {
  itemId: string
  displayName: string
  categoryId: string | null
}

export function itemMemoryAdminQueryKey() {
  return ['item-memory-admin']
}

function normalizeItemName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function createItemMemoryQuery(supabase: SupabaseClient) {
  return createQuery(() => ({
    queryKey: itemMemoryAdminQueryKey(),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_item_memory')
        .select('id, display_name, normalized_name, last_category_id, last_used_at, use_count')
        .order('display_name', { ascending: true })

      if (error) throw error
      return (data ?? []) as ItemMemoryEntry[]
    },
  }))
}

export function createUpdateItemMemoryMutation(supabase: SupabaseClient) {
  const queryClient = useQueryClient()

  return createMutation<void, Error, UpdateItemMemoryVariables>(() => ({
    mutationFn: async ({ itemId, displayName, categoryId }) => {
      const trimmed = displayName.trim()
      if (!trimmed) {
        throw new Error('Navnet kan ikke være tomt.')
      }

      const normalized = normalizeItemName(trimmed)
      if (!normalized) {
        throw new Error('Navnet kan ikke være tomt.')
      }

      const { error } = await supabase
        .from('household_item_memory')
        .update({
          display_name: trimmed,
          normalized_name: normalized,
          last_category_id: categoryId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)

      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: itemMemoryAdminQueryKey() })
    },
  }))
}
