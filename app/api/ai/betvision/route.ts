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

// ─── Pure code: calculate all analytics — zero Groq tokens ───────────────────
function calculateAnalytics(
  homeTeam: any,
  awayTeam: any,
  sport: 'basketball' | 'football',
  league: string
) {
  const isNeutral = NEUTRAL_VENUE_LEAGUES.has(league)

  const homeWins   = Number(homeTeam.wins   ?? 0)
  const homeLosses = Number(homeTeam.losses ?? 0)
  const homeDraws  = Number(homeTeam.draws  ?? 0)
  const homePlayed = Number(homeTeam.played ?? (homeWins + homeLosses + homeDraws)) || 1

  const awayWins   = Number(awayTeam.wins   ?? 0)
  const awayLosses = Number(awayTeam.losses ?? 0)
  const awayDraws  = Number(awayTeam.draws  ?? 0)
  const awayPlayed = Number(awayTeam.played ?? (awayWins + awayLosses + awayDraws)) || 1

  const homeWinPct = (homeWins / homePlayed) * 100
  const awayWinPct = (awayWins / awayPlayed) * 100
  const homeDrawPct = (homeDraws / homePlayed) * 100
  const awayDrawPct = (awayDraws / awayPlayed) * 100

  // Home advantage boost (not applied for neutral venues)
  const homeAdvantage = isNeutral ? 0 : 8

  // Win probability using win% differential + home boost
  const diff = (homeWinPct + homeAdvantage) - awayWinPct
  let homeProbability = 50 + diff * 0.4
  homeProbability = Math.min(85, Math.max(15, homeProbability))

  // Draw probability — higher when teams are evenly matched and in football
  let drawProbability = 0
  if (sport === 'football') {
    const avgDrawPct = (homeDrawPct + awayDrawPct) / 2
    const evenness = 100 - Math.abs(diff) * 1.2
    drawProbability = Math.min(35, Math.max(8, avgDrawPct * 0.6 + evenness * 0.15))
  }

  const awayProbability = Math.max(5, 100 - homeProbability - drawProbability)

  // Normalise to 100
  const total = homeProbability + drawProbability + awayProbability
  const normHome = (homeProbability / total) * 100
  const normDraw = (drawProbability / total) * 100
  const normAway = (awayProbability / total) * 100

  // Recommendation
  let recommendation: 'HOME' | 'AWAY' | 'DRAW' | 'AVOID'
  let confidence: number
  if (normHome >= normAway && normHome >= normDraw) {
    recommendation = 'HOME'; confidence = normHome
  } else if (normAway > normHome && normAway >= normDraw) {
    recommendation = 'AWAY'; confidence = normAway
  } else {
    recommendation = 'DRAW'; confidence = normDraw
  }

  // If confidence too low, mark as AVOID
  if (confidence < 48) recommendation = 'AVOID'
  confidence = Math.round(Math.min(90, Math.max(45, confidence)))

  // Odds: implied probability with margin
  const margin = 1.06 // bookmaker margin
  const homeOdds  = (100 / normHome  * margin).toFixed(2)
  const drawOdds  = sport === 'football' ? (100 / normDraw  * margin).toFixed(2) : null
  const awayOdds  = (100 / normAway  * margin).toFixed(2)

  // Value & risk
  const valueRating: 'HIGH' | 'MEDIUM' | 'LOW' =
    confidence >= 65 ? 'HIGH' : confidence >= 52 ? 'MEDIUM' : 'LOW'
  const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    confidence >= 70 ? 'LOW' : confidence >= 55 ? 'MEDIUM' : 'HIGH'

  // Bet type
  let betType = 'Match Winner'
  if (sport === 'football') {
    if (normDraw > 28) betType = 'Draw No Bet'
    else if (normHome > 70 || normAway > 70) betType = 'Match Winner'
    else betType = 'Match Winner'
  } else {
    betType = 'Moneyline'
  }

  // Key stats (pure data — no AI)
  const homeWinPctStr = homeWinPct.toFixed(1)
  const awayWinPctStr = awayWinPct.toFixed(1)

  const keyStats = sport === 'football' ? [
    `Win rate: ${homeTeam.name} ${homeWinPctStr}% vs ${awayTeam.name} ${awayWinPctStr}%`,
    `Record: ${homeWins}W-${homeDraws}D-${homeLosses}L vs ${awayWins}W-${awayDraws}D-${awayLosses}L`,
    `Games played: ${homePlayed} vs ${awayPlayed}`,
    isNeutral ? `Neutral venue — no home advantage` : `Home advantage: +${homeAdvantage}% probability boost`,
    `Draw likelihood: ${normDraw.toFixed(0)}% based on both teams' draw history`,
  ] : [
    `Win rate: ${homeTeam.name} ${homeWinPctStr}% vs ${awayTeam.name} ${awayWinPctStr}%`,
    `Record: ${homeWins}W-${homeLosses}L vs ${awayWins}W-${awayLosses}L`,
    `Games played: ${homePlayed} vs ${awayPlayed}`,
    isNeutral ? `Neutral venue — equal footing` : `Home court advantage: +${homeAdvantage}% probability boost`,
    `Win probability: ${normHome.toFixed(0)}% home / ${normAway.toFixed(0)}% away`,
  ]

  return {
    recommendation,
    confidence,
    odds: {
      home: homeOdds,
      ...(drawOdds ? { draw: drawOdds } : {}),
      away: awayOdds,
    },
    valueRating,
    riskLevel,
    betType,
    keyStats,
    // Pass these for the AI reasoning prompt
    _meta: {
      homeWinPct: homeWinPctStr,
      awayWinPct: awayWinPctStr,
      homeRecord: `${homeWins}W-${homeDraws}D-${homeLosses}L`,
      awayRecord: `${awayWins}W-${awayDraws}D-${awayLosses}L`,
      homePlayed,
      awayPlayed,
      isNeutral,
    }
  }
}

