'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Sparkles, Target, TrendingUp, Brain, Loader2, ChevronRight, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TeamData {
  id: string
  name: string
  abbreviation: string
  wins: string
  losses: string
}

interface GameData {
  id: number
  home_team_id: string
  away_team_id: string
  date: string
  venue: string
  status: string
}

interface AIPrediction {
  gameId: number
  homeTeam: TeamData
  awayTeam: TeamData
  date: string
  venue: string
  homeWinProbability: number
  awayWinProbability: number
  predictedWinner: string
  confidenceScore: number
  reasoning: string
  keyFactors: string[]
  loading: boolean
  error?: string
}

const LEAGUE_LABELS: Record<string, string> = {
  NBA: '🏀 NBA',
  MBA: '🏀 MBA',
  EPL: '⚽ EPL',
  UCL: '⚽ UCL',
  AFCON: '⚽ AFCON',
}

function PredictionsPage() {
  const searchParams = useSearchParams()
  const leagueId = (searchParams.get('league') ?? 'NBA').toUpperCase()

  const [predictions, setPredictions] = useState<AIPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAndPredict = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPredictions([])

    try {
      const res = await fetch(`/api/predictions/data?league=${leagueId}`)
      if (!res.ok) throw new Error('Failed to load games')

      const { games, teams } = await res.json()

      // Build team lookup
      const teamMap: Record<string, TeamData> = {}
      ;(teams ?? []).forEach((t: TeamData) => { teamMap[t.id] = t })

      // Set up placeholder predictions (loading state)
      const initial: AIPrediction[] = (games ?? []).map((g: GameData) => ({
        gameId: g.id,
        homeTeam: teamMap[g.home_team_id] || { id: g.home_team_id, name: 'Home Team', abbreviation: 'HM', wins: '0', losses: '0' },
        awayTeam: teamMap[g.away_team_id] || { id: g.away_team_id, name: 'Away Team', abbreviation: 'AW', wins: '0', losses: '0' },
        date: g.date,
        venue: g.venue,
        homeWinProbability: 50,
        awayWinProbability: 50,
        predictedWinner: '',
        confidenceScore: 0,
        reasoning: '',
        keyFactors: [],
        loading: true,
      }))

      setPredictions(initial)
      setLoading(false)

      // Generate AI predictions one by one
      for (let i = 0; i < initial.length; i++) {
        const game = initial[i]
        try {
          const aiRes = await fetch('/api/ai/insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              homeTeam: {
                name: game.homeTeam.name,
                wins: parseInt(game.homeTeam.wins) || 0,
                losses: parseInt(game.homeTeam.losses) || 0,
              },
              awayTeam: {
                name: game.awayTeam.name,
                wins: parseInt(game.awayTeam.wins) || 0,
                losses: parseInt(game.awayTeam.losses) || 0,
              },
              league: leagueId,
            }),
          })

          if (!aiRes.ok) throw new Error('Prediction failed')
          const result = await aiRes.json()

          setPredictions(prev =>
            prev.map((p, idx) =>
              idx === i
                ? {
                    ...p,
                    loading: false,
                    homeWinProbability: result.homeWinProbability ?? 50,
                    awayWinProbability: result.awayWinProbability ?? 50,
                    predictedWinner: result.predictedWinner ?? game.homeTeam.name,
                    confidenceScore: result.confidenceScore ?? 60,
                    reasoning: result.reasoning ?? '',
                    keyFactors: result.keyFactors ?? [],
                  }
                : p
            )
          )
        } catch {
          setPredictions(prev =>
            prev.map((p, idx) =>
              idx === i ? { ...p, loading: false, error: 'Prediction unavailable' } : p
            )
          )
        }
      }
    } catch (err) {
      setError('Failed to load fixtures. Please try again.')
      setLoading(false)
    }
  }, [leagueId])

  // Re-fetch whenever the league changes
  useEffect(() => {
    fetchAndPredict()
  }, [fetchAndPredict])

  const completed = predictions.filter(p => !p.loading && !p.error)
  const avgConfidence = completed.length > 0
    ? completed.reduce((s, p) => s + p.confidenceScore, 0) / completed.length
    : 0
  const highConf = completed.filter(p => p.confidenceScore >= 75)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Predictions
            </h1>
            <p className="text-sm text-muted-foreground">
              {LEAGUE_LABELS[leagueId] ?? leagueId} · Groq-powered match outcome predictions
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAndPredict} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Predictions</p>
                <p className="text-2xl font-bold">{predictions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{avgConfidence.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">High Confidence</p>
                <p className="text-2xl font-bold">{highConf.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-10 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* High confidence section */}
        {!loading && highConf.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary hover:bg-primary/30">High Confidence</Badge>
              <span className="text-sm text-muted-foreground">75%+ AI confidence</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highConf.map(p => <PredictionCard key={p.gameId} prediction={p} />)}
            </div>
          </section>
        )}

        {/* All predictions */}
        {!loading && predictions.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">All Predictions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {predictions.map(p => <PredictionCard key={p.gameId} prediction={p} />)}
            </div>
          </section>
        )}

        {/* Empty */}
        {!loading && predictions.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No upcoming fixtures found for {LEAGUE_LABELS[leagueId] ?? leagueId}</p>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Suspense Wrapper (required for useSearchParams) ──────────────────────────

export default function PredictionsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <PredictionsPage />
    </Suspense>
  )
}

