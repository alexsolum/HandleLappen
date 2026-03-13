import type { PageServerLoad } from './$types'
import { createHistoryQuery } from '$lib/queries/history'

export const load: PageServerLoad = async ({ locals }) => {
  const historyGroups = await createHistoryQuery(locals.supabase)

  return {
    historyGroups,
  }
}
