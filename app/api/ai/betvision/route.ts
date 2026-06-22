import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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
  homeWinPct: string,
  awayWinPct: string
): string {
  const homeRecord = `${homeTeam.wins ?? 0}W-${homeTeam.losses ?? 0}L (${homeWinPct}% win rate)`
  const awayRecord = `${awayTeam.wins ?? 0}W-${awayTeam.losses ?? 0}L (${awayWinPct}% win rate)`

  const sportTerms = sport === 'basketball'
    ? 'home court advantage, turnovers, rebounding, three-point shooting, paint scoring, fast breaks'
    : 'home advantage, pressing intensity, defensive shape, set pieces, counterattack, aerial duels'

  return `You are an expert sports betting analyst for the ${leagueName}. Analyse this upcoming ${sport} match and give precise betting advice.

HOME TEAM: ${homeTeam.name} — ${homeRecord}
AWAY TEAM: ${awayTeam.name} — ${awayRecord}

Based on the records and home advantage, generate realistic decimal betting odds and a clear recommendation.

Respond ONLY with a valid JSON object. No markdown, no backticks, no explanation — raw JSON only:
{
  "recommendation": "HOME",
  "confidence": 68,
  "odds": { "home": "1.85", "draw": "3.40", "away": "4.20" },
  "valueRating": "HIGH",
  "reasoning": "2-3 sentence betting analysis mentioning team names, records, and why this bet has value.",
  "keyStats": ["Stat 1", "Stat 2", "Stat 3", "Stat 4", "Stat 5"],
  "betType": "Match Winner",
  "riskLevel": "LOW"
}

Rules:
- recommendation: "HOME", "AWAY", "DRAW" (football only), or "AVOID" (if match is too unpredictable)
- confidence: 45-90 based on record difference and home advantage
- odds: realistic decimal odds (e.g. 1.50–5.00). ${sport === 'basketball' ? 'No draw for basketball — omit draw field.' : 'Include draw for football.'}
- valueRating: "HIGH" if confidence >= 65, "MEDIUM" if 50-64, "LOW" if < 50
- riskLevel: "LOW" if confidence >= 70, "MEDIUM" if 55-69, "HIGH" if < 55
- reasoning: mention both teams by name, their records, home advantage, and the value in the bet
- keyStats: exactly 5 specific factors influencing this bet — use ${sportTerms}
- betType: e.g. "Match Winner", "Handicap", "Over 2.5 Goals", "Both Teams to Score", "Moneyline"
- predictedWinner must be "${homeTeam.name}" or "${awayTeam.name}" (or "Draw")`
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

    const prompt = buildBetPrompt(homeTeam, awayTeam, sport, leagueName, homeWinPct, awayWinPct)

    console.log(`POST /api/ai/betvision — league=${league} sport=${sport}`)

    let completion
    try {
      completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      })
    } catch (groqError: any) {
      console.error('Groq API call failed:', groqError?.message)
      return NextResponse.json({ error: 'Groq API call failed' }, { status: 500 })
    }

    const raw = completion.choices[0]?.message?.content?.trim() || ''
    console.log('BetVision Groq response:', raw)

    const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      console.error('No JSON in Groq response:', clean)
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
