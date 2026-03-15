import { createMutation } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'
import {
  isBarcodeLookupDto,
  mapBarcodeLookupResult,
  type BarcodeCategoryOption,
  type BarcodeLookupDto,
  type BarcodeSheetModel,
} from '$lib/barcode/lookup'

export type {
  BarcodeCategoryOption,
  BarcodeLookupDto,
  BarcodeSheetModel,
} from '$lib/barcode/lookup'

export { mapBarcodeLookupResult, resolveCanonicalCategoryId } from '$lib/barcode/lookup'

export function createBarcodeLookupMutation(
  supabase: SupabaseClient,
  options: {
    listId: string
    getCategories: () => BarcodeCategoryOption[]
  }
) {
  return createMutation<BarcodeSheetModel, Error, { ean: string }>(() => ({
    mutationFn: async ({ ean }) => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Du må logge inn på nytt for å søke opp strekkoder')
      }

      // Use native fetch directly to ensure Authorization header is not stripped
      // by the SvelteKit-enhanced fetch that supabase.functions.invoke() uses internally
      const response = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/barcode-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ ean, listId: options.listId }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error((errorBody as { message?: string }).message ?? `Barcode lookup failed (${response.status})`)
      }

      const data: unknown = await response.json()

      if (!isBarcodeLookupDto(data)) {
        throw new Error('Unexpected barcode lookup response')
      }

      return mapBarcodeLookupResult(data, options.getCategories())
    },
  }))
}
