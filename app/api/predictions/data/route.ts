import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BDL_HEADERS = { 'Authorization': process.env.BALLDONTLIE_API_KEY ?? '' }
const FD_HEADERS = { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY ?? '' }

const FOOTBALL_DATA_LEAGUES: Record<string, string> = {
  EPL: 'PL', UCL: 'CL', UEL: 'EL', ELC: 'ELC', PD: 'PD',
  BL1: 'BL1', SA: 'SA', FL1: 'FL1', DED: 'DED', PPL: 'PPL',
  WC: 'WC', AFCON: 'CAN',
}

async function safeBDLFetch(url: string): Promise<any> {
  const res = await fetch(url, { headers: BDL_HEADERS })
  const text = await res.text()
  if (!res.ok || !text.startsWith('{')) return { data: [] }
  return JSON.parse(text)
}

// ─── NBA ──────────────────────────────────────────────────────────────────────
async function fetchNBAGames() {
  const now = new Date()
  const future = new Date(now); future.setDate(now.getDate() + 14)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  let games = (await safeBDLFetch(
    `https://api.balldontlie.io/v1/games?per_page=12&start_date=${fmt(now)}&end_date=${fmt(future)}`
  )).data ?? []

  const seen = new Set<number>()
  games = games.filter((g: any) => { if (seen.has(g.id)) return false; seen.add(g.id); return true })

  const teamMap: Record<number, any> = {}
  const normalised = games.map((g: any) => {
    const ht = g.home_team; const at = g.visitor_team
    if (ht) teamMap[ht.id] = { id: String(ht.id), name: ht.full_name, abbreviation: ht.abbreviation, wins: '0', losses: '0' }
    if (at) teamMap[at.id] = { id: String(at.id), name: at.full_name, abbreviation: at.abbreviation, wins: '0', losses: '0' }
    const status = g.status === 'Final' ? 'Final' : /Qtr|Halftime|OT/i.test(g.status ?? '') ? 'Live' : 'Scheduled'
    return { id: g.id, home_team_id: String(ht?.id ?? ''), away_team_id: String(at?.id ?? ''), date: g.date, venue: ht?.city ?? '', status }
  })
  return { games: normalised.filter((g: any) => g.status !== 'Final'), teams: Object.values(teamMap) }
}

// ─── MBA ──────────────────────────────────────────────────────────────────────
async function fetchMBAGames() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const now = new Date().toISOString()
  const { data: games, error: gE } = await supabase.from('games').select('*').gte('date', now).order('date', { ascending: true }).limit(12)
  if (gE) throw new Error(gE.message)
  const { data: teams, error: tE } = await supabase.from('teams').select('id, name, abbreviation, wins, losses')
  if (tE) throw new Error(tE.message)
  return {
    games: (games ?? []).map((g: any) => ({ id: g.id, home_team_id: String(g.home_team_id), away_team_id: String(g.away_team_id), date: g.date, venue: g.venue ?? '', status: g.status ?? 'Scheduled' })).filter((g: any) => g.status !== 'Final'),
    teams: (teams ?? []).map((t: any) => ({ id: String(t.id), name: t.name, abbreviation: t.abbreviation ?? t.name?.slice(0, 3).toUpperCase(), wins: String(t.wins ?? 0), losses: String(t.losses ?? 0) })),
  }
}

// ─── Compute team records from finished matches ───────────────────────────────
function computeRecords(finishedMatches: any[]): Record<string, { wins: number; losses: number; draws: number; played: number }> {
  const records: Record<string, { wins: number; losses: number; draws: number; played: number }> = {}

  const ensure = (id: string) => {
    if (!records[id]) records[id] = { wins: 0, losses: 0, draws: 0, played: 0 }
  }

  for (const m of finishedMatches) {
    const homeId = String(m.homeTeam?.id ?? '')
    const awayId = String(m.awayTeam?.id ?? '')
    if (!homeId || !awayId) continue

    const homeGoals = m.score?.fullTime?.home ?? m.score?.fullTime?.homeTeam ?? null
    const awayGoals = m.score?.fullTime?.away ?? m.score?.fullTime?.awayTeam ?? null

    if (homeGoals === null || awayGoals === null) continue

    ensure(homeId); ensure(awayId)
    records[homeId].played++
    records[awayId].played++

    if (homeGoals > awayGoals) {
      records[homeId].wins++
      records[awayId].losses++
    } else if (awayGoals > homeGoals) {
      records[awayId].wins++
      records[homeId].losses++
    } else {
      records[homeId].draws++
      records[awayId].draws++
    }
  }

  return records
}

