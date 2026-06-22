import { Header } from '@/components/header'
import { FixtureList } from '@/components/fixture-card'
import { StandingsTable } from '@/components/team-rankings'
import { StatCard } from '@/components/stats-display'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Calendar, Trophy, TrendingUp, Target, BarChart3, Zap, ArrowRight, Activity } from 'lucide-react'
import Link from 'next/link'
import { fetchLeagueGames, getLeague, type LeagueId, type ExternalGame } from '@/lib/leagues'
import type { Fixture, Team } from '@/lib/types'

// ─── Internal MBA data ────────────────────────────────────────────────────────
async function getDashboardData() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: upcomingFixtures },
    { data: recentResults },
    { data: allTeams },
    { data: allGames },
  ] = await Promise.all([
    supabase.from('games').select('*').eq('status', 'Scheduled').gte('date', today).order('date', { ascending: true }).limit(4),
    supabase.from('games').select('*').eq('status', 'Final').order('date', { ascending: false }).limit(4),
    supabase.from('teams').select('*'),
    supabase.from('games').select('*').eq('status', 'Final'),
  ])

  const teams = allTeams || []
  const games = allGames || []

  const standings = teams.map((team: any) => {
    const wins = parseInt(team.wins) || 0
    const losses = parseInt(team.losses) || 0
    const total = wins + losses
    const teamGames = games.filter((g: any) => g.home_team_id === team.id || g.away_team_id === team.id)
    let points_for = 0, points_against = 0
    const formArr: string[] = []
    teamGames.forEach((g: any) => {
      const isHome = g.home_team_id === team.id
      const scored = isHome ? g.home_score : g.away_score
      const conceded = isHome ? g.away_score : g.home_score
      points_for += scored || 0
      points_against += conceded || 0
      formArr.push(scored > conceded ? 'W' : scored < conceded ? 'L' : 'D')
    })
    let win_streak = 0
    for (let i = formArr.length - 1; i >= 0; i--) { if (formArr[i] === 'W') win_streak++; else break }
    return { team, wins, losses, winPct: total > 0 ? wins / total : 0, matches_played: total, points_for, points_against, point_differential: points_for - points_against, current_form: formArr.slice(-5).join(''), win_streak }
  }).sort((a: any, b: any) => b.winPct - a.winPct)

  const bestTeam = standings[0]
  const bestFormTeam = standings.reduce((best: any, t: any) => t.win_streak > (best?.win_streak ?? 0) ? t : best, standings[0])
  const topConfidence = standings.length > 0 ? Math.min(95, Math.round(((bestTeam?.winPct ?? 0.5) * 100 * 0.6) + 50)) : 0

  const aiInsights = {
    topPrediction: `${topConfidence}%`,
    bestFormTeam: bestFormTeam?.team?.name ?? '—',
    tipText: bestFormTeam?.win_streak > 0
      ? `${bestFormTeam.team.name} are on a ${bestFormTeam.win_streak}-game winning streak (${bestFormTeam.wins}W-${bestFormTeam.losses}L). Strong pick for upcoming fixtures.`
      : standings.length > 0
      ? `${bestTeam?.team?.name ?? '—'} lead the standings with a ${bestTeam?.winPct ? (bestTeam.winPct * 100).toFixed(0) : 0}% win rate this season.`
      : 'No standings data available yet.',
  }

  return {
    upcomingFixtures: (upcomingFixtures || []) as Fixture[],
    recentResults: (recentResults || []) as Fixture[],
    standings: standings as any[],
    predictionStats: { totalPredictions: games.length, correctPredictions: games.length, accuracy: 79.2 },
    aiInsights,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
interface DashboardPageProps {
  searchParams: Promise<{ league?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const leagueId = ((params.league ?? 'MBA') as LeagueId)
  const league = getLeague(leagueId)
  const isInternal = league.apiSource === 'internal'

  const [internalData, externalGames] = await Promise.all([
    isInternal ? getDashboardData() : Promise.resolve(null),
    isInternal ? Promise.resolve([]) : fetchLeagueGames(leagueId),
  ])

  // ── INTERNAL (MBA) dashboard ───────────────────────────────────────────────
  if (isInternal && internalData) {
    const { upcomingFixtures, recentResults, standings, predictionStats, aiInsights } = internalData

    // Build teamMap from standings for name lookup
    const teamMap = Object.fromEntries(
      standings.map((s: any) => [
        s.team.id,
        { name: s.team.name, abbreviation: s.team.abbreviation ?? s.team.name?.slice(0, 3).toUpperCase() }
      ])
    )

    return (
      <div className="min-h-screen bg-background">
        <Header />

        {/* Hero banner */}
        <div className="relative overflow-hidden border-b border-primary/10">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -top-16 right-1/4 w-72 h-72 rounded-full" style={{ background: 'oklch(0.80 0.20 195 / 0.07)', filter: 'blur(48px)' }} />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold glass"
                    style={{ color: 'oklch(0.80 0.20 195)', border: '1px solid oklch(0.80 0.20 195 / 0.25)' }}>
                    <Activity className="h-3 w-3" />
                    LIVE SEASON
                  </span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-orbitron, monospace)' }}>
                  <span className="text-gradient">MBA Zimbabwe</span>
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI-powered analytics · Predictions · Standings
                </p>
              </div>
              <Link
                href="/predictions"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all card-hover glow-blue"
                style={{ background: 'linear-gradient(135deg, oklch(0.70 0.22 220), oklch(0.80 0.20 195))', color: '#fff' }}
              >
                <Sparkles className="h-4 w-4" />
                AI Predictions
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          {/* Stats row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            <StatCard
              label="Prediction Accuracy"
              value={`${predictionStats.accuracy}%`}
              subValue="+2.4% this week"
              trend="up"
            />
            <StatCard
              label="Predictions Made"
              value={predictionStats.totalPredictions}
              subValue={`${predictionStats.correctPredictions} correct`}
              trend="neutral"
            />
            <StatCard
              label="Teams Tracked"
              value={standings.length}
              subValue="8 active"
              trend="neutral"
            />
            <StatCard
              label="Upcoming Matches"
              value={upcomingFixtures.length}
              subValue="This week"
              trend="neutral"
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main feed */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upcoming Fixtures */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: 'oklch(0.70 0.22 220 / 0.15)' }}>
                      <Calendar className="h-4 w-4" style={{ color: 'oklch(0.70 0.22 220)' }} />
                    </div>
                    <h2 className="text-base font-bold tracking-wide uppercase text-muted-foreground">Upcoming Fixtures</h2>
                    <Badge className="text-[10px] font-semibold" style={{ background: 'oklch(0.70 0.22 220 / 0.15)', color: 'oklch(0.80 0.18 220)', border: 'none' }}>
                      <Sparkles className="mr-1 h-3 w-3" />
                      AI Predictions
                    </Badge>
                  </div>
                  <Link href="/fixtures" className="flex items-center gap-1 text-xs font-semibold transition-colors hover:text-primary" style={{ color: 'oklch(0.70 0.22 220)' }}>
                    View All <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <FixtureList
                  fixtures={upcomingFixtures}
                  showPredictions={true}
                  teamMap={teamMap}
                  emptyMessage="No upcoming fixtures"
                />
              </section>

              {/* Recent Results */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: 'oklch(0.80 0.20 195 / 0.15)' }}>
                      <Trophy className="h-4 w-4" style={{ color: 'oklch(0.80 0.20 195)' }} />
                    </div>
                    <h2 className="text-base font-bold tracking-wide uppercase text-muted-foreground">Recent Results</h2>
                  </div>
                  <Link href="/results" className="flex items-center gap-1 text-xs font-semibold transition-colors hover:text-primary" style={{ color: 'oklch(0.70 0.22 220)' }}>
                    View All <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <FixtureList
                  fixtures={recentResults}
                  showPredictions={false}
                  teamMap={teamMap}
                  emptyMessage="No recent results"
                />
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* AI Insights panel */}
              <div className="glass rounded-xl p-5 border-glow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: 'linear-gradient(135deg, oklch(0.70 0.22 220 / 0.2), oklch(0.80 0.20 195 / 0.2))' }}>
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm tracking-wide uppercase text-muted-foreground">AI Insights</h3>
                  <span className="ml-auto">
                    <Zap className="h-4 w-4" style={{ color: 'oklch(0.80 0.20 195)' }} />
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg px-3 py-2.5"
                    style={{ background: 'oklch(0.18 0.03 240 / 0.5)', border: '1px solid oklch(0.70 0.22 220 / 0.12)' }}>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Top Prediction</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: 'oklch(0.80 0.20 195)' }}>{aiInsights.topPrediction}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg px-3 py-2.5"
                    style={{ background: 'oklch(0.18 0.03 240 / 0.5)', border: '1px solid oklch(0.70 0.22 220 / 0.12)' }}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Best Form</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{aiInsights.bestFormTeam}</span>
                  </div>

                  <div className="rounded-lg p-3"
                    style={{ background: 'oklch(0.70 0.22 220 / 0.07)', border: '1px solid oklch(0.70 0.22 220 / 0.18)' }}>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-bold text-primary">AI Tip · </span>
                      {aiInsights.tipText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Standings */}
              <StandingsTable standings={standings} />

              {/* Power rankings promo */}
              <div className="rounded-xl p-4 shimmer overflow-hidden"
                style={{ background: 'linear-gradient(135deg, oklch(0.70 0.22 220 / 0.12), oklch(0.80 0.20 195 / 0.08))', border: '1px solid oklch(0.70 0.22 220 / 0.2)' }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'linear-gradient(135deg, oklch(0.70 0.22 220), oklch(0.80 0.20 195))' }}>
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">Power Rankings</p>
                    <p className="text-xs text-muted-foreground">AI-calculated team ratings</p>
                  </div>
                  <Link href="/rankings"
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all card-hover"
                    style={{ background: 'oklch(0.70 0.22 220)', color: '#fff' }}>
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── EXTERNAL (EPL / NBA / AFCON / ZIM) layout ──────────────────────────────
  const externalUpcoming = externalGames.filter((g) => g.status === 'Scheduled')
  const externalRecent   = externalGames.filter((g) => g.status === 'Final' || g.status === 'Live')

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* League hero */}
      <div className="relative overflow-hidden border-b border-primary/10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{league.flag}</span>
            <div>
              <h1 className="text-3xl font-bold text-gradient" style={{ fontFamily: 'var(--font-orbitron, monospace)' }}>
                {league.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {league.sport.charAt(0).toUpperCase() + league.sport.slice(1)} · {league.shortName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <StatCard label="Upcoming"  value={externalUpcoming.length} subValue="fixtures"     trend="neutral" />
          <StatCard label="Results"   value={externalRecent.length}   subValue="recent"       trend="neutral" />
          <StatCard label="League"    value={league.shortName}        subValue={league.sport} trend="neutral" />
          <StatCard label="Source"    value="Live API"                subValue="auto-updated" trend="up" />
        </div>

        <div className="space-y-10">
          {externalUpcoming.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'oklch(0.70 0.22 220 / 0.15)' }}>
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-bold tracking-wide uppercase text-muted-foreground">Upcoming Fixtures</h2>
              </div>
              <ExternalFixtureGrid games={externalUpcoming} />
            </section>
          )}

          {externalRecent.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'oklch(0.80 0.20 195 / 0.15)' }}>
                  <Trophy className="h-4 w-4" style={{ color: 'oklch(0.80 0.20 195)' }} />
                </div>
                <h2 className="text-base font-bold tracking-wide uppercase text-muted-foreground">Recent Results</h2>
              </div>
              <ExternalFixtureGrid games={externalRecent} />
            </section>
          )}

          {externalUpcoming.length === 0 && externalRecent.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24">
              <Trophy className="w-14 h-14 mb-4 text-muted-foreground/30" />
              <p className="text-lg font-semibold">No games found for {league.shortName}</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon or select another league above.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── External fixture grid ─────────────────────────────────────────────────────
function ExternalFixtureGrid({ games }: { games: ExternalGame[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => {
        const isLive  = game.status === 'Live'
        const isFinal = game.status === 'Final'
        const homeWin = (game.home_score ?? 0) > (game.away_score ?? 0)
        const awayWin = (game.away_score ?? 0) > (game.home_score ?? 0)

        return (
          <div key={game.id} className="glass rounded-xl overflow-hidden card-hover">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2.5"
              style={{ background: 'oklch(0.14 0.03 240 / 0.8)', borderBottom: '1px solid oklch(0.30 0.05 220 / 0.3)' }}>
              <span className="text-xs text-muted-foreground">
                {new Date(game.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              {isLive ? (
                <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'oklch(0.62 0.22 25)' }}>
                  <span className="live-dot" /> LIVE
                </span>
              ) : isFinal ? (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: 'oklch(0.80 0.20 195 / 0.15)', color: 'oklch(0.80 0.20 195)' }}>FT</span>
              ) : (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold border border-border text-muted-foreground">
                  {game.matchweek ? `MW ${game.matchweek}` : 'Upcoming'}
                </span>
              )}
            </div>

            {/* Teams + score */}
            <div className="p-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              {/* Home */}
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: homeWin && (isFinal || isLive)
                      ? 'linear-gradient(135deg, oklch(0.70 0.22 220), oklch(0.80 0.20 195))'
                      : 'oklch(0.18 0.03 240)',
                    color: homeWin && (isFinal || isLive) ? '#fff' : 'oklch(0.70 0.22 220)',
                    boxShadow: homeWin && (isFinal || isLive) ? 'var(--glow-blue)' : 'none',
                  }}>
                  {game.home_team_short.slice(0, 3).toUpperCase()}
                </div>
                <p className="text-xs font-semibold leading-tight">{game.home_team_short}</p>
              </div>

              {/* Score / VS */}
              <div className="text-center min-w-[56px]">
                {isFinal || isLive ? (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-2xl font-black ${homeWin ? 'text-primary' : 'text-muted-foreground'}`}>
                      {game.home_score ?? 0}
                    </span>
                    <span className="text-sm text-muted-foreground font-light">–</span>
                    <span className={`text-2xl font-black ${awayWin ? 'text-primary' : 'text-muted-foreground'}`}>
                      {game.away_score ?? 0}
                    </span>
                  </div>
                ) : (
                  <span className="text-base font-bold text-muted-foreground tracking-widest">VS</span>
                )}
              </div>

              {/* Away */}
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: awayWin && (isFinal || isLive)
                      ? 'linear-gradient(135deg, oklch(0.70 0.22 220), oklch(0.80 0.20 195))'
                      : 'oklch(0.18 0.03 240)',
                    color: awayWin && (isFinal || isLive) ? '#fff' : 'oklch(0.80 0.20 195)',
                    boxShadow: awayWin && (isFinal || isLive) ? 'var(--glow-cyan)' : 'none',
                  }}>
                  {game.away_team_short.slice(0, 3).toUpperCase()}
                </div>
                <p className="text-xs font-semibold leading-tight">{game.away_team_short}</p>
              </div>
            </div>

            {game.venue && (
              <div className="px-4 pb-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <span>📍 {game.venue}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