// ─── Groq: ONLY generates the reasoning text (2-3 sentences) ─────────────────
async function generateReasoning(
  homeTeam: any,
  awayTeam: any,
  analytics: ReturnType<typeof calculateAnalytics>,
  leagueName: string
): Promise<string> {
  const { _meta: m, recommendation, confidence, betType } = analytics

  const prompt = `You are a sports betting analyst. Write exactly 2-3 sentences of betting reasoning for this match.

Match: ${homeTeam.name} vs ${awayTeam.name} (${leagueName})
Recommendation: ${recommendation} | Confidence: ${confidence}% | Bet: ${betType}
${homeTeam.name}: ${m.homeRecord} in ${m.homePlayed} games (${m.homeWinPct}% win rate)
${awayTeam.name}: ${m.awayRecord} in ${m.awayPlayed} games (${m.awayWinPct}% win rate)
${m.isNeutral ? 'Neutral venue — no home advantage.' : `${homeTeam.name} playing at home.`}

Write ONLY the reasoning sentences. No JSON, no labels, no preamble. Reference both teams by name and their actual records.`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120, // just 2-3 sentences
      temperature: 0.4,
    })
    return completion.choices[0]?.message?.content?.trim() ?? ''
  } catch (err: any) {
    // Fallback reasoning if Groq fails — no crash
    console.warn('Groq reasoning failed, using fallback:', err?.message)
    const better = recommendation === 'HOME' ? homeTeam.name : recommendation === 'AWAY' ? awayTeam.name : 'a draw'
    return `${homeTeam.name} (${m.homeWinPct}% win rate) faces ${awayTeam.name} (${m.awayWinPct}% win rate). Based on current records, ${better} looks the stronger pick with ${confidence}% confidence.`
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { homeTeam, awayTeam, league = 'MBA' } = body

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ error: 'homeTeam and awayTeam are required' }, { status: 400 })
    }

    const sport = getSport(league)
    const leagueName = getLeagueName(league)

    // Step 1: Calculate everything with pure code (no Groq)
    const analytics = calculateAnalytics(homeTeam, awayTeam, sport, league)

    // Step 2: Use Groq ONLY for the 2-3 sentence reasoning (max 120 tokens)
    const reasoning = process.env.GROQ_API_KEY
      ? await generateReasoning(homeTeam, awayTeam, analytics, leagueName)
      : `${homeTeam.name} (${analytics._meta.homeWinPct}% win rate) vs ${awayTeam.name} (${analytics._meta.awayWinPct}% win rate). Recommendation based on current season records.`

    console.log(`POST /api/ai/betvision — league=${league} rec=${analytics.recommendation} conf=${analytics.confidence}%`)

    return NextResponse.json({
      recommendation: analytics.recommendation,
      confidence: analytics.confidence,
      odds: analytics.odds,
      valueRating: analytics.valueRating,
      reasoning,
      keyStats: analytics.keyStats,
      betType: analytics.betType,
      riskLevel: analytics.riskLevel,
    })

  } catch (error: any) {
    console.error('POST /api/ai/betvision error:', error?.message)
    return NextResponse.json({ error: 'Failed to generate bet advice' }, { status: 500 })
  }
}
