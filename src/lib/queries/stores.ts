import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { categoriesQueryKey, storeLayoutQueryKey } from '$lib/queries/categories'

type StoreRow = {
  id: string
  chain: string | null
  location_name: string
  lat: number | null
  lng: number | null
  created_at: string
}

type CategoryRow = {
  id: string
  name: string
  position: number
  household_id: string
}

type CreateStoreVariables = { chain: string | null; location_name: string }
type DeleteStoreVariables = { id: string }
type UpdateStoreVariables = {
  id: string
  chain: string | null
  location_name: string
  lat: number | null
  lng: number | null
}
type CreateCategoryVariables = { name: string }
type UpdateCategoryVariables = { id: string; name: string }
type DeleteCategoryVariables = { id: string }
type ReorderVariables = { categories: Array<{ id: string }> }
type CategoryMutationContext = { previous: CategoryRow[] | undefined }

export function storesQueryKey(householdId: string) {
  return ['stores', householdId]
}

export function createStoresQuery(supabase: SupabaseClient, householdId: string) {
  return createQuery(() => ({
    queryKey: storesQueryKey(householdId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, chain, location_name, lat, lng, created_at')
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as StoreRow[]
    },
  }))
}

export function createStoreMutation(supabase: SupabaseClient, householdId: string) {
  const queryClient = useQueryClient()
  const storeQueryKey = storesQueryKey(householdId)

  return createMutation<StoreRow, Error, CreateStoreVariables>(() => ({
    mutationFn: async ({ chain, location_name }) => {
      const { data: store, error } = await supabase
        .from('stores')
        .insert({ household_id: householdId, chain, location_name: location_name.trim() })
        .select('id, chain, location_name, lat, lng, created_at')
        .single()

      if (error) throw error

      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, position')
        .eq('household_id', householdId)
        .order('position', { ascending: true })

      if (categoriesError) throw categoriesError

      if ((categories ?? []).length > 0) {
        const rows = (categories ?? []).map((category, index) => ({
          store_id: store.id,
          category_id: category.id,
          position: (index + 1) * 10,
        }))

        const { error: layoutError } = await supabase.from('store_layouts').insert(rows)
        if (layoutError) throw layoutError
      }

      return store as StoreRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeQueryKey })
    },
  }))
}

export function deleteStoreMutation(supabase: SupabaseClient, householdId: string) {
  const queryClient = useQueryClient()
  const storeQueryKey = storesQueryKey(householdId)

  return createMutation<void, Error, DeleteStoreVariables>(() => ({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('stores').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: storeQueryKey })
      queryClient.removeQueries({ queryKey: storeLayoutQueryKey(variables.id) })
    },
  }))
}

export function updateStoreMutation(supabase: SupabaseClient, householdId: string) {
  const queryClient = useQueryClient()
  return createMutation<void, Error, UpdateStoreVariables>(() => ({
    mutationFn: async ({ id, chain, location_name, lat, lng }) => {
      const { error } = await supabase
        .from('stores')
        .update({ chain, location_name: location_name.trim(), lat, lng })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKey(householdId) })
    },
  }))
}

export function createCategoryMutation(supabase: SupabaseClient, householdId: string) {
  const queryClient = useQueryClient()
  const queryKey = categoriesQueryKey(householdId)

  return createMutation<CategoryRow, Error, CreateCategoryVariables>(() => ({
    mutationFn: async ({ name }) => {
      const previousCategories = ((queryClient.getQueryData(queryKey) as CategoryRow[] | undefined) ?? [])
      const nextPosition = (previousCategories.at(-1)?.position ?? 0) + 10

      const { data: category, error } = await supabase
        .from('categories')
        .insert({ household_id: householdId, name: name.trim(), position: nextPosition })
        .select('id, name, position, household_id')
        .single()

      if (error) throw error

      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('household_id', householdId)

      if (storesError) throw storesError

      const storeIds = (stores ?? []).map((store) => store.id)
      if (storeIds.length > 0) {
        const { data: layouts, error: layoutsError } = await supabase
          .from('store_layouts')
          .select('store_id, position')
          .in('store_id', storeIds)
          .order('position', { ascending: true })

        if (layoutsError) throw layoutsError

        const maxByStore = new Map<string, number>()
        for (const layout of layouts ?? []) {
          const currentMax = maxByStore.get(layout.store_id) ?? 0
          maxByStore.set(layout.store_id, Math.max(currentMax, layout.position ?? 0))
        }

        const inserts = storeIds.map((storeId) => ({
          store_id: storeId,
          category_id: category.id,
          position: (maxByStore.get(storeId) ?? 0) + 10,
        }))

        const { error: insertLayoutsError } = await supabase.from('store_layouts').insert(inserts)
        if (insertLayoutsError) throw insertLayoutsError
      }

      return category as CategoryRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  }))
}

export function updateCategoryMutation(supabase: SupabaseClient, householdId: string) {
  const queryClient = useQueryClient()
  const queryKey = categoriesQueryKey(householdId)

  return createMutation<void, Error, UpdateCategoryVariables, CategoryMutationContext>(() => ({
    mutationFn: async ({ id, name }) => {
      const { error } = await supabase.from('categories').update({ name: name.trim() }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<CategoryRow[]>(queryKey)
      queryClient.setQueryData<CategoryRow[]>(queryKey, (old = []) =>
        old.map((category) =>
          category.id === id ? { ...category, name: name.trim() } : category
        )
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  }))
}

export function deleteCategoryMutation(supabase: SupabaseClient, householdId: string) {
  const queryClient = useQueryClient()
  const queryKey = categoriesQueryKey(householdId)

  return createMutation<void, Error, DeleteCategoryVariables>(() => ({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  }))
}

export function reorderDefaultCategoriesMutation(supabase: SupabaseClient, householdId: string) {
  const queryClient = useQueryClient()
  const queryKey = categoriesQueryKey(householdId)

  return createMutation<void, Error, ReorderVariables>(() => ({
    mutationFn: async ({ categories }) => {
      const updates = categories.map((category, index) => ({
        id: category.id,
        position: (index + 1) * 10,
      }))

      const { error } = await supabase.from('categories').upsert(updates)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  }))
}

export function reorderStoreCategoriesMutation(
  supabase: SupabaseClient,
  storeId: string,
  householdId: string
) {
  const queryClient = useQueryClient()
  const queryKey = storeLayoutQueryKey(storeId)

  return createMutation<void, Error, ReorderVariables>(() => ({
    mutationFn: async ({ categories }) => {
      const updates = categories.map((category, index) => ({
        store_id: storeId,
        category_id: category.id,
        position: (index + 1) * 10,
      }))

      const { error } = await supabase
        .from('store_layouts')
        .upsert(updates, { onConflict: 'store_id,category_id' })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: storesQueryKey(householdId) })
    },
  }))
}
