// app/api/fixtures/route.ts
// Returns all games (upcoming + finished) for a given league
import { NextRequest, NextResponse } from 'next/server'
import { fetchLeagueGames, type LeagueId } from '@/lib/leagues'

export async function GET(req: NextRequest) {
  const league = (req.nextUrl.searchParams.get('league') ?? 'WC').toUpperCase() as LeagueId
  try {
    const games = await fetchLeagueGames(league)
    return NextResponse.json({ games })
  } catch (err: any) {
    return NextResponse.json({ games: [], error: err.message }, { status: 500 })
  }
}
