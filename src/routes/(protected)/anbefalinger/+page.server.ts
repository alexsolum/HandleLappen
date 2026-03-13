import type { PageServerLoad } from './$types'
import { createRecommendationsQuery } from '$lib/queries/recommendations'

export const load: PageServerLoad = async ({ locals, url }) => {
  const activeListId = url.searchParams.get('list')
  const recommendations = await createRecommendationsQuery(locals.supabase, activeListId)

  return {
    recommendations,
  }
}
