import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const NEUTRAL_VENUE_LEAGUES = new Set(['WC', 'AFCON', 'UCL', 'UEL'])

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

function buildBetPrompt(
  homeTeam: any,
  awayTeam: any,
  sport: 'basketball' | 'football',
  leagueName: string,
  league: string,
  homeWinPct: string,
  awayWinPct: string
): string {
  const isNeutral = NEUTRAL_VENUE_LEAGUES.has(league)

  const homeWins = Number(homeTeam.wins ?? 0)
  const homeLosses = Number(homeTeam.losses ?? 0)
  const homeDraws = Number(homeTeam.draws ?? 0)
  const homePlayed = Number(homeTeam.played ?? (homeWins + homeLosses + homeDraws))

  const awayWins = Number(awayTeam.wins ?? 0)
  const awayLosses = Number(awayTeam.losses ?? 0)
  const awayDraws = Number(awayTeam.draws ?? 0)
  const awayPlayed = Number(awayTeam.played ?? (awayWins + awayLosses + awayDraws))

  const homeRecord = `${homeWins}W-${homeDraws}D-${homeLosses}L in ${homePlayed} games (${homeWinPct}% win rate)`
  const awayRecord = `${awayWins}W-${awayDraws}D-${awayLosses}L in ${awayPlayed} games (${awayWinPct}% win rate)`

  const venueContext = isNeutral
    ? `VENUE: Neutral ground — NO home advantage. Both teams on equal footing.`
    : `VENUE: ${homeTeam.name} playing at HOME — home advantage applies.`

  const footballStats = isNeutral
    ? 'win rate differential, games played, draws vs wins ratio, goal scoring form, tournament experience, squad depth, tactical setup'
    : 'home advantage, win rate differential, games played, pressing intensity, defensive shape, set pieces, counterattack'

  const basketballStats = isNeutral
    ? 'win rate differential, games played, offensive efficiency, defensive rating, pace of play, turnover margin'
    : 'home court advantage, win rate differential, offensive efficiency, rebounding, three-point shooting, turnovers'

  return `You are an expert sports betting analyst for the ${leagueName}.

MATCH: ${homeTeam.name} vs ${awayTeam.name}
${venueContext}

REAL CURRENT RECORDS:
- ${homeTeam.name}: ${homeRecord}
- ${awayTeam.name}: ${awayRecord}

Analyse this match using the ACTUAL records above. Base your betting advice primarily on these real stats — win rates, games played, draws, losses. ${isNeutral ? 'Do NOT mention home advantage — this is a neutral venue tournament.' : ''}

Respond ONLY with valid JSON — no markdown, no backticks:
{
  "recommendation": "HOME",
  "confidence": 68,
  "odds": { "home": "1.85", "draw": "3.40", "away": "4.20" },
  "valueRating": "HIGH",
  "reasoning": "2-3 sentences referencing actual records (${homeRecord} vs ${awayRecord}), form differential, and why this bet has value. ${isNeutral ? 'Note this is a neutral venue — no home advantage.' : ''}",
  "keyStats": ["Win rate: ${homeWinPct}% vs ${awayWinPct}%", "Record: ${homeWins}W-${homeLosses}L vs ${awayWins}W-${awayLosses}L", "Games played: ${homePlayed} vs ${awayPlayed}", "Stat 4", "Stat 5"],
  "betType": "Match Winner",
  "riskLevel": "MEDIUM"
}

Rules:
- recommendation: "HOME", "AWAY", "DRAW" (football only), or "AVOID"
- confidence: 45-90 based on record difference${isNeutral ? ' only (no home boost)' : ' and home advantage'}
- odds: realistic decimal odds 1.50-5.00. ${sport === 'basketball' ? 'No draw for basketball.' : 'Include draw for football.'}
- valueRating: "HIGH" if confidence >= 65, "MEDIUM" if 50-64, "LOW" if < 50
- riskLevel: "LOW" if confidence >= 70, "MEDIUM" if 55-69, "HIGH" if < 55
- reasoning: must reference both team names and their actual records
- keyStats: exactly 5 factors — use ${sport === 'football' ? footballStats : basketballStats}
- betType: "Match Winner", "Handicap", "Over 2.5 Goals", "Both Teams to Score", or "Moneyline"`
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
    const homeDraws = Number(homeTeam.draws ?? 0)
    const homePlayed = homeWins + homeLosses + homeDraws
    const awayWins = Number(awayTeam.wins ?? 0)
    const awayLosses = Number(awayTeam.losses ?? 0)
    const awayDraws = Number(awayTeam.draws ?? 0)
    const awayPlayed = awayWins + awayLosses + awayDraws

    const homeWinPct = homePlayed > 0 ? ((homeWins / homePlayed) * 100).toFixed(1) : '50.0'
    const awayWinPct = awayPlayed > 0 ? ((awayWins / awayPlayed) * 100).toFixed(1) : '50.0'

    const prompt = buildBetPrompt(homeTeam, awayTeam, sport, leagueName, league, homeWinPct, awayWinPct)

    console.log(`POST /api/ai/betvision — league=${league} neutral=${NEUTRAL_VENUE_LEAGUES.has(league)}`)

    let completion
    try {
      completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.3,
      })
    } catch (groqError: any) {
      console.error('Groq API call failed:', groqError?.message)
      return NextResponse.json({ error: 'Groq API call failed' }, { status: 500 })
    }

    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 })
    }

    let result
    try {
      result = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return NextResponse.json({
      recommendation: ['HOME', 'AWAY', 'DRAW', 'AVOID'].includes(result.recommendation)
        ? result.recommendation : 'HOME',
      confidence: Math.min(90, Math.max(45, Number(result.confidence) || 60)),
      odds: {
        home: result.odds?.home ?? '2.00',
        ...(sport === 'football' && result.odds?.draw ? { draw: result.odds.draw } : {}),
        away: result.odds?.away ?? '2.00',
      },
      valueRating: ['HIGH', 'MEDIUM', 'LOW'].includes(result.valueRating) ? result.valueRating : 'MEDIUM',
      reasoning: result.reasoning || '',
      keyStats: Array.isArray(result.keyStats) ? result.keyStats.slice(0, 5) : [],
      betType: result.betType || 'Match Winner',
      riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(result.riskLevel) ? result.riskLevel : 'MEDIUM',
    })

  } catch (error: any) {
    console.error('POST /api/ai/betvision unhandled error:', error?.message)
    return NextResponse.json({ error: 'Failed to generate bet advice' }, { status: 500 })
  }
}
