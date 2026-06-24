import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─── API-Sports league IDs ────────────────────────────────────────────────────
const API_SPORTS_LEAGUE_IDS: Record<string, number> = {
  EPL: 39,
  UCL: 2,
  UEL: 3,
  ELC: 40,
  PD: 140,
  BL1: 78,
  SA: 135,
  FL1: 61,
  DED: 88,
  PPL: 94,
  WC: 1,
  AFCON: 6,
}

const CURRENT_SEASON = 2024

// ─── Fetch real squad from API-Sports ────────────────────────────────────────
async function fetchSquad(teamName: string, leagueCode: string): Promise<string[]> {
  try {
    const apiKey = process.env.API_SPORTS_KEY
    if (!apiKey) return []

    const leagueId = API_SPORTS_LEAGUE_IDS[leagueCode]
    if (!leagueId) return []

    // First search for the team by name to get their API-Sports team ID
    const searchRes = await fetch(
      `https://v3.football.api-sports.io/teams?name=${encodeURIComponent(teamName)}&league=${leagueId}&season=${CURRENT_SEASON}`,
      { headers: { 'x-apisports-key': apiKey } }
    )
    if (!searchRes.ok) return []
    const searchJson = await searchRes.json()
    const teamId = searchJson?.response?.[0]?.team?.id
    if (!teamId) {
      // Try broader search without league filter
      const broadRes = await fetch(
        `https://v3.football.api-sports.io/teams?name=${encodeURIComponent(teamName)}`,
        { headers: { 'x-apisports-key': apiKey } }
      )
      if (!broadRes.ok) return []
      const broadJson = await broadRes.json()
      const broadTeamId = broadJson?.response?.[0]?.team?.id
      if (!broadTeamId) return []

      const squadRes = await fetch(
        `https://v3.football.api-sports.io/players/squads?team=${broadTeamId}`,
        { headers: { 'x-apisports-key': apiKey } }
      )
      if (!squadRes.ok) return []
      const squadJson = await squadRes.json()
      const players = squadJson?.response?.[0]?.players ?? []
      return players.slice(0, 11).map((p: any) => p.name).filter(Boolean)
    }

    // Fetch squad with team ID
    const squadRes = await fetch(
      `https://v3.football.api-sports.io/players/squads?team=${teamId}`,
      { headers: { 'x-apisports-key': apiKey } }
    )
    if (!squadRes.ok) return []
    const squadJson = await squadRes.json()
    const players = squadJson?.response?.[0]?.players ?? []

    // Return top 11 players (typically starters)
    return players.slice(0, 11).map((p: any) => p.name).filter(Boolean)
  } catch (err) {
    console.warn('fetchSquad failed for', teamName, err)
    return []
  }
}

function getSport(league: string): 'basketball' | 'football' {
  return league === 'NBA' || league === 'MBA' ? 'basketball' : 'football'
}

function getLeagueName(league: string): string {
  const names: Record<string, string> = {
    MBA: 'MBA Zimbabwe',
    NBA: 'NBA',
    EPL: 'English Premier League',
    UCL: 'UEFA Champions League',
    UEL: 'UEFA Europa League',
    ELC: 'English Championship',
    PD: 'La Liga',
    BL1: 'Bundesliga',
    SA: 'Serie A',
    FL1: 'Ligue 1',
    DED: 'Eredivisie',
    PPL: 'Primeira Liga',
    WC: 'FIFA World Cup',
    AFCON: 'Africa Cup of Nations',
  }
  return names[league] ?? league
}

