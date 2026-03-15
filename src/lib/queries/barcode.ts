import { createMutation } from '@tanstack/svelte-query'
import type { SupabaseClient } from '@supabase/supabase-js'
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

      const { data, error } = await supabase.functions.invoke('barcode-lookup', {
        body: { ean, listId: options.listId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (error) {
        throw error
      }

      if (!isBarcodeLookupDto(data)) {
        throw new Error('Unexpected barcode lookup response')
      }

      return mapBarcodeLookupResult(data, options.getCategories())
    },
  }))
}