// ─── Prediction Card ──────────────────────────────────────────────────────────

function PredictionCard({ prediction: p }: { prediction: AIPrediction }) {
  const [expanded, setExpanded] = useState(false)
  const homeIsWinner = p.predictedWinner === p.homeTeam.name

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-gradient-to-r from-primary/10 to-transparent pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Match Prediction
          </div>
          {!p.loading && !p.error && (
            <Badge variant="outline" className="text-[10px]">
              {p.confidenceScore.toFixed(0)}% confident
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {p.loading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">AI analysing match...</p>
          </div>
        ) : p.error ? (
          <p className="text-xs text-destructive text-center py-4">{p.error}</p>
        ) : (
          <>
            {/* Teams */}
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className={cn(
                  'mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                  homeIsWinner ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                )}>
                  {p.homeTeam.abbreviation?.slice(0, 3) || 'HM'}
                </div>
                <p className="text-xs font-medium truncate max-w-[80px] mx-auto">{p.homeTeam.name}</p>
              </div>

              <div className="px-3 text-center">
                <p className="text-xl font-bold text-muted-foreground">VS</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              <div className="text-center flex-1">
                <div className={cn(
                  'mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                  !homeIsWinner ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                )}>
                  {p.awayTeam.abbreviation?.slice(0, 3) || 'AW'}
                </div>
                <p className="text-xs font-medium truncate max-w-[80px] mx-auto">{p.awayTeam.name}</p>
              </div>
            </div>

            {/* Probability bar */}
            <div>
              <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
                <div
                  className="bg-primary transition-all duration-700"
                  style={{ width: `${p.homeWinProbability}%` }}
                />
                <div
                  className="bg-muted-foreground/40 transition-all duration-700"
                  style={{ width: `${p.awayWinProbability}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs">
                <span className={cn('font-medium', homeIsWinner ? 'text-primary' : 'text-muted-foreground')}>
                  {p.homeWinProbability.toFixed(1)}%
                </span>
                <span className={cn('font-medium', !homeIsWinner ? 'text-primary' : 'text-muted-foreground')}>
                  {p.awayWinProbability.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Confidence */}
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
              <span className="text-xs text-muted-foreground">AI Confidence</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <div
                      key={i}
                      className={cn(
                        'h-2 w-4 rounded-sm',
                        i <= Math.round(p.confidenceScore / 20)
                          ? 'bg-primary'
                          : 'bg-secondary'
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium">{p.confidenceScore.toFixed(0)}%</span>
              </div>
            </div>

            {/* Key factors */}
            {p.keyFactors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Key Factors</p>
                {p.keyFactors.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 rounded bg-secondary/50 px-2 py-1.5">
                    <span className="text-primary text-xs mt-0.5 font-bold">•</span>
                    <span className="text-xs text-foreground font-medium">{f}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Reasoning toggle */}
            {p.reasoning && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setExpanded(!expanded)}
                >
                  <Brain className="mr-2 h-3 w-3" />
                  {expanded ? 'Hide' : 'Show'} AI Reasoning
                  <ChevronRight className={cn('ml-auto h-3 w-3 transition-transform', expanded && 'rotate-90')} />
                </Button>
                {expanded && (
                  <div className="mt-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
                    <p className="text-xs text-foreground leading-relaxed">{p.reasoning}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
