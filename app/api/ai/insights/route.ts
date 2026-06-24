import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Leagues played on neutral ground (no home advantage)
const NEUTRAL_VENUE_LEAGUES = new Set(['WC', 'AFCON', 'UCL', 'UEL'])

// ─── API-Sports league IDs ────────────────────────────────────────────────────
const API_SPORTS_LEAGUE_IDS: Record<string, number> = {
  EPL: 39, UCL: 2, UEL: 3, ELC: 40, PD: 140,
  BL1: 78, SA: 135, FL1: 61, DED: 88, PPL: 94,
  WC: 1, AFCON: 6,
}

const CURRENT_SEASON = 2024

// ─── Fetch real squad from API-Sports ────────────────────────────────────────
async function fetchSquad(teamName: string, leagueCode: string): Promise<string[]> {
  try {
    const apiKey = process.env.API_SPORTS_KEY
    if (!apiKey) return []
    const leagueId = API_SPORTS_LEAGUE_IDS[leagueCode]
    if (!leagueId) return []

    const searchRes = await fetch(
      `https://v3.football.api-sports.io/teams?name=${encodeURIComponent(teamName)}&league=${leagueId}&season=${CURRENT_SEASON}`,
      { headers: { 'x-apisports-key': apiKey } }
    )
    if (!searchRes.ok) return []
    const searchJson = await searchRes.json()
    let teamId = searchJson?.response?.[0]?.team?.id

    if (!teamId) {
      const broadRes = await fetch(
        `https://v3.football.api-sports.io/teams?name=${encodeURIComponent(teamName)}`,
        { headers: { 'x-apisports-key': apiKey } }
      )
      if (!broadRes.ok) return []
      const broadJson = await broadRes.json()
      teamId = broadJson?.response?.[0]?.team?.id
      if (!teamId) return []
    }

    const squadRes = await fetch(
      `https://v3.football.api-sports.io/players/squads?team=${teamId}`,
      { headers: { 'x-apisports-key': apiKey } }
    )
    if (!squadRes.ok) return []
    const squadJson = await squadRes.json()
    const players = squadJson?.response?.[0]?.players ?? []
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
    MBA: 'MBA Zimbabwe', NBA: 'NBA',
    EPL: 'English Premier League', UCL: 'UEFA Champions League',
    UEL: 'UEFA Europa League', ELC: 'English Championship',
    PD: 'La Liga', BL1: 'Bundesliga', SA: 'Serie A',
    FL1: 'Ligue 1', DED: 'Eredivisie', PPL: 'Primeira Liga',
    WC: 'FIFA World Cup', AFCON: 'Africa Cup of Nations',
  }
  return names[league] ?? league
}

