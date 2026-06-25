// app/api/keep-alive/route.ts
// Vercel cron job to ping Supabase every 3 days to prevent pausing

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Lightweight ping — just fetch 1 row from any table
    const { error } = await supabase.from('teams').select('id').limit(1)

    if (error) throw error

    return NextResponse.json({ status: 'ok', pinged: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 })
  }
}
