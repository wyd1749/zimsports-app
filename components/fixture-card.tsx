import { format } from 'date-fns'
import { ConfidenceMeter } from '@/components/stats-display'
import { MapPin, Clock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Game } from '@/lib/data'

interface FixtureCardProps {
  fixture: Game
  showPrediction?: boolean
  className?: string
  teamMap?: Record<string, { name: string; abbreviation: string }>
}

export function FixtureCard({ fixture, showPrediction = true, className, teamMap = {} }: FixtureCardProps) {
  const prediction = fixture.predictions?.[0]
  const isCompleted = fixture.status === 'Final'
  const isLive = fixture.status === 'live'

  const homeTeam = teamMap[fixture.home_team_id] || { name: fixture.home_team_id || 'Home', abbreviation: 'HM' }
  const awayTeam = teamMap[fixture.away_team_id] || { name: fixture.away_team_id || 'Away', abbreviation: 'AW' }

  const homeWin = isCompleted || isLive ? fixture.home_score > fixture.away_score : false
  const awayWin = isCompleted || isLive ? fixture.away_score > fixture.home_score : false

  const formatDate = (dateStr: string, fmt: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return '—'
      return format(d, fmt)
    } catch {
      return '—'
    }
  }

  return (
    <div
      className={cn('rounded-xl overflow-hidden card-hover', className)}
      style={{
        background: 'oklch(0.13 0.03 240 / 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid oklch(0.60 0.15 220 / 0.18)',
      }}
    >
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ background: 'oklch(0.11 0.02 240 / 0.7)', borderBottom: '1px solid oklch(0.60 0.15 220 / 0.12)' }}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDate(fixture.date, 'MMM d, yyyy')}</span>
        </div>

        {isLive ? (
          <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'oklch(0.72 0.18 25)' }}>
            <span className="live-dot" /> LIVE
          </span>
        ) : isCompleted ? (
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
            style={{ background: 'oklch(0.80 0.20 195 / 0.15)', color: 'oklch(0.80 0.20 195)', border: '1px solid oklch(0.80 0.20 195 / 0.25)' }}>
            FT
          </span>
        ) : (
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
            style={{ background: 'oklch(0.70 0.22 220 / 0.1)', color: 'oklch(0.70 0.22 220 / 0.8)', border: '1px solid oklch(0.70 0.22 220 / 0.2)' }}>
            {fixture.matchweek ? `MW ${fixture.matchweek}` : 'Upcoming'}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Home */}
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-xs font-black"
              style={homeWin ? {
                background: 'linear-gradient(135deg, oklch(0.70 0.22 220), oklch(0.80 0.20 195))',
                color: '#fff',
                boxShadow: 'var(--glow-blue)',
              } : {
                background: 'oklch(0.18 0.03 240)',
                color: 'oklch(0.70 0.22 220)',
                border: '1px solid oklch(0.70 0.22 220 / 0.2)',
              }}>
              {homeTeam.abbreviation?.slice(0, 3).toUpperCase() || 'HM'}
            </div>
            <p className="text-xs font-semibold leading-tight">{homeTeam.name}</p>
          </div>

          {/* Score / VS */}
          <div className="text-center min-w-[56px]">
            {isCompleted || isLive ? (
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black" style={{ color: homeWin ? 'oklch(0.80 0.18 210)' : 'oklch(0.55 0.02 230)' }}>
                  {fixture.home_score}
                </span>
                <span className="text-sm font-light text-muted-foreground">–</span>
                <span className="text-2xl font-black" style={{ color: awayWin ? 'oklch(0.80 0.18 210)' : 'oklch(0.55 0.02 230)' }}>
                  {fixture.away_score}
                </span>
              </div>
            ) : (
              <span className="text-base font-bold text-muted-foreground tracking-widest">VS</span>
            )}
          </div>

          {/* Away */}
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-xs font-black"
              style={awayWin ? {
                background: 'linear-gradient(135deg, oklch(0.70 0.22 220), oklch(0.80 0.20 195))',
                color: '#fff',
                boxShadow: 'var(--glow-cyan)',
              } : {
                background: 'oklch(0.18 0.03 240)',
                color: 'oklch(0.80 0.20 195)',
                border: '1px solid oklch(0.80 0.20 195 / 0.2)',
              }}>
              {awayTeam.abbreviation?.slice(0, 3).toUpperCase() || 'AW'}
            </div>
            <p className="text-xs font-semibold leading-tight">{awayTeam.name}</p>
          </div>
        </div>

        {fixture.venue && (
          <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{fixture.venue}</span>
          </div>
        )}
      </div>

      {/* AI Prediction strip */}
      {showPrediction && prediction && !isCompleted && (
        <div className="px-4 pb-4 pt-0">
          <div className="rounded-lg p-3 flex items-center justify-between"
            style={{ background: 'oklch(0.70 0.22 220 / 0.07)', border: '1px solid oklch(0.70 0.22 220 / 0.15)' }}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" style={{ color: 'oklch(0.80 0.20 195)' }} />
              <span className="text-xs font-semibold" style={{ color: 'oklch(0.80 0.18 210)' }}>AI Prediction</span>
            </div>
            <ConfidenceMeter score={prediction.confidence_score} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Fixture List ──────────────────────────────────────────────────────────────
interface FixtureListProps {
  fixtures: Game[]
  showPredictions?: boolean
  emptyMessage?: string
  teamMap?: Record<string, { name: string; abbreviation: string }>
}

export function FixtureList({ fixtures, showPredictions = true, emptyMessage = 'No fixtures found', teamMap = {} }: FixtureListProps) {
  if (!fixtures || fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14"
        style={{ borderColor: 'oklch(0.60 0.15 220 / 0.2)' }}>
        <div className="text-4xl mb-3 opacity-30">🏀</div>
        <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fixtures.map((fixture) => (
        <FixtureCard
          key={fixture.id}
          fixture={fixture}
          showPrediction={showPredictions}
          teamMap={teamMap}
        />
      ))}
    </div>
  )
}
