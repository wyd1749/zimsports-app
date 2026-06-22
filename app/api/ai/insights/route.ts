import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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
  awayWinPct: string
): string {
  const homeWins = homeTeam.wins ?? 0
  const homeLosses = homeTeam.losses ?? 0
  const awayWins = awayTeam.wins ?? 0
  const awayLosses = awayTeam.losses ?? 0

  if (sport === 'football') {
    return `You are a world-class football (soccer) analyst and scout covering the ${leagueName}. You have deep knowledge of every team's current squad, recent form, tactical setup, and key players.

MATCH: ${homeTeam.name} (HOME) vs ${awayTeam.name} (AWAY)

STATS:
- ${homeTeam.name}: ${homeWins}W-${homeLosses}L, ${homeWinPct}% win rate, playing at home
- ${awayTeam.name}: ${awayWins}W-${awayLosses}L, ${awayWinPct}% win rate, playing away

Using your expert knowledge of these specific teams, provide a deep tactical prediction. You MUST:
1. Name 2-3 specific KEY PLAYERS for each team who will be decisive (e.g. their top scorer, creative midfielder, defensive anchor)
2. Describe each team's current FORM and tactical setup (last 5 games trend, pressing style, defensive shape)
3. Reference any known HEAD-TO-HEAD history or rivalry context
4. Identify CLUTCH factors — which players perform under pressure, who takes set pieces, who leads the attack

Respond ONLY with a valid JSON object. No markdown, no backticks, no explanation — raw JSON only:
{"homeWinProbability":55,"awayWinProbability":45,"predictedWinner":"Team Name","confidenceScore":68,"reasoning":"Deep 3-4 sentence analysis mentioning specific player names, current form, tactical matchups, and decisive factors.","keyFactors":["Factor 1","Factor 2","Factor 3","Factor 4","Factor 5"]}

Rules:
- homeWinProbability + awayWinProbability must equal 100
- predictedWinner must be exactly "${homeTeam.name}" or "${awayTeam.name}"
- confidenceScore: higher when win% difference is larger (range 50-90)
- reasoning: MUST mention specific player names from both teams, their current form/recent results, tactical approach, and what will decide the game. 3-4 sentences minimum. Be specific, not generic.
- keyFactors: exactly 5 specific tactical/player factors — name actual players where possible (e.g. "Salah's pace vs right back", "set piece delivery", "high press vs low block"). Football terms only.`
  }

  return `You are a world-class NBA basketball analyst and scout covering the ${leagueName}. You have deep knowledge of every team's current roster, recent form, star players, clutch performers, and head-to-head history.

MATCH: ${homeTeam.name} (HOME) vs ${awayTeam.name} (AWAY)

STATS:
- ${homeTeam.name}: ${homeWins}W-${homeLosses}L, ${homeWinPct}% win rate, playing at home
- ${awayTeam.name}: ${awayWins}W-${awayLosses}L, ${awayWinPct}% win rate, playing away

Using your expert knowledge of these specific teams and their current rosters, provide a deep analytical prediction. You MUST:
1. Name 2-3 KEY PLAYERS for each team who will be decisive — their star player, primary scorer, defensive anchor, or playmaker
2. Describe each team's CURRENT FORM — last 5 games trend, offensive rating, defensive efficiency
3. Reference any known HEAD-TO-HEAD matchup history or playoff context between these teams
4. Identify CLUTCH factors — who takes over in the 4th quarter, who hits big shots, who guards the opponent's best player

Respond ONLY with a valid JSON object. No markdown, no backticks, no explanation — raw JSON only:
{"homeWinProbability":65,"awayWinProbability":35,"predictedWinner":"Team Name","confidenceScore":72,"reasoning":"Deep 3-4 sentence analysis mentioning specific player names, current form, matchup advantages, and clutch factors.","keyFactors":["Factor 1","Factor 2","Factor 3","Factor 4","Factor 5"]}

Rules:
- homeWinProbability + awayWinProbability must equal 100
- predictedWinner must be exactly "${homeTeam.name}" or "${awayTeam.name}"
- confidenceScore: higher when win% difference is larger (range 50-90)
- reasoning: MUST mention specific player names from both teams (e.g. Jalen Brunson, Victor Wembanyama), their recent form, key matchup advantages, and what will decide the game. 3-4 sentences minimum. Reference actual player roles, scoring averages, and clutch moments. Be specific and analytical — NOT generic.
- keyFactors: exactly 5 specific factors — ALWAYS include "turnover margin" and "home court energy", plus 3 others that NAME specific players or matchups (e.g. "Brunson's pick-and-roll creation", "Wembanyama's shot-blocking vs paint scoring", "three-point volume differential"). Basketball terms only.`
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

    const prompt = buildPrompt(homeTeam, awayTeam, sport, leagueName, homeWinPct, awayWinPct)

    console.log(`POST /api/ai/insights — league=${league} sport=${sport}`)

    let completion
    try {
      completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.5,
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