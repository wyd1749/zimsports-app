import { Header } from '@/components/header'
import { TeamRankingCard } from '@/components/team-rankings'
import { TrendingUp, Award, Shield, Swords, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getRankings } from '@/lib/data'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { fetchLeagueGames, getLeague, type LeagueId } from '@/lib/leagues'

interface RankingsPageProps {
  searchParams: Promise<{ league?: string }>
}

// ─── Build rankings from external game data ───────────────────────────────────
function buildExternalRankings(games: any[]) {
  const teamMap: Record<string, any> = {}

  games.forEach((g) => {
    const ids = [
      { id: g.home_team_id ?? g.home_team_short, name: g.home_team_short, isHome: true },
      { id: g.away_team_id ?? g.away_team_short, name: g.away_team_short, isHome: false },
    ]
    ids.forEach(({ id, name }) => {
      if (!teamMap[id]) {
        teamMap[id] = {
          id, name,
          wins: 0, losses: 0, draws: 0,
          points_for: 0, points_against: 0,
          form: [] as string[],
        }
      }
    })

    if (g.status === 'Final' && g.home_score != null && g.away_score != null) {
      const homeId = g.home_team_id ?? g.home_team_short
      const awayId = g.away_team_id ?? g.away_team_short
      const h = teamMap[homeId]
      const a = teamMap[awayId]
      if (h && a) {
        h.points_for += g.home_score
        h.points_against += g.away_score
        a.points_for += g.away_score
        a.points_against += g.home_score
        if (g.home_score > g.away_score) {
          h.wins++; h.form.push('W')
          a.losses++; a.form.push('L')
        } else if (g.away_score > g.home_score) {
          a.wins++; a.form.push('W')
          h.losses++; h.form.push('L')
        } else {
          h.draws++; h.form.push('D')
          a.draws++; a.form.push('D')
        }
      }
    }
  })

  return Object.values(teamMap).map((t: any) => {
    const total = t.wins + t.losses + t.draws
    const winPct = total > 0 ? t.wins / total : 0
    const attack_rating = total > 0 ? Math.min((t.points_for / total) / 1.2 * 100, 100) : 50
    const defense_rating = total > 0 ? Math.max(100 - (t.points_against / total) / 1.2 * 100, 0) : 50
    const form_rating = t.form.slice(-5).filter((r: string) => r === 'W').length * 20
    const power_ranking = (winPct * 40) + (attack_rating * 0.3) + (defense_rating * 0.3)
    let win_streak = 0
    for (let i = t.form.length - 1; i >= 0; i--) {
      if (t.form[i] === 'W') win_streak++; else break
    }
    return {
      team: { ...t, power_ranking, attack_rating, defense_rating, form_rating },
      stats: {
        matches_played: total,
        wins: t.wins,
        losses: t.losses,
        points_for: t.points_for,
        points_against: t.points_against,
        point_differential: t.points_for - t.points_against,
        current_form: t.form.slice(-5).join(''),
        win_streak,
      },
    }
  }).sort((a, b) => b.team.power_ranking - a.team.power_ranking)
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const params = await searchParams
  const leagueId = (params.league ?? 'MBA') as LeagueId
  const league = getLeague(leagueId)
  const isInternal = league.apiSource === 'internal'

  let rankings: any[] = []

  if (isInternal) {
    rankings = await getRankings()
  } else {
    const games = await fetchLeagueGames(leagueId)
    rankings = buildExternalRankings(games)
  }

  const topAttack  = [...rankings].sort((a, b) => b.team.attack_rating  - a.team.attack_rating)[0]
  const topDefense = [...rankings].sort((a, b) => b.team.defense_rating - a.team.defense_rating)[0]
  const topForm    = [...rankings].sort((a, b) => b.team.form_rating    - a.team.form_rating)[0]

  // Split MBA rankings by league (MWL = women's)
  const mensRankings   = isInternal ? rankings.filter(({ team }) => (team.league ?? team.division ?? '').toLowerCase() !== 'mwl') : rankings
  const womensRankings = isInternal ? rankings.filter(({ team }) => (team.league ?? team.division ?? '').toLowerCase() === 'mwl') : []

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            {league.name} Power Rankings
          </h1>
          <p className="text-sm text-muted-foreground">
            AI-calculated team ratings based on performance metrics
          </p>
        </div>

        {rankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Trophy className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">No rankings data available for {league.shortName}</p>
            <p className="text-sm text-muted-foreground mt-1">Rankings are built from completed match results</p>
          </div>
        ) : (
          <>
            {/* Top 3 stat cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Swords className="h-4 w-4 text-primary" />
                    Best Attack
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{topAttack?.team.name}</p>
                  <p className="text-2xl font-bold text-primary">
                    {topAttack?.team.attack_rating.toFixed(1)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-primary" />
                    Best Defense
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{topDefense?.team.name}</p>
                  <p className="text-2xl font-bold text-primary">
                    {topDefense?.team.defense_rating.toFixed(1)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Award className="h-4 w-4 text-primary" />
                    Best Form
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{topForm?.team.name}</p>
                  <p className="text-2xl font-bold text-primary">
                    {topForm?.team.form_rating.toFixed(1)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Rankings — split men's / women's for MBA, single list for external leagues */}
            {isInternal ? (
              <>
                {mensRankings.length > 0 && (
                  <section className="mb-8">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Men&apos;s Rankings</h2>
                      <Badge variant="outline">{mensRankings.length} teams</Badge>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {mensRankings.map(({ team, stats }, index) => (
                        <TeamRankingCard key={team.id ?? index} team={team} stats={stats} rank={index + 1} />
                      ))}
                    </div>
                  </section>
                )}
                {womensRankings.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Women&apos;s Rankings</h2>
                      <Badge variant="outline">{womensRankings.length} teams</Badge>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {womensRankings.map(({ team, stats }, index) => (
                        <TeamRankingCard key={team.id ?? index} team={team} stats={stats} rank={index + 1} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">All Teams</h2>
                  <Badge variant="outline">{rankings.length} teams</Badge>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {rankings.map(({ team, stats }, index) => (
                    <TeamRankingCard key={team.id ?? index} team={team} stats={stats} rank={index + 1} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
