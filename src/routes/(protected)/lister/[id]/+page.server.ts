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

  const { data: homeLocationRow, error: homeLocationError } = await supabase
    .from('user_home_locations')
    .select('lat_4dp, lng_4dp')
    .eq('user_id', user.id)
    .maybeSingle()

  if (homeLocationError) throw error(500, 'Kunne ikke hente hjemmeposisjon')

  return {
    listId: params.id,
    listName: list.name,
    homeLocation: homeLocationRow
      ? {
          lat: Number(homeLocationRow.lat_4dp),
          lng: Number(homeLocationRow.lng_4dp),
        }
      : null,
  }
}
