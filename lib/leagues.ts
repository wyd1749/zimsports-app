// lib/leagues.ts

export type LeagueId =
  | 'MBA'
  | 'NBA'
  | 'EPL'
  | 'UCL'
  | 'UEL'
  | 'ELC'
  | 'PD'
  | 'BL1'
  | 'SA'
  | 'FL1'
  | 'DED'
  | 'PPL'
  | 'WC'
  | 'AFCON'
  | 'ZIM'

export interface LeagueConfig {
  id: LeagueId
  name: string
  shortName: string
  sport: 'basketball' | 'football'
  flag: string
  apiSource: 'internal' | 'football-data' | 'balldontlie' | 'api-sports'
  apiCode?: string
  apiSportsId?: number
  group?: 'football'
}

export const LEAGUES: LeagueConfig[] = [
  { id: 'MBA',  name: 'MBA Zimbabwe',            shortName: 'MBA',        sport: 'basketball', flag: '🇿🇼', apiSource: 'internal' },
  { id: 'NBA',  name: 'NBA',                     shortName: 'NBA',        sport: 'basketball', flag: '🏀',  apiSource: 'balldontlie' },
  { id: 'EPL',  name: 'Premier League',          shortName: 'EPL',        sport: 'football',   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', apiSource: 'football-data', apiCode: 'PL',  group: 'football' },
  { id: 'UCL',  name: 'UEFA Champions League',   shortName: 'UCL',        sport: 'football',   flag: '🏆',  apiSource: 'football-data', apiCode: 'CL',  group: 'football' },
  { id: 'UEL',  name: 'UEFA Europa League',      shortName: 'Europa',     sport: 'football',   flag: '🟠',  apiSource: 'football-data', apiCode: 'EL',  group: 'football' },
  { id: 'ELC',  name: 'Championship',            shortName: 'Championship',sport: 'football',  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', apiSource: 'football-data', apiCode: 'ELC', group: 'football' },
  { id: 'PD',   name: 'La Liga',                 shortName: 'La Liga',    sport: 'football',   flag: '🇪🇸', apiSource: 'football-data', apiCode: 'PD',  group: 'football' },
  { id: 'BL1',  name: 'Bundesliga',              shortName: 'Bundesliga', sport: 'football',   flag: '🇩🇪', apiSource: 'football-data', apiCode: 'BL1', group: 'football' },
  { id: 'SA',   name: 'Serie A',                 shortName: 'Serie A',    sport: 'football',   flag: '🇮🇹', apiSource: 'football-data', apiCode: 'SA',  group: 'football' },
  { id: 'FL1',  name: 'Ligue 1',                 shortName: 'Ligue 1',    sport: 'football',   flag: '🇫🇷', apiSource: 'football-data', apiCode: 'FL1', group: 'football' },
  { id: 'DED',  name: 'Eredivisie',              shortName: 'Eredivisie', sport: 'football',   flag: '🇳🇱', apiSource: 'football-data', apiCode: 'DED', group: 'football' },
  { id: 'PPL',  name: 'Primeira Liga',           shortName: 'Primeira',   sport: 'football',   flag: '🇵🇹', apiSource: 'football-data', apiCode: 'PPL', group: 'football' },
  { id: 'WC',   name: 'FIFA World Cup',          shortName: 'World Cup',  sport: 'football',   flag: '🌍',  apiSource: 'football-data', apiCode: 'WC',  group: 'football' },
  { id: 'AFCON',name: 'Africa Cup of Nations',   shortName: 'AFCON',      sport: 'football',   flag: '🌍',  apiSource: 'api-sports',    apiSportsId: 6,   group: 'football' },
  { id: 'ZIM',  name: 'Zimbabwe Premier Soccer League', shortName: 'Zim PSL', sport: 'football', flag: '🇿🇼', apiSource: 'api-sports', apiSportsId: 383, group: 'football' },
]

export const FOOTBALL_LEAGUES = LEAGUES.filter((l) => l.group === 'football')
export const TOP_LEVEL_LEAGUES = LEAGUES.filter((l) => !l.group)

export function getLeague(id: LeagueId): LeagueConfig {
  return LEAGUES.find((l) => l.id === id) ?? LEAGUES[0]
}

export function isFootballLeague(id: LeagueId): boolean {
  return FOOTBALL_LEAGUES.some((l) => l.id === id)
}

// ─── Shared external game shape ───────────────────────────────────────────────
export interface ExternalGame {
  id: string | number
  home_team_short: string
  away_team_short: string
  home_score: number | null
  away_score: number | null
  date: string
  status: 'Scheduled' | 'Live' | 'Final'
  venue?: string
  matchweek?: number
}

// ─── Safe BDL fetch ───────────────────────────────────────────────────────────
async function safeBDLFetch(url: string, bdlKey: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: bdlKey },
    next: { revalidate: 60 },
  })
  const text = await res.text()
  if (!res.ok || !text.startsWith('{')) {
    console.warn(`[BDL] Non-JSON response (${res.status}):`, text.slice(0, 100))
    return { data: [] }
  }
  return JSON.parse(text)
}

