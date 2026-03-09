import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
  const supabase = locals.supabase
  const { user } = await locals.safeGetSession()

  if (!user) throw error(401, 'Ikke innlogget')

  // Validate list belongs to user's household (RLS enforces this, but explicit 404 is better UX)
  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (listError || !list) throw error(404, 'Liste ikke funnet')

  return {
    listId: params.id,
    listName: list.name,
  }
}
