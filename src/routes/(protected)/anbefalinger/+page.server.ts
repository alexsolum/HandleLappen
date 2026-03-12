import type { PageServerLoad } from './$types'
import { createHistoryQuery } from '$lib/queries/history'
import { createRecommendationsQuery } from '$lib/queries/recommendations'

export const load: PageServerLoad = async ({ locals, url }) => {
  const activeListId = url.searchParams.get('list')
  const [historyGroups, recommendations] = await Promise.all([
    createHistoryQuery(locals.supabase),
    createRecommendationsQuery(locals.supabase, activeListId),
  ])

  return {
    historyGroups,
    recommendations,
  }
}
