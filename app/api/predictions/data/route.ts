import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BDL_HEADERS = {
  'Authorization': process.env.BALLDONTLIE_API_KEY ?? '',
}

const FOOTBALL_DATA_HEADERS = {
  'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY ?? '',
}

// All supported football-data.org league codes
const FOOTBALL_DATA_LEAGUES: Record<string, string> = {
  EPL: 'PL',
  UCL: 'CL',
  UEL: 'EL',
  ELC: 'ELC',
  PD: 'PD',
  BL1: 'BL1',
  SA: 'SA',
  FL1: 'FL1',
  DED: 'DED',
  PPL: 'PPL',
  WC: 'WC',
  AFCON: 'CAN',
}

// ─── Safe BDL fetch (handles rate-limit plain-text responses) ─────────────────
async function safeBDLFetch(url: string): Promise<any> {
  const res = await fetch(url, { headers: BDL_HEADERS })
  const text = await res.text()
  if (!res.ok || !text.startsWith('{')) {
    console.warn(`[BDL] Non-JSON response (${res.status}):`, text.slice(0, 100))
    return { data: [] }
  }
  return JSON.parse(text)
}

// ─── NBA (BallDontLie) ────────────────────────────────────────────────────────
async function fetchNBAGames() {
  const now = new Date()
  const past = new Date(now); past.setDate(now.getDate() - 7)
  const future = new Date(now); future.setDate(now.getDate() + 14)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  // Sequential fetches to avoid parallel rate-limit hits
  const upcomingJson = await safeBDLFetch(
    `https://api.balldontlie.io/v1/games?per_page=6&start_date=${fmt(now)}&end_date=${fmt(future)}`
  )
  await new Promise(r => setTimeout(r, 300))
  const recentJson = await safeBDLFetch(
    `https://api.balldontlie.io/v1/games?per_page=6&start_date=${fmt(past)}&end_date=${fmt(now)}`
  )

  let games = [...(upcomingJson.data ?? []), ...(recentJson.data ?? [])]

  if (games.length === 0) {
    await new Promise(r => setTimeout(r, 300))
    const fallbackJson = await safeBDLFetch('https://api.balldontlie.io/v1/games?per_page=12&seasons[]=2024')
    games = fallbackJson.data ?? []
  }

  // Deduplicate by game ID
  const seen = new Set<number>()
  games = games.filter((g: any) => {
    if (seen.has(g.id)) return false
    seen.add(g.id)
    return true
  })

  const teamMap: Record<number, any> = {}
  const normalised = games.map((g: any) => {
    const ht = g.home_team
    const at = g.visitor_team
    if (ht) teamMap[ht.id] = { id: String(ht.id), name: ht.full_name, abbreviation: ht.abbreviation, wins: '0', losses: '0' }
    if (at) teamMap[at.id] = { id: String(at.id), name: at.full_name, abbreviation: at.abbreviation, wins: '0', losses: '0' }
    const status = g.status === 'Final' ? 'Final' : typeof g.status === 'string' && /Qtr|Halftime|OT/i.test(g.status) ? 'Live' : 'Scheduled'
    return { id: g.id, home_team_id: String(ht?.id ?? ''), away_team_id: String(at?.id ?? ''), date: g.date, venue: ht?.city ?? '', status }
  })

  return { games: normalised.filter((g: any) => g.status !== 'Final'), teams: Object.values(teamMap) }
}

// ─── MBA (Supabase) ───────────────────────────────────────────────────────────
async function fetchMBAGames() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const now = new Date().toISOString()

  const { data: games, error: gamesError } = await supabase
    .from('games').select('*').gte('date', now).order('date', { ascending: true }).limit(12)
  if (gamesError) throw new Error(gamesError.message)

  const { data: teams, error: teamsError } = await supabase
    .from('teams').select('id, name, abbreviation, wins, losses')
  if (teamsError) throw new Error(teamsError.message)

  return {
    games: (games ?? []).map((g: any) => ({
      id: g.id, home_team_id: String(g.home_team_id), away_team_id: String(g.away_team_id),
      date: g.date, venue: g.venue ?? '', status: g.status ?? 'Scheduled',
    })).filter((g: any) => g.status !== 'Final'),
    teams: (teams ?? []).map((t: any) => ({
      id: String(t.id), name: t.name,
      abbreviation: t.abbreviation ?? t.name?.slice(0, 3).toUpperCase(),
      wins: String(t.wins ?? 0), losses: String(t.losses ?? 0),
    })),
  }
}

