/**
 * Database seed script — items catalog
 *
 * Populates the global `items` table with top products from Kassal.
 * Run: npx tsx src/lib/server/db/seed.ts
 *
 * Requires env vars: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional:          KASSAL_API_TOKEN (for authenticated Kassal requests)
 */

import { createClient } from '@supabase/supabase-js'
import { fetchAndEnrichTopProducts } from '../kassal/seed-items.js'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function createAdminClient() {
  // Support both .env and .env.local variable names
  const supabaseUrl =
    process.env.PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    getRequiredEnv('PUBLIC_SUPABASE_URL')

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function seedItems(): Promise<{ imported: number; updated: number; errors: string[] }> {
  console.log('=== Seeding items table ===')

  const supabase = createAdminClient()
  const errors: string[] = []

  // Fetch and enrich products from Kassal
  const products = await fetchAndEnrichTopProducts(100)

  if (products.length === 0) {
    console.warn('No products fetched — items table not modified.')
    return { imported: 0, updated: 0, errors: ['No products fetched from Kassal'] }
  }

  console.log(`Upserting ${products.length} products into items table...`)

  // Upsert in batches to avoid request size limits
  const BATCH_SIZE = 50
  let imported = 0
  let updated = 0

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE)

    const { data, error } = await supabase
      .from('items')
      .upsert(batch, {
        onConflict: 'name',
        ignoreDuplicates: false, // update existing rows with fresh data
      })
      .select('id, name')

    if (error) {
      const msg = `Batch ${i / BATCH_SIZE + 1} upsert failed: ${error.message}`
      console.error(msg)
      errors.push(msg)
      continue
    }

    const batchCount = data?.length ?? batch.length
    imported += batchCount
    console.log(`Batch ${i / BATCH_SIZE + 1}: upserted ${batchCount} products`)
  }

  console.log(`\n=== Seed complete ===`)
  console.log(`Total upserted: ${imported}`)
  if (errors.length > 0) {
    console.warn(`Errors: ${errors.length}`)
    errors.forEach((e) => console.warn(' -', e))
  }

  return { imported, updated, errors }
}

export async function verifySeedData() {
  console.log('\n=== Verifying seed data ===')
  const supabase = createAdminClient()

  const { count, error: countError } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('Count query failed:', countError.message)
    return
  }

  console.log(`Total rows in items table: ${count}`)

  if ((count ?? 0) < 50) {
    console.warn(`WARNING: Expected >= 50 items but found ${count}`)
  } else {
    console.log('Row count check: PASSED (>= 50)')
  }

  // Sample 5 rows
  const { data: sample, error: sampleError } = await supabase
    .from('items')
    .select('name, brand, image_url, category')
    .limit(5)

  if (sampleError) {
    console.error('Sample query failed:', sampleError.message)
    return
  }

  console.log('\nSample rows:')
  sample?.forEach((row, i) => {
    console.log(
      `  ${i + 1}. ${row.name} | brand: ${row.brand ?? '(none)'} | image: ${row.image_url ? 'yes' : 'no'} | category: ${row.category ?? '(none)'}`
    )
  })

  // Check for duplicates
  const { data: dupeCheck, error: dupeError } = await supabase
    .from('items')
    .select('name')

  if (!dupeError && dupeCheck) {
    const names = dupeCheck.map((r) => r.name)
    const unique = new Set(names)
    if (names.length !== unique.size) {
      console.warn(`WARNING: Duplicate names detected (${names.length} rows, ${unique.size} unique)`)
    } else {
      console.log('Duplicate check: PASSED (no duplicates)')
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env' })
  dotenv.config({ path: '.env.local', override: true })

  const result = await seedItems()
  await verifySeedData()

  if (result.errors.length > 0) {
    process.exit(1)
  }
}
