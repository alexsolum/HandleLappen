import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession()

  if (!user) {
    throw error(401, 'Ikke logget inn')
  }

  const { data, error: homeLocationError } = await supabase
    .from('user_home_locations')
    .select('lat_4dp, lng_4dp')
    .eq('user_id', user.id)
    .maybeSingle()

  if (homeLocationError) {
    throw error(500, 'Kunne ikke hente hjemmeposisjon')
  }

  return {
    homeLocation: data
      ? {
          lat: Number(data.lat_4dp),
          lng: Number(data.lng_4dp),
        }
      : null,
  }
}
