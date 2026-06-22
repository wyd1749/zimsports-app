import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client.
 * Your project uses the public anon client — this file exists so that
 * `import { createClient } from '@/lib/supabase/server'` resolves correctly.
 *
 * Place this file at: lib/supabase/server.ts
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(supabaseUrl, supabaseKey)
}
