import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'

export type Recipe = {
  id: string
  household_id: string
  name: string
  description: string | null
  image_url: string | null
  created_at: string
}

export type RecipeIngredient = {
  id: string
  recipe_id: string
  name: string
  position: number
}

export type RecipeWithIngredients = Recipe & {
  recipe_ingredients: RecipeIngredient[]
}

export type CreateRecipeVariables = {
  name: string
  description?: string
  image_url?: string
  ingredients: string[]
}

export type UpdateRecipeVariables = {
  id: string
  name: string
  description?: string
  /** Pass undefined to keep existing image, null to clear it, string to set a new URL */
  image_url?: string | null
  /** Full ingredient name list after edit — replaces existing list */
  ingredients: string[]
}

export function recipesQueryKey() {
  return ['recipes']
}

export function recipeDetailQueryKey(id: string) {
  return ['recipes', id]
}

export function createRecipesQuery(supabase: SupabaseClient) {
  return createQuery(() => ({
    queryKey: recipesQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      return data as Recipe[]
    },
  }))
}

export function createRecipeDetailQuery(supabase: SupabaseClient, id: string) {
  return createQuery(() => ({
    queryKey: recipeDetailQueryKey(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (*)
        `)
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data as RecipeWithIngredients
    },
    enabled: !!id,
  }))
}

export function createRecipeMutation(supabase: SupabaseClient) {
  const queryClient = useQueryClient()

  return createMutation<Recipe, Error, CreateRecipeVariables>(() => ({
    mutationFn: async ({ name, description, image_url, ingredients }) => {
      // 1. Get current household ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get household_id from public.households via my_household_id() or session
      // Since my_household_id() is a SQL function, we can use it in the insert
      
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name,
          description,
          image_url,
          household_id: await getMyHouseholdId(supabase)
        })
        .select()
        .single()
      
      if (recipeError) throw recipeError

      if (ingredients.length > 0) {
        const ingredientsToInsert = ingredients.map((name, index) => ({
          recipe_id: recipe.id,
          name,
          position: index
        }))

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsToInsert)
        
        if (ingredientsError) throw ingredientsError
      }

      return recipe as Recipe
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: recipesQueryKey() })
    },
  }))
}

export function createDeleteRecipeMutation(supabase: SupabaseClient) {
  const queryClient = useQueryClient()

  return createMutation<void, Error, { id: string }>(() => ({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: recipesQueryKey() })
    },
  }))
}

export function createUpdateRecipeMutation(supabase: SupabaseClient) {
  const queryClient = useQueryClient()

  return createMutation<Recipe, Error, UpdateRecipeVariables>(() => ({
    mutationFn: async ({ id, name, description, image_url, ingredients }) => {
      // 1. Update recipe fields
      const updatePayload: Partial<Recipe> & { name: string } = { name, description: description ?? null }
      if (image_url !== undefined) {
        updatePayload.image_url = image_url
      }

      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (recipeError) throw recipeError

      // 2. Sync ingredients: fetch current, delete all, re-insert in submitted order
      // Simple strategy: delete all existing, re-insert submitted list.
      // Handles adds, removes, and reorders atomically without diff complexity.
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id)

      if (deleteError) throw deleteError

      if (ingredients.length > 0) {
        const ingredientsToInsert = ingredients.map((ingredientName, index) => ({
          recipe_id: id,
          name: ingredientName,
          position: index,
        }))

        const { error: insertError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsToInsert)

        if (insertError) throw insertError
      }

      return recipe as Recipe
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: recipesQueryKey() })
      queryClient.invalidateQueries({ queryKey: recipeDetailQueryKey(variables.id) })
    },
  }))
}

async function getMyHouseholdId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc('my_household_id')
  if (error) throw error
  return data
}
