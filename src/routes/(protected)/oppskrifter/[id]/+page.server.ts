import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, parent }) => {
  const supabase = locals.supabase
  const { user } = await locals.safeGetSession()

  if (!user) throw error(401, 'Ikke innlogget')

  // Validate recipe belongs to user's household (RLS enforces this, but explicit 404 is better UX)
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (recipeError || !recipe) throw error(404, 'Oppskrift ikke funnet')

  // Get householdId from parent layout
  const { householdId } = await parent()

  return {
    recipeId: params.id,
    householdId,
  }
}
