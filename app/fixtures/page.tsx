import { Header } from '@/components/header'
import { FixtureList } from '@/components/fixture-card'
import { Calendar, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getUpcomingFixtures, getTeams } from '@/lib/data'
import { fetchLeagueGames, getLeague, type LeagueId, type ExternalGame } from '@/lib/leagues'
import type { Game } from '@/lib/data'

interface FixturesPageProps {
  searchParams: Promise<{ league?: string }>
}

export default async function FixturesPage({ searchParams }: FixturesPageProps) {
  const params = await searchParams
  const leagueId = (params.league ?? 'MBA') as LeagueId
  const league = getLeague(leagueId)
  const isInternal = league.apiSource === 'internal'

  // ── MBA: your original Supabase data ────────────────────────────────────────
  if (isInternal) {
    const [fixtures, teams] = await Promise.all([
      getUpcomingFixtures(),
      getTeams(),
    ])

    const teamMap = Object.fromEntries(
      teams.map((t) => [t.id, { name: t.name, abbreviation: t.abbreviation }])
    )

    const groupedFixtures = fixtures.reduce((acc, fixture) => {
      const week = fixture.matchweek || 0
      if (!acc[week]) acc[week] = []
      acc[week].push(fixture)
      return acc
    }, {} as Record<number, Game[]>)

    const matchweeks = Object.keys(groupedFixtures).map(Number).sort((a, b) => a - b)

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                Fixtures
              </h1>
              <p className="text-sm text-muted-foreground">
                Upcoming matches with AI predictions
              </p>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {fixtures.length} matches
            </Badge>
          </div>

          {matchweeks.length > 0 ? (
            <div className="space-y-8">
              {matchweeks.map((week) => (
                <section key={week}>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <Badge variant="secondary" className="text-xs">
                      {week === 0 ? 'Upcoming' : `Matchweek ${week}`}
                    </Badge>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <FixtureList
                    fixtures={groupedFixtures[week]}
                    showPredictions={true}
                    teamMap={teamMap}
                  />
                </section>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming fixtures</p>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── External leagues: EPL / UCL / AFCON / NBA ────────────────────────────────
  const allGames = await fetchLeagueGames(leagueId)
  const upcoming = allGames.filter((g) => g.status === 'Scheduled')
  const recent = allGames.filter((g) => g.status === 'Final' || g.status === 'Live')

  const grouped = upcoming.reduce((acc, game) => {
    const week = game.matchweek ?? 0
    if (!acc[week]) acc[week] = []
    acc[week].push(game)
    return acc
  }, {} as Record<number, ExternalGame[]>)

  const matchweeks = Object.keys(grouped).map(Number).sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span>{league.flag}</span>
              {league.name} Fixtures
            </h1>
            <p className="text-sm text-muted-foreground">
              {league.sport === 'basketball' ? 'NBA games schedule' : 'Upcoming & recent matches'}
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            {allGames.length} matches
          </Badge>
        </div>

        {allGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">No fixtures found for {league.shortName}</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon</p>
          </div>
        ) : (
          <div className="space-y-8">

            {upcoming.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <Badge variant="secondary" className="text-xs">Upcoming</Badge>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {league.sport === 'football' && matchweeks.length > 0 ? (
                  <div className="space-y-6">
                    {matchweeks.map((week) => (
                      <div key={week}>
                        {week > 0 && (
                          <p className="text-xs text-muted-foreground mb-3 font-medium">
                            Matchday {week}
                          </p>
                        )}
                        <ExternalFixtureGrid games={grouped[week]} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ExternalFixtureGrid games={upcoming} />
                )}
              </section>
            )}

            {recent.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <Badge variant="secondary" className="text-xs">Recent Results</Badge>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <ExternalFixtureGrid games={recent} />
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── External fixture grid ─────────────────────────────────────────────────────
function ExternalFixtureGrid({ games }: { games: ExternalGame[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <Card key={game.id} className="overflow-hidden transition-all hover:border-primary/50">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {new Date(game.date).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
              <Badge
                variant={game.status === 'Final' ? 'secondary' : 'outline'}
                className={
                  game.status === 'Live'
                    ? 'animate-pulse bg-destructive text-destructive-foreground text-[10px]'
                    : 'text-[10px]'
                }
              >
                {game.status === 'Live'
                  ? '● LIVE'
                  : game.status === 'Final'
                  ? 'FT'
                  : game.matchweek
                  ? `MW ${game.matchweek}`
                  : 'Upcoming'}
              </Badge>
            </div>

            <div className="p-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                  {game.home_team_short.slice(0, 3).toUpperCase()}
                </div>
                <p className="text-sm font-medium leading-tight">{game.home_team_short}</p>
              </div>

              <div className="text-center">
                {game.status === 'Final' || game.status === 'Live' ? (
                  <div className="flex items-center gap-2 text-2xl font-bold">
                    <span className={(game.home_score ?? 0) > (game.away_score ?? 0) ? 'text-primary' : ''}>
                      {game.home_score ?? 0}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span className={(game.away_score ?? 0) > (game.home_score ?? 0) ? 'text-primary' : ''}>
                      {game.away_score ?? 0}
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-medium text-muted-foreground">VS</span>
                )}
              </div>

              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-xs font-bold text-destructive">
                  {game.away_team_short.slice(0, 3).toUpperCase()}
                </div>
                <p className="text-sm font-medium leading-tight">{game.away_team_short}</p>
              </div>
            </div>

            {game.venue && (
              <div className="px-4 pb-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <span>📍 {game.venue}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