// ─── Try standings endpoint first, fall back to computed records ──────────────
async function fetchTeamRecords(competitionId: string): Promise<Record<string, { wins: string; losses: string; draws: string; played: string }>> {
  // Try standings first
  try {
    const res = await fetch(`https://api.football-data.org/v4/competitions/${competitionId}/standings`, { headers: FD_HEADERS })
    if (res.ok) {
      const json = await res.json()
      const tables = json.standings ?? []
      const map: Record<string, any> = {}

      for (const table of tables) {
        for (const entry of table.standings ?? []) {
          const id = String(entry.team?.id)
          if (id && !map[id]) {
            map[id] = {
              wins: String(entry.won ?? 0),
              losses: String(entry.lost ?? 0),
              draws: String(entry.draw ?? 0),
              played: String(entry.playedGames ?? 0),
            }
          }
        }
      }

      // Only use if we got real data (at least some team has played games)
      const hasRealData = Object.values(map).some((r: any) => Number(r.played) > 0)
      if (hasRealData) {
        console.log(`[standings] Got real data for ${Object.keys(map).length} teams`)
        return map
      }
    }
  } catch (e) {
    console.warn('[standings] Failed, falling back to match results:', e)
  }

  // Fall back: compute from finished match results
  try {
    const res = await fetch(`https://api.football-data.org/v4/competitions/${competitionId}/matches?status=FINISHED`, { headers: FD_HEADERS })
    if (!res.ok) return {}
    const json = await res.json()
    const computed = computeRecords(json.matches ?? [])
    console.log(`[computed records] Built records for ${Object.keys(computed).length} teams from ${json.matches?.length ?? 0} matches`)
    return Object.fromEntries(
      Object.entries(computed).map(([id, r]) => [id, {
        wins: String(r.wins),
        losses: String(r.losses),
        draws: String(r.draws),
        played: String(r.played),
      }])
    )
  } catch (e) {
    console.warn('[computed records] Failed:', e)
    return {}
  }
}

// ─── Football ─────────────────────────────────────────────────────────────────
async function fetchFootballGames(leagueCode: string) {
  const competitionId = FOOTBALL_DATA_LEAGUES[leagueCode]
  if (!competitionId) throw new Error(`Unknown football league: ${leagueCode}`)

  // Fetch scheduled matches and team records in parallel
  const [scheduledRes, teamRecords] = await Promise.all([
    fetch(`https://api.football-data.org/v4/competitions/${competitionId}/matches?status=SCHEDULED`, { headers: FD_HEADERS }),
    fetchTeamRecords(competitionId),
  ])

  const scheduledJson = await scheduledRes.json()
  const teamMap: Record<string, any> = {}
  const games: any[] = []

  const scheduledMatches = (scheduledJson.matches ?? []).slice(0, 8)
  for (const m of scheduledMatches) {
    const ht = m.homeTeam; const at = m.awayTeam
    games.push({
      id: m.id,
      home_team_id: String(ht?.id ?? ''),
      away_team_id: String(at?.id ?? ''),
      date: m.utcDate,
      venue: m.venue ?? ht?.name ?? '',
      status: 'Scheduled',
    })
    if (ht) teamMap[String(ht.id)] = {
      id: String(ht.id),
      name: ht.name ?? ht.shortName,
      abbreviation: ht.tla ?? ht.shortName?.slice(0, 3).toUpperCase() ?? '???',
      wins: '0', losses: '0', draws: '0', played: '0',
    }
    if (at) teamMap[String(at.id)] = {
      id: String(at.id),
      name: at.name ?? at.shortName,
      abbreviation: at.tla ?? at.shortName?.slice(0, 3).toUpperCase() ?? '???',
      wins: '0', losses: '0', draws: '0', played: '0',
    }
  }

  // Enrich with real records
  for (const teamId of Object.keys(teamMap)) {
    const record = teamRecords[teamId]
    if (record) {
      teamMap[teamId].wins = record.wins
      teamMap[teamId].losses = record.losses
      teamMap[teamId].draws = record.draws
      teamMap[teamId].played = record.played
    }
  }

  console.log(`[football] ${leagueCode}: ${games.length} upcoming games, records for ${Object.keys(teamRecords).length} teams`)
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