// ─── Football (all football-data.org leagues) ─────────────────────────────────
async function fetchFootballGames(leagueCode: string) {
  const competitionId = FOOTBALL_DATA_LEAGUES[leagueCode]
  if (!competitionId) throw new Error(`Unknown football league: ${leagueCode}`)

  const mapMatch = (m: any, status: 'Scheduled' | 'Final') => {
    const ht = m.homeTeam
    const at = m.awayTeam
    return {
      match: {
        id: m.id,
        home_team_id: String(ht?.id ?? ''),
        away_team_id: String(at?.id ?? ''),
        date: m.utcDate,
        venue: m.venue ?? ht?.name ?? '',
        status,
      },
      homeTeam: ht ? { id: String(ht.id), name: ht.name ?? ht.shortName, abbreviation: ht.tla ?? ht.shortName?.slice(0, 3).toUpperCase() ?? '???', wins: '0', losses: '0' } : null,
      awayTeam: at ? { id: String(at.id), name: at.name ?? at.shortName, abbreviation: at.tla ?? at.shortName?.slice(0, 3).toUpperCase() ?? '???', wins: '0', losses: '0' } : null,
    }
  }

  // Fetch both scheduled and finished in parallel
  const [scheduledRes, finishedRes] = await Promise.all([
    fetch(`https://api.football-data.org/v4/competitions/${competitionId}/matches?status=SCHEDULED`, { headers: FOOTBALL_DATA_HEADERS }),
    fetch(`https://api.football-data.org/v4/competitions/${competitionId}/matches?status=FINISHED`, { headers: FOOTBALL_DATA_HEADERS }),
  ])

  const [scheduledJson, finishedJson] = await Promise.all([scheduledRes.json(), finishedRes.json()])

  const teamMap: Record<string, any> = {}
  const games: any[] = []

  // Add upcoming scheduled matches first
  const scheduledMatches = (scheduledJson.matches ?? []).slice(0, 6)
  scheduledMatches.forEach((m: any) => {
    const { match, homeTeam, awayTeam } = mapMatch(m, 'Scheduled')
    games.push(match)
    if (homeTeam) teamMap[homeTeam.id] = homeTeam
    if (awayTeam) teamMap[awayTeam.id] = awayTeam
  })

  // If no scheduled, use last 6 finished matches for AI predictions
  const finishedMatches = (finishedJson.matches ?? []).slice(-6).reverse()
  if (scheduledMatches.length === 0) {
    finishedMatches.forEach((m: any) => {
      const { match, homeTeam, awayTeam } = mapMatch(m, 'Final')
      games.push({ ...match, status: 'Scheduled' })
      if (homeTeam) teamMap[homeTeam.id] = homeTeam
      if (awayTeam) teamMap[awayTeam.id] = awayTeam
    })
  }

  return { games, teams: Object.values(teamMap) }
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const league = (searchParams.get('league') ?? 'MBA').toUpperCase()

  try {
    let result: { games: any[]; teams: any[] }

    if (league === 'NBA') {
      if (!process.env.BALLDONTLIE_API_KEY) return NextResponse.json({ error: 'BALLDONTLIE_API_KEY not set' }, { status: 500 })
      result = await fetchNBAGames()
    } else if (league === 'MBA') {
      result = await fetchMBAGames()
    } else if (FOOTBALL_DATA_LEAGUES[league]) {
      if (!process.env.FOOTBALL_DATA_API_KEY) return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY not set' }, { status: 500 })
      result = await fetchFootballGames(league)
    } else {
      return NextResponse.json({ error: `Unknown league: ${league}` }, { status: 400 })
    }

    console.log(`[predictions/data] league=${league} games=${result.games.length}`)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('predictions/data error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch data' }, { status: 500 })
  }
}