function buildPrompt(
  homeTeam: any,
  awayTeam: any,
  sport: 'basketball' | 'football',
  leagueName: string,
  homeWinPct: string,
  awayWinPct: string,
  homeSquad: string[],
  awaySquad: string[]
): string {
  const homeWins = homeTeam.wins ?? 0
  const homeLosses = homeTeam.losses ?? 0
  const awayWins = awayTeam.wins ?? 0
  const awayLosses = awayTeam.losses ?? 0

  const homeSquadStr = homeSquad.length > 0
    ? `Current squad: ${homeSquad.join(', ')}`
    : 'Squad data unavailable — do NOT invent player names'

  const awaySquadStr = awaySquad.length > 0
    ? `Current squad: ${awaySquad.join(', ')}`
    : 'Squad data unavailable — do NOT invent player names'

  if (sport === 'football') {
    return `You are a world-class football analyst covering the ${leagueName}.

MATCH: ${homeTeam.name} (HOME) vs ${awayTeam.name} (AWAY)

STATS:
- ${homeTeam.name}: ${homeWins}W-${homeLosses}L, ${homeWinPct}% win rate, playing at home
- ${awayTeam.name}: ${awayWins}W-${awayLosses}L, ${awayWinPct}% win rate, playing away

REAL CURRENT SQUADS (use ONLY these names — never invent others):
- ${homeTeam.name} — ${homeSquadStr}
- ${awayTeam.name} — ${awaySquadStr}

INSTRUCTIONS:
1. Pick 2-3 KEY PLAYERS from each team's squad list above who will be decisive
2. Describe tactical setup, pressing style, defensive shape
3. Reference head-to-head history if known
4. Identify set piece takers, key attackers, defensive anchors FROM THE SQUAD LIST ONLY
5. If squad data is unavailable for a team, analyse tactically without naming players

Respond ONLY with valid JSON — no markdown, no backticks:
{"homeWinProbability":55,"awayWinProbability":45,"predictedWinner":"${homeTeam.name}","confidenceScore":68,"reasoning":"3-4 sentences with specific player names from the squad lists, tactical analysis, and decisive factors.","keyFactors":["Player name + specific role/impact","Tactical matchup factor","Set piece or dead ball threat","Defensive shape vs attacking style","Home advantage context"]}

Rules:
- homeWinProbability + awayWinProbability = 100
- predictedWinner must be exactly "${homeTeam.name}" or "${awayTeam.name}"
- confidenceScore 50-90
- keyFactors: exactly 5 items, reference real player names from the squad lists above`
  }

  // Basketball — MBA/NBA don't use API-Sports squads, keep team-level
  return `You are a basketball analyst covering the ${leagueName}.

MATCH: ${homeTeam.name} (HOME) vs ${awayTeam.name} (AWAY)

STATS:
- ${homeTeam.name}: ${homeWins}W-${homeLosses}L, ${homeWinPct}% win rate, playing at home
- ${awayTeam.name}: ${awayWins}W-${awayLosses}L, ${awayWinPct}% win rate, playing away

Provide a team-level analytical prediction based on win rates, home court advantage, offensive/defensive efficiency, pace of play, and turnover margin. Do NOT invent player names unless you are 100% certain they are on the current roster.

Respond ONLY with valid JSON — no markdown, no backticks:
{"homeWinProbability":65,"awayWinProbability":35,"predictedWinner":"${homeTeam.name}","confidenceScore":72,"reasoning":"3-4 sentences on win rates, home court, efficiency metrics, and team momentum.","keyFactors":["Home court advantage and crowd energy","Win rate differential (${homeWinPct}% vs ${awayWinPct}%)","Offensive efficiency and pace","Turnover margin and ball security","Defensive rating and paint protection"]}

Rules:
- homeWinProbability + awayWinProbability = 100
- predictedWinner must be exactly "${homeTeam.name}" or "${awayTeam.name}"
- confidenceScore 50-90
- keyFactors: exactly 5 items`
}

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { homeTeam, awayTeam, league = 'MBA' } = body

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ error: 'homeTeam and awayTeam are required' }, { status: 400 })
    }

    const sport = getSport(league)
    const leagueName = getLeagueName(league)

    const homeWins = homeTeam.wins ?? 0
    const homeLosses = homeTeam.losses ?? 0
    const awayWins = awayTeam.wins ?? 0
    const awayLosses = awayTeam.losses ?? 0
    const homeTotal = homeWins + homeLosses
    const awayTotal = awayWins + awayLosses
    const homeWinPct = homeTotal > 0 ? ((homeWins / homeTotal) * 100).toFixed(1) : '50.0'
    const awayWinPct = awayTotal > 0 ? ((awayWins / awayTotal) * 100).toFixed(1) : '50.0'

    // Fetch real squads for football leagues
    let homeSquad: string[] = []
    let awaySquad: string[] = []

    if (sport === 'football' && API_SPORTS_LEAGUE_IDS[league]) {
      console.log(`Fetching squads for ${homeTeam.name} vs ${awayTeam.name} (${league})`)
      ;[homeSquad, awaySquad] = await Promise.all([
        fetchSquad(homeTeam.name, league),
        fetchSquad(awayTeam.name, league),
      ])
      console.log(`Squads — ${homeTeam.name}: ${homeSquad.length} players, ${awayTeam.name}: ${awaySquad.length} players`)
    }

    const prompt = buildPrompt(homeTeam, awayTeam, sport, leagueName, homeWinPct, awayWinPct, homeSquad, awaySquad)

    console.log(`POST /api/ai/insights — league=${league} sport=${sport}`)

    let completion
    try {
      completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.4,
      })
    } catch (groqError: any) {
      console.error('Groq API call failed:', groqError?.message)
      return NextResponse.json({ error: 'Groq API call failed', detail: groqError?.message }, { status: 500 })
    }

    const raw = completion.choices[0]?.message?.content?.trim() || ''
    console.log('Groq raw response:', raw)

    const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      console.error('No JSON found in Groq response:', clean)
      return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 })
    }

    let result
    try {
      result = JSON.parse(jsonMatch[0])
    } catch (parseError: any) {
      console.error('JSON parse failed:', parseError.message)
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const homeProb = Math.min(100, Math.max(0, Number(result.homeWinProbability) || 50))

    return NextResponse.json({
      homeWinProbability: homeProb,
      awayWinProbability: 100 - homeProb,
      predictedWinner: result.predictedWinner || homeTeam.name,
      confidenceScore: Math.min(100, Math.max(0, Number(result.confidenceScore) || 60)),
      reasoning: result.reasoning || '',
      keyFactors: Array.isArray(result.keyFactors) ? result.keyFactors : [],
    })

  } catch (error: any) {
    console.error('POST /api/ai/insights unhandled error:', error?.message)
    return NextResponse.json({ error: 'Failed to generate prediction', detail: error?.message }, { status: 500 })
  }
}