// ─── football-data.org fetcher ────────────────────────────────────────────────
async function fetchFootballData(apiCode: string): Promise<ExternalGame[]> {
  const key = process.env.FOOTBALL_DATA_API_KEY
  if (!key) { console.warn('FOOTBALL_DATA_API_KEY not set'); return [] }

  const headers = { 'X-Auth-Token': key }

  const mapMatch = (m: any, status: 'Scheduled' | 'Final'): ExternalGame => ({
    id: m.id,
    home_team_short: m.homeTeam?.shortName ?? m.homeTeam?.name ?? '—',
    away_team_short: m.awayTeam?.shortName ?? m.awayTeam?.name ?? '—',
    home_score: m.score?.fullTime?.home ?? null,
    away_score: m.score?.fullTime?.away ?? null,
    date: m.utcDate,
    status,
    venue: m.venue ?? undefined,
    matchweek: m.matchday ?? undefined,
  })

  try {
    const finishedRes = await fetch(
      `https://api.football-data.org/v4/competitions/${apiCode}/matches?status=FINISHED`,
      { headers, cache: 'no-store' }
    )
    const finishedJson = await finishedRes.json()
    const recent = (finishedJson.matches ?? []).map((m: any) => mapMatch(m, 'Final'))

    const scheduledRes = await fetch(
      `https://api.football-data.org/v4/competitions/${apiCode}/matches?status=SCHEDULED`,
      { headers, next: { revalidate: 60 } }
    )
    const scheduledJson = await scheduledRes.json()
    const upcoming = (scheduledJson.matches ?? []).slice(0, 6).map((m: any) => mapMatch(m, 'Scheduled'))

    return [...upcoming, ...recent]
  } catch (err) {
    console.error(`football-data fetch error for ${apiCode}:`, err)
    return []
  }
}

// ─── API-Sports fetcher (ZIM PSL, AFCON) ──────────────────────────────────────
async function fetchApiSportsFootball(leagueId: number): Promise<ExternalGame[]> {
  const key = process.env.API_SPORTS_KEY
  if (!key) { console.warn('API_SPORTS_KEY not set'); return [] }

  const headers = {
    'x-apisports-key': key,
  }

  const currentYear = new Date().getFullYear()

  const mapFixture = (f: any): ExternalGame => {
    const home = f.teams?.home
    const away = f.teams?.away
    const goals = f.goals
    const fixtureStatus = f.fixture?.status?.short

    let status: 'Scheduled' | 'Live' | 'Final' = 'Scheduled'
    if (['FT', 'AET', 'PEN'].includes(fixtureStatus)) status = 'Final'
    else if (['1H', '2H', 'HT', 'ET', 'P'].includes(fixtureStatus)) status = 'Live'

    return {
      id: f.fixture?.id ?? Math.random(),
      home_team_short: home?.name ?? '—',
      away_team_short: away?.name ?? '—',
      home_score: goals?.home ?? null,
      away_score: goals?.away ?? null,
      date: f.fixture?.date ?? '',
      status,
      venue: f.fixture?.venue?.name ?? undefined,
      matchweek: f.league?.round ? parseInt(f.league.round.replace(/\D/g, '')) || undefined : undefined,
    }
  }

  try {
    // Fetch upcoming fixtures
    const [upcomingRes, recentRes] = await Promise.all([
      fetch(
        `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${currentYear}&status=NS&next=6`,
        { headers, next: { revalidate: 60 } }
      ),
      fetch(
        `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${currentYear}&status=FT&last=10`,
        { headers, next: { revalidate: 60 } }
      ),
    ])

    const [upcomingJson, recentJson] = await Promise.all([
      upcomingRes.json(),
      recentRes.json(),
    ])

    const upcoming = (upcomingJson.response ?? []).map(mapFixture)
    const recent = (recentJson.response ?? []).map(mapFixture)

    // If current season has no data, try previous year
    if (upcoming.length === 0 && recent.length === 0) {
      const prevRes = await fetch(
        `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${currentYear - 1}&status=FT&last=10`,
        { headers, next: { revalidate: 60 } }
      )
      const prevJson = await prevRes.json()
      return (prevJson.response ?? []).map(mapFixture)
    }

    return [...upcoming, ...recent]
  } catch (err) {
    console.error(`API-Sports fetch error for league ${leagueId}:`, err)
    return []
  }
}

