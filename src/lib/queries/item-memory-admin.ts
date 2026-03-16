import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ItemMemoryEntry = {
  id: string
  display_name: string
  last_category_id: string | null
  last_used_at: string
  use_count: number
  brand?: string | null
  product_image_url?: string | null
}

type UpdateItemMemoryVariables = {
  itemId: string
  displayName: string
  categoryId: string | null
  brand?: string | null
  imageUrl?: string | null
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
        .select('id, display_name, last_category_id, last_used_at, use_count, brand, product_image_url')
        .order('display_name', { ascending: true })

      if (error) throw error
      return (data ?? []) as ItemMemoryEntry[]
    },
  }))
}

export function createUpdateItemMemoryMutation(supabase: SupabaseClient) {
  const queryClient = useQueryClient()

  return createMutation<void, Error, UpdateItemMemoryVariables>(() => ({
    mutationFn: async ({ itemId, displayName, categoryId, brand, imageUrl }) => {
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
          brand: brand ?? null,
          product_image_url: imageUrl,
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