function buildPrompt(
  homeTeam: any,
  awayTeam: any,
  sport: 'basketball' | 'football',
  leagueName: string,
  league: string,
  homeWinPct: string,
  awayWinPct: string,
  homeSquad: string[],
  awaySquad: string[]
): string {
  const homeWins = homeTeam.wins ?? 0
  const homeLosses = homeTeam.losses ?? 0
  const awayWins = awayTeam.wins ?? 0
  const awayLosses = awayTeam.losses ?? 0
  const homePlayed = homeTeam.played ?? (Number(homeWins) + Number(homeLosses))
  const awayPlayed = awayTeam.played ?? (Number(awayWins) + Number(awayLosses))
  const homeDraws = Number(homePlayed) - Number(homeWins) - Number(homeLosses)
  const awayDraws = Number(awayPlayed) - Number(awayWins) - Number(awayLosses)

  const isNeutral = NEUTRAL_VENUE_LEAGUES.has(league)

  const homeSquadStr = homeSquad.length > 0
    ? `Known squad members: ${homeSquad.join(', ')}`
    : 'Squad data unavailable — do NOT invent player names'
  const awaySquadStr = awaySquad.length > 0
    ? `Known squad members: ${awaySquad.join(', ')}`
    : 'Squad data unavailable — do NOT invent player names'

  const venueContext = isNeutral
    ? `VENUE: Neutral ground — NO home advantage applies. Both teams are on equal footing venue-wise.`
    : `VENUE: ${homeTeam.name} playing at HOME — home advantage applies.`

  const homeRecord = `${homeWins}W-${homeDraws > 0 ? homeDraws + 'D-' : ''}${homeLosses}L in ${homePlayed} games (${homeWinPct}% win rate)`
  const awayRecord = `${awayWins}W-${awayDraws > 0 ? awayDraws + 'D-' : ''}${awayLosses}L in ${awayPlayed} games (${awayWinPct}% win rate)`

  if (sport === 'football') {
    return `You are a world-class football analyst covering the ${leagueName}.

MATCH: ${homeTeam.name} vs ${awayTeam.name}
${venueContext}

REAL CURRENT STATS:
- ${homeTeam.name}: ${homeRecord}
- ${awayTeam.name}: ${awayRecord}

REAL CURRENT SQUADS (use ONLY these names — never invent others):
- ${homeTeam.name} — ${homeSquadStr}
- ${awayTeam.name} — ${awaySquadStr}

ANALYSIS INSTRUCTIONS:
1. Base predictions primarily on the ACTUAL WIN/LOSS RECORDS above
2. Pick 2-3 key players from each squad list who will be decisive (only from the list above)
3. ${isNeutral ? 'Both teams on neutral ground — focus on form, squad depth, tactical setup, and head-to-head history' : 'Factor in home advantage alongside form and records'}
4. Reference head-to-head history and tournament context if known
5. If squad data unavailable for a team, analyse tactically without naming players

Respond ONLY with valid JSON — no markdown, no backticks:
{"homeWinProbability":55,"awayWinProbability":45,"predictedWinner":"${homeTeam.name}","confidenceScore":68,"reasoning":"3-4 sentences referencing actual records (${homeRecord} vs ${awayRecord}), key players from the squad lists, tactical matchup, and decisive factors. ${isNeutral ? 'Note neutral venue context.' : ''}","keyFactors":["Win rate comparison: ${homeWinPct}% vs ${awayWinPct}%","Games played and form: ${homePlayed} vs ${awayPlayed} matches","Key player matchup from squad lists","Tactical setup and pressing intensity","${isNeutral ? 'Neutral venue — squad depth and tournament experience' : 'Home crowd and familiar pitch advantage'}"]}

Rules:
- homeWinProbability + awayWinProbability = 100
- predictedWinner must be exactly "${homeTeam.name}" or "${awayTeam.name}"
- confidenceScore 50-90, driven by win rate gap and games played
- keyFactors: exactly 5, reference real stats and players from squad lists only`
  }

  return `You are a basketball analyst covering the ${leagueName}.

MATCH: ${homeTeam.name} vs ${awayTeam.name}
${venueContext}

REAL CURRENT STATS:
- ${homeTeam.name}: ${homeRecord}
- ${awayTeam.name}: ${awayRecord}

Base your prediction on the actual win/loss records, ${isNeutral ? 'neutral venue context,' : 'home court advantage,'} offensive efficiency, defensive rating, pace of play, and turnover margin. Do NOT invent player names.

Respond ONLY with valid JSON — no markdown, no backticks:
{"homeWinProbability":65,"awayWinProbability":35,"predictedWinner":"${homeTeam.name}","confidenceScore":72,"reasoning":"3-4 sentences referencing actual records (${homeRecord} vs ${awayRecord}), efficiency metrics, and team momentum.","keyFactors":["Win rate: ${homeWinPct}% vs ${awayWinPct}%","Games played: ${homePlayed} vs ${awayPlayed}","Offensive efficiency and pace","Turnover margin and ball security","${isNeutral ? 'Neutral venue — equal playing conditions' : 'Home court energy and crowd support'}"]}

Rules:
- homeWinProbability + awayWinProbability = 100
- predictedWinner must be exactly "${homeTeam.name}" or "${awayTeam.name}"
- confidenceScore 50-90
- keyFactors: exactly 5`
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

    const homeWins = Number(homeTeam.wins ?? 0)
    const homeLosses = Number(homeTeam.losses ?? 0)
    const awayWins = Number(awayTeam.wins ?? 0)
    const awayLosses = Number(awayTeam.losses ?? 0)
    const homeTotal = homeWins + homeLosses
    const awayTotal = awayWins + awayLosses
    const homeWinPct = homeTotal > 0 ? ((homeWins / homeTotal) * 100).toFixed(1) : '50.0'
    const awayWinPct = awayTotal > 0 ? ((awayWins / awayTotal) * 100).toFixed(1) : '50.0'

    let homeSquad: string[] = []
    let awaySquad: string[] = []

    if (sport === 'football' && API_SPORTS_LEAGUE_IDS[league]) {
      console.log(`Fetching squads for ${homeTeam.name} vs ${awayTeam.name} (${league})`)
      ;[homeSquad, awaySquad] = await Promise.all([
        fetchSquad(homeTeam.name, league),
        fetchSquad(awayTeam.name, league),
      ])
      console.log(`Squads — ${homeTeam.name}: ${homeSquad.length}, ${awayTeam.name}: ${awaySquad.length}`)
    }

    const prompt = buildPrompt(homeTeam, awayTeam, sport, leagueName, league, homeWinPct, awayWinPct, homeSquad, awaySquad)

    console.log(`POST /api/ai/insights — league=${league} sport=${sport} neutral=${NEUTRAL_VENUE_LEAGUES.has(league)}`)

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
