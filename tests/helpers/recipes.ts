import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/types/database'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function getAdminClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin test helpers')
  }

  return createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function createTestRecipe(householdId: string, name: string, description?: string) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('recipes')
    .insert({
      household_id: householdId,
      name,
      description,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addTestIngredient(recipeId: string, name: string, position: number = 0) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('recipe_ingredients')
    .insert({
      recipe_id: recipeId,
      name,
      position,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTestRecipe(recipeId: string) {
  const admin = getAdminClient()
  const { error } = await admin.from('recipes').delete().eq('id', recipeId)
  if (error) throw error
}