// ─── balldontlie NBA fetcher ──────────────────────────────────────────────────
async function fetchNBAGames(): Promise<ExternalGame[]> {
  const bdlKey = process.env.BALLDONTLIE_API_KEY
  if (!bdlKey) { console.error('BALLDONTLIE_API_KEY not set'); return [] }

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const past = new Date(now); past.setDate(now.getDate() - 14)
  const future = new Date(now); future.setDate(now.getDate() + 14)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  // NBA season year = the year the season started
  // 2025-26 season started Oct 2025, so season param = 2025
  const month = now.getMonth() + 1 // 1-12
  const year  = now.getFullYear()
  const currentSeason = month >= 10 ? year : year - 1

  const mapGame = (g: any): ExternalGame => ({
    id: g.id,
    home_team_short: g.home_team?.abbreviation ?? g.home_team?.full_name ?? 'HM',
    away_team_short: g.visitor_team?.abbreviation ?? g.visitor_team?.full_name ?? 'AW',
    home_score: g.home_team_score || null,
    away_score: g.visitor_team_score || null,
    date: g.date,
    status: g.status === 'Final' ? 'Final'
      : typeof g.status === 'string' && /Qtr|Halftime|OT/i.test(g.status) ? 'Live'
      : 'Scheduled',
    venue: g.home_team?.city ?? undefined,
  })

  try {
    const upcomingJson = await safeBDLFetch(
      `https://api.balldontlie.io/v1/games?per_page=6&seasons[]=${currentSeason}&start_date=${fmt(now)}&end_date=${fmt(future)}`,
      bdlKey
    )
    await new Promise(r => setTimeout(r, 300))
    const recentJson = await safeBDLFetch(
      `https://api.balldontlie.io/v1/games?per_page=12&seasons[]=${currentSeason}&start_date=${fmt(past)}&end_date=${fmt(now)}`,
      bdlKey
    )

    let allGames = [...(upcomingJson.data ?? []), ...(recentJson.data ?? [])]

    // Fallback: pull latest games from current season if date range returns nothing
    if (allGames.length === 0) {
      await new Promise(r => setTimeout(r, 300))
      const fallbackJson = await safeBDLFetch(
        `https://api.balldontlie.io/v1/games?per_page=12&seasons[]=${currentSeason}`,
        bdlKey
      )
      allGames = fallbackJson.data ?? []
    }

    // Deduplicate
    const seen = new Set<number>()
    allGames = allGames.filter((g: any) => {
      if (seen.has(g.id)) return false
      seen.add(g.id)
      return true
    })

    return allGames.map(mapGame).filter((g) => {
      if (g.status === 'Final' || g.status === 'Live') return true
      return g.date >= todayStr
    })
  } catch (err) {
    console.error('NBA fetch error:', err)
    return []
  }
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────
export async function fetchLeagueGames(leagueId: LeagueId): Promise<ExternalGame[]> {
  const league = getLeague(leagueId)
  if (league.apiSource === 'football-data' && league.apiCode) return fetchFootballData(league.apiCode)
  if (league.apiSource === 'api-sports' && league.apiSportsId)  return fetchApiSportsFootball(league.apiSportsId)
  if (league.apiSource === 'balldontlie') return fetchNBAGames()
  return []
}