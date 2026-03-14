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

async function getMyHouseholdId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc('my_household_id')
  if (error) throw error
  return data
}
