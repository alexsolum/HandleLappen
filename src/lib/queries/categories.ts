import { createQuery } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'

type CategoryRow = {
  id: string
  name: string
  position: number
  household_id: string
}

type StoreLayoutRow = {
  position: number
  category_id: string
  categories: { id: string; name: string } | { id: string; name: string }[] | null
}

export function categoriesQueryKey(householdId: string) {
  return ['categories', householdId]
}

export function storeLayoutQueryKey(storeId: string) {
  return ['store-layout', storeId]
}

export function createCategoriesQuery(supabase: SupabaseClient, householdId: string) {
  return createQuery(() => ({
    queryKey: categoriesQueryKey(householdId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, position, household_id')
        .order('position', { ascending: true })

      if (error) throw error
      return (data ?? []) as CategoryRow[]
    },
  }))
}

export function createStoreLayoutQuery(supabase: SupabaseClient, storeId: string | null) {
  return createQuery(() => ({
    queryKey: storeLayoutQueryKey(storeId ?? ''),
    enabled: storeId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_layouts')
        .select('position, category_id, categories(id, name)')
        .eq('store_id', storeId!)
        .order('position', { ascending: true })

      if (error) throw error

      return ((data ?? []) as StoreLayoutRow[]).map((row) => {
        const category = Array.isArray(row.categories) ? row.categories[0] : row.categories

        return {
          id: row.category_id,
          name: category?.name ?? '',
          position: row.position,
        }
      })
    },
  }))
}
